from rest_framework import serializers
from .models import Loan, Reservation


class LoanSerializer(serializers.ModelSerializer):
    copy_code = serializers.CharField(source='copy.copy_code', read_only=True)
    title_name = serializers.CharField(source='copy.title.title', read_only=True)
    author = serializers.CharField(source='copy.title.author', read_only=True)
    member_name = serializers.CharField(source='member.full_name', read_only=True)
    member_reg = serializers.CharField(source='member.reg_no', read_only=True)
    member_phone = serializers.CharField(source='member.phone_whatsapp', read_only=True)
    days_overdue = serializers.IntegerField(read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        model = Loan
        fields = [
            'id', 'copy', 'copy_code', 'title_name', 'author', 'member',
            'member_name', 'member_reg', 'member_phone', 'issued_by',
            'issue_date', 'due_date', 'return_date', 'renewals_count',
            'status', 'is_overdue', 'days_overdue', 'created_at'
        ]
        read_only_fields = ['id', 'issue_date', 'created_at']


class ReservationSerializer(serializers.ModelSerializer):
    title_name = serializers.CharField(source='title.title', read_only=True)
    author = serializers.CharField(source='title.author', read_only=True)
    member_name = serializers.CharField(source='member.full_name', read_only=True)

    class Meta:
        model = Reservation
        fields = [
            'id', 'title', 'title_name', 'author', 'member', 'member_name',
            'status', 'queue_position', 'hold_expires_at', 'created_at'
        ]
        read_only_fields = ['id', 'queue_position', 'hold_expires_at', 'created_at']


class IssueBookSerializer(serializers.Serializer):
    member_identifier = serializers.CharField(help_text='Member Email, Reg No, or UUID')
    copy_code = serializers.CharField(help_text='Physical book copy code, e.g. CU-0001')


class ReturnBookSerializer(serializers.Serializer):
    copy_code = serializers.CharField(help_text='Physical book copy code, e.g. CU-0001')
    condition = serializers.CharField(required=False, default='')
