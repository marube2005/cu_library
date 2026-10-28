import uuid
from django.db import models
from django.conf import settings


class SystemSetting(models.Model):
    key = models.CharField(max_length=100, primary_key=True)
    value = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.key}: {self.value}"

    @classmethod
    def get_setting(cls, key, default=None):
        try:
            return cls.objects.get(key=key).value
        except cls.DoesNotExist:
            return default


class AuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='audit_logs')
    action = models.CharField(max_length=100, db_index=True)
    module = models.CharField(max_length=50, blank=True, default='')
    details = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        actor = self.user.full_name if self.user else 'System'
        return f"[{self.timestamp:%Y-%m-%d %H:%M}] {actor}: {self.action}"
