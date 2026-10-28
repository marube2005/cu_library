import uuid
from datetime import timedelta
from django.db import models
from django.conf import settings
from django.utils import timezone
from apps.catalogue.models import Copy, Title


class Loan(models.Model):
    class Status(models.TextChoices):
        REQUESTED = 'REQUESTED', 'Requested (Hold)'
        ISSUED = 'ISSUED', 'Issued (Active)'
        RETURNED = 'RETURNED', 'Returned'
        OVERDUE = 'OVERDUE', 'Overdue'
        LOST = 'LOST', 'Flagged Lost'
        CLOSED = 'CLOSED', 'Closed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    copy = models.ForeignKey(Copy, on_delete=models.PROTECT, related_name='loans')
    member = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='loans')
    issued_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='issued_loans'
    )
    issue_date = models.DateField(default=timezone.now)
    due_date = models.DateField(db_index=True)
    return_date = models.DateField(null=True, blank=True)
    renewals_count = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.REQUESTED)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-issue_date']

    def __str__(self):
        return f"{self.copy.copy_code} -> {self.member.full_name} ({self.get_status_display()})"

    @property
    def is_overdue(self):
        if self.return_date:
            return False
        return timezone.now().date() > self.due_date

    @property
    def days_overdue(self):
        if not self.is_overdue:
            return 0
        return (timezone.now().date() - self.due_date).days


class Reservation(models.Model):
    class Status(models.TextChoices):
        QUEUED = 'QUEUED', 'In Queue'
        READY_FOR_PICKUP = 'READY_FOR_PICKUP', 'Ready for Pickup'
        FULFILLED = 'FULFILLED', 'Fulfilled'
        EXPIRED = 'EXPIRED', 'Expired'
        CANCELLED = 'CANCELLED', 'Cancelled'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.ForeignKey(Title, on_delete=models.CASCADE, related_name='reservations')
    member = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reservations')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.QUEUED)
    queue_position = models.PositiveIntegerField(default=1)
    hold_expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['queue_position', 'created_at']

    def __str__(self):
        return f"Reservation: {self.title.title} for {self.member.full_name} ({self.get_status_display()})"
