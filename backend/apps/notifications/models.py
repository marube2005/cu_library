import uuid
from django.db import models
from django.conf import settings


class MessageTemplate(models.Model):
    class TemplateType(models.TextChoices):
        DUE_SOON = 'DUE_SOON', 'Due Soon Reminder'
        OVERDUE = 'OVERDUE', 'Overdue Loan Notice'
        RESERVATION_READY = 'RESERVATION_READY', 'Reservation Ready for Pickup'
        GENERAL = 'GENERAL', 'General Ministry Announcement'

    key = models.CharField(max_length=50, unique=True, choices=TemplateType.choices)
    title = models.CharField(max_length=150)
    template_text = models.TextField(help_text='Use placeholders: {name}, {title}, {due_date}, {fine}, {hold_days}')
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title


class MessageLog(models.Model):
    class Channel(models.TextChoices):
        WHATSAPP_LINK = 'WHATSAPP_LINK', 'WhatsApp Click-to-Chat (wa.me)'
        WHATSAPP_API = 'WHATSAPP_API', 'WhatsApp Cloud API'
        EMAIL = 'EMAIL', 'SMTP Email'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    member = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='received_messages')
    channel = models.CharField(max_length=30, choices=Channel.choices, default=Channel.WHATSAPP_LINK)
    template_key = models.CharField(max_length=50, blank=True, default='')
    message_content = models.TextField()
    sent_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='dispatched_messages')
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-sent_at']

    def __str__(self):
        return f"{self.channel} -> {self.member.full_name} at {self.sent_at:%Y-%m-%d %H:%M}"
