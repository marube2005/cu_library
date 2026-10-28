from datetime import timedelta
from decimal import Decimal
from django.utils import timezone
from django.db.models import Sum, Q
from django.contrib.auth import get_user_model
from rest_framework import generics, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import SystemSetting, AuditLog
from .serializers import SystemSettingSerializer, AuditLogSerializer
from apps.circulation.models import Loan
from apps.fines.models import Fine
from apps.catalogue.models import Title, Copy, BookRequest

User = get_user_model()


class DashboardStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not request.user.is_library_staff:
            return Response({'detail': 'Staff only view.'}, status=403)

        today = timezone.now().date()
        week_ahead = today + timedelta(days=7)

        books_out_today = Loan.objects.filter(issue_date=today).count()
        active_loans = Loan.objects.filter(status__in=[Loan.Status.ISSUED, Loan.Status.OVERDUE]).count()
        due_this_week = Loan.objects.filter(
            status=Loan.Status.ISSUED,
            due_date__gte=today,
            due_date__lte=week_ahead
        ).count()
        overdue_count = Loan.objects.filter(
            Q(status=Loan.Status.OVERDUE) |
            Q(status=Loan.Status.ISSUED, due_date__lt=today)
        ).count()

        unpaid_fines = Fine.objects.filter(status__in=[Fine.Status.UNPAID, Fine.Status.PARTIAL])
        total_fines_owed = sum(f.balance_remaining for f in unpaid_fines)

        pending_registrations = User.objects.filter(status=User.Status.PENDING).count()
        pending_suggestions = BookRequest.objects.filter(status=BookRequest.Status.PENDING).count()

        missing_covers = Title.objects.filter(
            Q(cover_image='') | Q(cover_image__isnull=True),
            Q(cover_url='') | Q(cover_url__isnull=True)
        ).count()

        total_titles = Title.objects.filter(is_hidden=False).count()
        total_copies = Copy.objects.exclude(status=Copy.Status.WITHDRAWN).count()

        return Response({
            'books_out_today': books_out_today,
            'active_loans': active_loans,
            'due_this_week': due_this_week,
            'overdue_count': overdue_count,
            'total_fines_owed': float(total_fines_owed),
            'pending_registrations': pending_registrations,
            'pending_suggestions': pending_suggestions,
            'missing_covers': missing_covers,
            'total_titles': total_titles,
            'total_copies': total_copies
        })


class SystemSettingListView(generics.ListCreateAPIView):
    queryset = SystemSetting.objects.all().order_by('key')
    serializer_class = SystemSettingSerializer
    permission_classes = [permissions.IsAuthenticated]


class SystemSettingDetailView(generics.RetrieveUpdateAPIView):
    queryset = SystemSetting.objects.all()
    serializer_class = SystemSettingSerializer
    permission_classes = [permissions.IsAuthenticated]


class AuditLogListView(generics.ListAPIView):
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if not self.request.user.is_librarian_or_admin:
            return AuditLog.objects.none()
        return AuditLog.objects.all().order_by('-timestamp')
