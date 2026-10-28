import re
import urllib.parse
from decimal import Decimal
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import MessageTemplate, MessageLog
from .serializers import MessageTemplateSerializer, MessageLogSerializer, GenerateReminderSerializer
from apps.circulation.models import Loan
from apps.fines.models import Fine
from apps.reports_audit.models import SystemSetting


def normalize_kenyan_phone(phone: str) -> str:
    """Normalizes Kenyan phone numbers to international WhatsApp standard: 2547XXXXXXXX"""
    cleaned = re.sub(r'[^0-9]', '', phone)
    if cleaned.startswith('0'):
        cleaned = '254' + cleaned[1:]
    elif cleaned.startswith('7') and len(cleaned) == 9:
        cleaned = '254' + cleaned
    return cleaned


class MessageTemplateListUpdateView(generics.ListCreateAPIView):
    queryset = MessageTemplate.objects.all()
    serializer_class = MessageTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.request.method in ['POST', 'PUT', 'PATCH']:
            # Only librarian or admin can edit templates
            return [permissions.IsAdminUser()]
        return [permissions.IsAuthenticated()]


class MessageLogListView(generics.ListAPIView):
    serializer_class = MessageLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if not self.request.user.is_library_staff:
            return MessageLog.objects.none()
        return MessageLog.objects.all().order_by('-sent_at')


class GenerateReminderView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not request.user.is_library_staff:
            return Response({'detail': 'Only staff can generate reminders.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = GenerateReminderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        loan_id = serializer.validated_data['loan_id']
        template_key = serializer.validated_data['template_key']

        try:
            loan = Loan.objects.select_related('member', 'copy__title').get(pk=loan_id)
        except Loan.DoesNotExist:
            return Response({'detail': 'Loan not found'}, status=status.HTTP_404_NOT_FOUND)

        member = loan.member
        if not member.phone_whatsapp:
            return Response({'detail': f'Member {member.full_name} has no phone number on record.'}, status=status.HTTP_400_BAD_REQUEST)

        # Template lookup
        template = MessageTemplate.objects.filter(key=template_key).first()
        raw_text = template.template_text if template else "Hello {name}, reminder regarding {title}. Blessings, CU Library."

        # Compute fine
        fine_rec = Fine.objects.filter(loan=loan, status=Fine.Status.UNPAID).first()
        fine_amount = f"{fine_rec.balance_remaining:.2f}" if fine_rec else "0.00"

        # Interpolate
        rendered_text = raw_text.format(
            name=member.full_name.split()[0],  # First name for friendly tone
            title=loan.copy.title.title,
            due_date=loan.due_date.strftime('%d-%b-%Y'),
            fine=fine_amount,
            hold_days=SystemSetting.get_setting('RESERVATION_HOLD_DAYS', '3')
        )

        phone_normalized = normalize_kenyan_phone(member.phone_whatsapp)
        wa_link = f"https://wa.me/{phone_normalized}?text={urllib.parse.quote(rendered_text)}"

        # Record in message log
        log_entry = MessageLog.objects.create(
            member=member,
            channel=MessageLog.Channel.WHATSAPP_LINK,
            template_key=template_key,
            message_content=rendered_text,
            sent_by=request.user
        )

        return Response({
            'member_name': member.full_name,
            'phone': phone_normalized,
            'whatsapp_consent': member.whatsapp_consent,
            'message_content': rendered_text,
            'wa_link': wa_link,
            'log_id': str(log_entry.id)
        })
