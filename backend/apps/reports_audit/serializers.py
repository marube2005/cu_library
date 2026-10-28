from rest_framework import serializers
from .models import SystemSetting, AuditLog


class SystemSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemSetting
        fields = ['key', 'value', 'description', 'updated_at']


class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True)

    class Meta:
        model = AuditLog
        fields = ['id', 'user', 'user_name', 'action', 'module', 'details', 'ip_address', 'timestamp']
        read_only_fields = ['id', 'timestamp']
