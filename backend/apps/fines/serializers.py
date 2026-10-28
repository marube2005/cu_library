from rest_framework import serializers
from .models import Fine, Payment


class PaymentSerializer(serializers.ModelSerializer):
    received_by_name = serializers.CharField(source='received_by.full_name', read_only=True)

    class Meta:
        model = Payment
        fields = ['id', 'fine', 'amount', 'method', 'reference', 'received_by', 'received_by_name', 'payment_date']
        read_only_fields = ['id', 'received_by', 'payment_date']


class FineSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='member.full_name', read_only=True)
    member_reg = serializers.CharField(source='member.reg_no', read_only=True)
    book_title = serializers.CharField(source='loan.copy.title.title', read_only=True)
    copy_code = serializers.CharField(source='loan.copy.copy_code', read_only=True)
    balance = serializers.DecimalField(source='balance_remaining', max_digits=10, decimal_places=2, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)

    class Meta:
        model = Fine
        fields = [
            'id', 'loan', 'member', 'member_name', 'member_reg', 'book_title', 'copy_code',
            'amount', 'paid_amount', 'balance', 'status', 'waive_reason', 'waived_by',
            'payments', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
