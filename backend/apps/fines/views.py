from decimal import Decimal
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Fine, Payment
from .serializers import FineSerializer, PaymentSerializer
from apps.reports_audit.models import AuditLog


class FineListView(generics.ListAPIView):
    serializer_class = FineSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if not self.request.user.is_library_staff:
            return Fine.objects.filter(member=self.request.user)

        queryset = Fine.objects.all().order_by('-created_at')
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset


class MyFinesView(generics.ListAPIView):
    serializer_class = FineSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Fine.objects.filter(member=self.request.user).order_by('-created_at')


class RecordPaymentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        if not request.user.is_library_staff:
            return Response({'detail': 'Only staff can record payments.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            fine = Fine.objects.get(pk=pk)
        except Fine.DoesNotExist:
            return Response({'detail': 'Fine record not found'}, status=status.HTTP_404_NOT_FOUND)

        amount_str = request.data.get('amount')
        method = request.data.get('method', Payment.Method.CASH)
        reference = request.data.get('reference', '')

        if not amount_str:
            return Response({'detail': 'Payment amount is required.'}, status=status.HTTP_400_BAD_REQUEST)

        amount = Decimal(str(amount_str))
        if amount <= 0:
            return Response({'detail': 'Amount must be greater than zero.'}, status=status.HTTP_400_BAD_REQUEST)

        payment = Payment.objects.create(
            fine=fine,
            amount=amount,
            method=method,
            reference=reference,
            received_by=request.user
        )

        fine.paid_amount += amount
        if fine.paid_amount >= fine.amount:
            fine.status = Fine.Status.PAID
        else:
            fine.status = Fine.Status.PARTIAL
        fine.save()

        AuditLog.objects.create(
            user=request.user,
            action='RECORD_PAYMENT',
            module='fines',
            details={'fine_id': str(fine.id), 'amount': str(amount), 'method': method, 'reference': reference}
        )

        return Response(FineSerializer(fine).data)


class WaiveFineView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        if not request.user.is_librarian_or_admin:
            return Response({'detail': 'Only the Librarian or System Admin can waive fines.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            fine = Fine.objects.get(pk=pk)
        except Fine.DoesNotExist:
            return Response({'detail': 'Fine not found'}, status=status.HTTP_404_NOT_FOUND)

        reason = request.data.get('reason', '').strip()
        if not reason:
            return Response({'detail': 'A valid justification reason is required for audit compliance.'}, status=status.HTTP_400_BAD_REQUEST)

        fine.status = Fine.Status.WAIVED
        fine.waive_reason = reason
        fine.waived_by = request.user
        fine.save()

        AuditLog.objects.create(
            user=request.user,
            action='WAIVE_FINE',
            module='fines',
            details={'fine_id': str(fine.id), 'member': fine.member.full_name, 'reason': reason}
        )

        return Response(FineSerializer(fine).data)
