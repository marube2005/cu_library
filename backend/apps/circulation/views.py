from datetime import timedelta
from decimal import Decimal
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Loan, Reservation
from .serializers import (
    LoanSerializer, ReservationSerializer, IssueBookSerializer, ReturnBookSerializer
)
from apps.catalogue.models import Copy, Title
from apps.fines.models import Fine
from apps.reports_audit.models import SystemSetting, AuditLog

User = get_user_model()


class IssueBookView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not request.user.is_library_staff:
            return Response({'detail': 'Only staff can issue books.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = IssueBookSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ident = serializer.validated_data['member_identifier'].strip()
        copy_code = serializer.validated_data['copy_code'].strip()

        # 1. Find Member
        member = User.objects.filter(email__iexact=ident).first() or \
                 User.objects.filter(reg_no__iexact=ident).first()
        if not member:
            return Response({'detail': f"No member found with identifier '{ident}'."}, status=status.HTTP_404_NOT_FOUND)

        if member.status != User.Status.APPROVED:
            return Response({'detail': f"Member status is '{member.get_status_display()}'. Account must be approved."}, status=status.HTTP_400_BAD_REQUEST)

        # 2. Check limits & blocks (A6)
        max_books = int(SystemSetting.get_setting('MAX_BOOKS_PER_MEMBER', 2))
        active_loans_count = Loan.objects.filter(
            member=member,
            status__in=[Loan.Status.ISSUED, Loan.Status.OVERDUE]
        ).count()
        if active_loans_count >= max_books:
            return Response({'detail': f"Member has reached borrowing limit of {max_books} books."}, status=status.HTTP_400_BAD_REQUEST)

        fine_threshold = Decimal(SystemSetting.get_setting('BORROWING_BLOCK_FINE_THRESHOLD', '50.00'))
        unpaid_fines = Fine.objects.filter(member=member, status=Fine.Status.UNPAID)
        total_fines_owed = sum(f.balance_remaining for f in unpaid_fines)
        if total_fines_owed > fine_threshold:
            return Response({'detail': f"Member has unpaid fines of Ksh {total_fines_owed:.2f}, exceeding Ksh {fine_threshold:.2f} threshold."}, status=status.HTTP_400_BAD_REQUEST)

        # Check overdue loans
        has_overdue = Loan.objects.filter(
            member=member,
            status=Loan.Status.OVERDUE
        ).exists() or Loan.objects.filter(
            member=member,
            status=Loan.Status.ISSUED,
            due_date__lt=timezone.now().date()
        ).exists()
        if has_overdue:
            return Response({'detail': f"Member {member.full_name} has an overdue book that must be returned first."}, status=status.HTTP_400_BAD_REQUEST)

        # 3. Find Copy
        copy = Copy.objects.filter(copy_code__iexact=copy_code).first()
        if not copy:
            return Response({'detail': f"Copy with code '{copy_code}' not found."}, status=status.HTTP_404_NOT_FOUND)

        if copy.status not in [Copy.Status.AVAILABLE, Copy.Status.RESERVED]:
            return Response({'detail': f"Copy is currently {copy.get_status_display()} and cannot be issued."}, status=status.HTTP_400_BAD_REQUEST)

        # Check hold conflict if reserved for another member
        if copy.status == Copy.Status.RESERVED:
            active_res = Reservation.objects.filter(
                title=copy.title,
                status=Reservation.Status.READY_FOR_PICKUP
            ).first()
            if active_res and active_res.member != member:
                override = serializer.validated_data.get('override_reservation', False)
                if not override:
                    hold_expiry_str = active_res.hold_expires_at.strftime('%a, %d-%b') if active_res.hold_expires_at else 'Friday'
                    return Response({
                        'detail': f"Held for {active_res.member.full_name} until {hold_expiry_str}.",
                        'held_for': active_res.member.full_name,
                        'hold_expires_at': active_res.hold_expires_at,
                        'requires_override': True
                    }, status=status.HTTP_409_CONFLICT)

        # 4. Issue the loan
        loan_days = int(SystemSetting.get_setting('LOAN_PERIOD_DAYS', 14))
        due_date = timezone.now().date() + timedelta(days=loan_days)

        loan = Loan.objects.create(
            copy=copy,
            member=member,
            issued_by=request.user,
            issue_date=timezone.now().date(),
            due_date=due_date,
            status=Loan.Status.ISSUED
        )

        copy.status = Copy.Status.BORROWED
        copy.save()

        # If reservation existed for this member, mark fulfilled
        Reservation.objects.filter(
            title=copy.title,
            member=member,
            status=Reservation.Status.READY_FOR_PICKUP
        ).update(status=Reservation.Status.FULFILLED)

        # Audit log
        AuditLog.objects.create(
            user=request.user,
            action='ISSUE_BOOK',
            module='circulation',
            details={'loan_id': str(loan.id), 'copy_code': copy.copy_code, 'member': member.full_name}
        )

        return Response(LoanSerializer(loan).data, status=status.HTTP_201_CREATED)


class ReturnBookView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not request.user.is_library_staff:
            return Response({'detail': 'Only staff can record returns.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = ReturnBookSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        copy_code = serializer.validated_data['copy_code'].strip()
        new_condition = serializer.validated_data.get('condition')

        copy = Copy.objects.filter(copy_code__iexact=copy_code).first()
        if not copy:
            return Response({'detail': f"Copy '{copy_code}' not found."}, status=status.HTTP_404_NOT_FOUND)

        loan = Loan.objects.filter(
            copy=copy,
            status__in=[Loan.Status.ISSUED, Loan.Status.OVERDUE]
        ).first()

        if not loan:
            return Response({'detail': f"No active loan found for copy '{copy_code}'."}, status=status.HTTP_400_BAD_REQUEST)

        today = timezone.now().date()
        loan.return_date = today
        loan.status = Loan.Status.RETURNED
        loan.save()

        # Update condition if reported
        if new_condition and new_condition in [c[0] for c in Copy.Condition.choices]:
            copy.condition = new_condition

        # Calculate Fine (A6)
        grace_days = int(SystemSetting.get_setting('GRACE_PERIOD_DAYS', 2))
        fine_rate = Decimal(SystemSetting.get_setting('DAILY_FINE_RATE_KSH', '5.00'))
        fine_record = None

        if today > loan.due_date:
            days_late = (today - loan.due_date).days
            chargeable_days = max(0, days_late - grace_days)
            if chargeable_days > 0:
                accrued = min(chargeable_days * fine_rate, copy.replacement_cost)
                fine_record = Fine.objects.create(
                    loan=loan,
                    member=loan.member,
                    amount=accrued,
                    status=Fine.Status.UNPAID
                )

        # Check Reservations for next member in line
        next_reservation = Reservation.objects.filter(
            title=copy.title,
            status=Reservation.Status.QUEUED
        ).order_by('queue_position', 'created_at').first()

        hold_days = int(SystemSetting.get_setting('RESERVATION_HOLD_DAYS', 3))
        if next_reservation:
            copy.status = Copy.Status.RESERVED
            copy.save()
            next_reservation.status = Reservation.Status.READY_FOR_PICKUP
            next_reservation.hold_expires_at = timezone.now() + timedelta(days=hold_days)
            next_reservation.save()
        else:
            copy.status = Copy.Status.AVAILABLE
            copy.save()

        AuditLog.objects.create(
            user=request.user,
            action='RETURN_BOOK',
            module='circulation',
            details={'loan_id': str(loan.id), 'copy_code': copy.copy_code, 'fine': str(fine_record.amount) if fine_record else '0.00'}
        )

        return Response({
            'message': 'Book return recorded successfully.',
            'loan': LoanSerializer(loan).data,
            'fine_accrued': fine_record.amount if fine_record else Decimal('0.00'),
            'held_for_reservation': bool(next_reservation)
        })


class RenewLoanView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            loan = Loan.objects.get(pk=pk)
        except Loan.DoesNotExist:
            return Response({'detail': 'Loan not found'}, status=status.HTTP_404_NOT_FOUND)

        # Allow member themselves or staff
        if not (request.user == loan.member or request.user.is_library_staff):
            return Response({'detail': 'Not authorized to renew this loan.'}, status=status.HTTP_403_FORBIDDEN)

        max_renewals = int(SystemSetting.get_setting('MAX_RENEWALS', 1))
        if loan.renewals_count >= max_renewals:
            return Response({'detail': f'Maximum renewals limit of {max_renewals} reached.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check if anyone is waiting
        has_waiting = Reservation.objects.filter(title=loan.copy.title, status=Reservation.Status.QUEUED).exists()
        if has_waiting:
            return Response({'detail': 'Cannot renew: another member has reserved this title.'}, status=status.HTTP_400_BAD_REQUEST)

        renewal_days = int(SystemSetting.get_setting('RENEWAL_DAYS', 7))
        loan.due_date = loan.due_date + timedelta(days=renewal_days)
        loan.renewals_count += 1
        if loan.status == Loan.Status.OVERDUE and loan.due_date >= timezone.now().date():
            loan.status = Loan.Status.ISSUED
        loan.save()

        return Response(LoanSerializer(loan).data)


class LoanListView(generics.ListAPIView):
    serializer_class = LoanSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if not self.request.user.is_library_staff:
            return Loan.objects.filter(member=self.request.user)

        queryset = Loan.objects.all().order_by('-due_date')
        status_filter = self.request.query_params.get('status')
        overdue_only = self.request.query_params.get('overdue_only')

        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if overdue_only and overdue_only.lower() in ['true', '1']:
            queryset = queryset.filter(
                status__in=[Loan.Status.ISSUED, Loan.Status.OVERDUE],
                due_date__lt=timezone.now().date()
            )

        return queryset


class MyLoansView(generics.ListAPIView):
    serializer_class = LoanSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Loan.objects.filter(member=self.request.user).order_by('-due_date')


class ReservationListCreateView(generics.ListCreateAPIView):
    serializer_class = ReservationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_library_staff:
            return Reservation.objects.all().order_by('created_at')
        return Reservation.objects.filter(member=self.request.user).order_by('created_at')

    def perform_create(self, serializer):
        title_id = self.request.data.get('title')
        title = Title.objects.get(pk=title_id)
        queue_count = Reservation.objects.filter(title=title, status=Reservation.Status.QUEUED).count()
        serializer.save(
            member=self.request.user,
            title=title,
            queue_position=queue_count + 1
        )


class RequestOrReserveView(APIView):
    """
    Online Member Request (Hold for 3 days) or Reserve (Queue):
    - If free copy available on shelf: Holds copy for 3 days (READY_FOR_PICKUP).
    - If all copies out: Places member in Queue (QUEUED).
    Validates:
      1. Account must be APPROVED
      2. Active loans + holds < MAX_BOOKS_PER_MEMBER (2)
      3. Unpaid fines <= BORROWING_BLOCK_FINE_THRESHOLD (50)
      4. No overdue loans
      5. Not already borrowed or held by this member
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        member = request.user
        title_id = request.data.get('title')
        if not title_id:
            return Response({'detail': 'Book title ID is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            title = Title.objects.get(pk=title_id)
        except Title.DoesNotExist:
            return Response({'detail': 'Book title not found.'}, status=status.HTTP_404_NOT_FOUND)

        # 1. Account status check
        if member.status != User.Status.APPROVED:
            return Response({'detail': f"Your account status is '{member.get_status_display()}'. Only approved members can request books."}, status=status.HTTP_400_BAD_REQUEST)

        # 2. Check overdue books
        has_overdue = Loan.objects.filter(
            member=member,
            status=Loan.Status.OVERDUE
        ).exists() or Loan.objects.filter(
            member=member,
            status=Loan.Status.ISSUED,
            due_date__lt=timezone.now().date()
        ).exists()
        if has_overdue:
            return Response({'detail': 'You have an overdue book that must be returned before requesting more.'}, status=status.HTTP_400_BAD_REQUEST)

        # 3. Check borrowing limit (active loans + active holds)
        max_books = int(SystemSetting.get_setting('MAX_BOOKS_PER_MEMBER', 2))
        active_count = Loan.objects.filter(
            member=member,
            status__in=[Loan.Status.ISSUED, Loan.Status.OVERDUE, Loan.Status.REQUESTED]
        ).count() + Reservation.objects.filter(
            member=member,
            status=Reservation.Status.READY_FOR_PICKUP
        ).count()

        if active_count >= max_books:
            return Response({'detail': f"You have reached your limit of {max_books} books borrowed/held."}, status=status.HTTP_400_BAD_REQUEST)

        # 4. Check unpaid fines
        fine_threshold = Decimal(SystemSetting.get_setting('BORROWING_BLOCK_FINE_THRESHOLD', '50.00'))
        unpaid_fines = Fine.objects.filter(member=member, status=Fine.Status.UNPAID)
        total_fines = sum(f.balance_remaining for f in unpaid_fines)
        if total_fines > fine_threshold:
            return Response({'detail': f"You have unpaid fines of Ksh {total_fines:.2f}, exceeding the Ksh {fine_threshold:.2f} threshold."}, status=status.HTTP_400_BAD_REQUEST)

        # 5. Check duplicate request
        already_has = Loan.objects.filter(
            copy__title=title,
            member=member,
            status__in=[Loan.Status.ISSUED, Loan.Status.OVERDUE, Loan.Status.REQUESTED]
        ).exists() or Reservation.objects.filter(
            title=title,
            member=member,
            status__in=[Reservation.Status.READY_FOR_PICKUP, Reservation.Status.QUEUED]
        ).exists()
        if already_has:
            return Response({'detail': 'You already have an active loan or reservation for this book.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check if any free copy on shelf
        available_copy = title.copies.filter(status=Copy.Status.AVAILABLE).first()
        hold_days = int(SystemSetting.get_setting('RESERVATION_HOLD_DAYS', 3))

        if available_copy:
            available_copy.status = Copy.Status.RESERVED
            available_copy.save()

            hold_expires = timezone.now() + timedelta(days=hold_days)
            reservation = Reservation.objects.create(
                title=title,
                member=member,
                status=Reservation.Status.READY_FOR_PICKUP,
                queue_position=0,
                hold_expires_at=hold_expires
            )
            return Response({
                'type': 'HOLD',
                'message': f"Hold confirmed for '{title.title}'! Copy {available_copy.copy_code} is reserved for you. Please collect it at the library desk within {hold_days} days (by {hold_expires.strftime('%A, %d-%b')}).",
                'reservation': ReservationSerializer(reservation).data
            }, status=status.HTTP_201_CREATED)
        else:
            queue_count = Reservation.objects.filter(title=title, status=Reservation.Status.QUEUED).count()
            reservation = Reservation.objects.create(
                title=title,
                member=member,
                status=Reservation.Status.QUEUED,
                queue_position=queue_count + 1
            )
            return Response({
                'type': 'QUEUE',
                'message': f"All copies are currently borrowed. You have joined the reservation queue at position #{reservation.queue_position}.",
                'reservation': ReservationSerializer(reservation).data
            }, status=status.HTTP_201_CREATED)


class RunMaintenanceView(APIView):
    """
    Manually triggers the Night Watchman maintenance check.
    Accessible only by library staff.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not request.user.is_library_staff:
            return Response({'detail': 'Only library staff can run maintenance.'}, status=status.HTTP_403_FORBIDDEN)

        from .maintenance import run_nightly_watchman
        results = run_nightly_watchman(executed_by=request.user)
        return Response({
            'message': 'Night Watchman shelf & loan inspection completed successfully.',
            'results': results
        })
