import uuid
from django.db import models
from django.conf import settings
from apps.circulation.models import Loan


class Fine(models.Model):
    class Status(models.TextChoices):
        UNPAID = 'UNPAID', 'Unpaid'
        PARTIAL = 'PARTIAL', 'Partially Paid'
        PAID = 'PAID', 'Fully Paid'
        WAIVED = 'WAIVED', 'Waived'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    loan = models.ForeignKey(Loan, on_delete=models.CASCADE, related_name='fines')
    member = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='fines')
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    paid_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.UNPAID)
    waive_reason = models.TextField(blank=True, default='')
    waived_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='waived_fines'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Fine: Ksh {self.amount} for {self.member.full_name} ({self.get_status_display()})"

    @property
    def balance_remaining(self):
        return max(0, self.amount - self.paid_amount)


class Payment(models.Model):
    class Method(models.TextChoices):
        CASH = 'CASH', 'Cash'
        MPESA = 'MPESA', 'M-Pesa'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    fine = models.ForeignKey(Fine, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    method = models.CharField(max_length=20, choices=Method.choices, default=Method.CASH)
    reference = models.CharField(max_length=100, blank=True, default='', help_text='Receipt or M-Pesa transaction ID')
    received_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='received_payments')
    payment_date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Payment: Ksh {self.amount} ({self.get_method_display()}) by {self.fine.member.full_name}"
