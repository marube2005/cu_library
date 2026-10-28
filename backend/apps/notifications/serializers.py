from rest_framework import serializers
from .models import MessageTemplate, MessageLog


class MessageTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageTemplate
        fields = ['id', 'key', 'title', 'template_text', 'updated_at']


class MessageLogSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='member.full_name', read_only=True)
    sent_by_name = serializers.CharField(source='sent_by.full_name', read_only=True)

    class Meta:
        model = MessageLog
        fields = ['id', 'member', 'member_name', 'channel', 'template_key', 'message_content', 'sent_by', 'sent_by_name', 'sent_at']
        read_only_fields = ['id', 'sent_at']


class GenerateReminderSerializer(serializers.Serializer):
    loan_id = serializers.UUIDField()
    template_key = serializers.ChoiceField(choices=MessageTemplate.TemplateType.choices, default=MessageTemplate.TemplateType.OVERDUE)
