from datetime import timedelta
from decimal import Decimal
from django.utils import timezone
from .models import Loan, Reservation
from apps.catalogue.models import Copy
from apps.fines.models import Fine
from apps.reports_audit.models import SystemSetting, AuditLog


def run_nightly_watchman(executed_by=None):
    """
    Acts like a night watchman walking the shelves:
    1. Marks loans past due date as OVERDUE and updates fine amounts (respecting grace days).
    2. Cancels reservations not collected within hold time (3 days) and passes copy to next in queue.
    3. Compiles list of members due for reminders (due in 2 days or overdue).
    """
    today = timezone.now().date()
    now = timezone.now()

    results = {
        'timestamp': now.isoformat(),
        'loans_marked_overdue': 0,
        'fines_updated_or_created': 0,
        'reservations_expired': 0,
        'reservations_passed_to_next': 0,
        'copies_freed_available': 0,
        'due_soon_reminders_count': 0,
        'overdue_reminders_count': 0,
        'due_soon_members': [],
        'overdue_members': []
    }

    grace_days = int(SystemSetting.get_setting('GRACE_PERIOD_DAYS', 2))
    fine_rate = Decimal(SystemSetting.get_setting('DAILY_FINE_RATE_KSH', '5.00'))
    hold_days = int(SystemSetting.get_setting('RESERVATION_HOLD_DAYS', 3))

    # --- 1. OVERDUE LOANS & FINES ---
    active_loans = Loan.objects.filter(
        status__in=[Loan.Status.ISSUED, Loan.Status.OVERDUE]
    ).select_related('copy', 'member')

    for loan in active_loans:
        if today > loan.due_date:
            if loan.status != Loan.Status.OVERDUE:
                loan.status = Loan.Status.OVERDUE
                loan.save()
                results['loans_marked_overdue'] += 1

            days_late = (today - loan.due_date).days
            chargeable_days = max(0, days_late - grace_days)
            if chargeable_days > 0:
                accrued = min(chargeable_days * fine_rate, loan.copy.replacement_cost)
                fine_rec, created = Fine.objects.get_or_create(
                    loan=loan,
                    member=loan.member,
                    defaults={'amount': accrued, 'status': Fine.Status.UNPAID}
                )
                if not created and fine_rec.status == Fine.Status.UNPAID and fine_rec.amount != accrued:
                    fine_rec.amount = accrued
                    fine_rec.save()
                results['fines_updated_or_created'] += 1

            results['overdue_reminders_count'] += 1
            results['overdue_members'].append({
                'member_name': loan.member.full_name,
                'phone': loan.member.phone_whatsapp,
                'title': loan.copy.title.title,
                'copy_code': loan.copy.copy_code,
                'due_date': loan.due_date.isoformat(),
                'days_late': days_late
            })
        elif loan.due_date == today + timedelta(days=2):
            results['due_soon_reminders_count'] += 1
            results['due_soon_members'].append({
                'member_name': loan.member.full_name,
                'phone': loan.member.phone_whatsapp,
                'title': loan.copy.title.title,
                'copy_code': loan.copy.copy_code,
                'due_date': loan.due_date.isoformat()
            })

    # --- 2. EXPIRED RESERVATIONS & QUEUE ADVANCEMENT ---
    expired_holds = Reservation.objects.filter(
        status=Reservation.Status.READY_FOR_PICKUP,
        hold_expires_at__lt=now
    ).select_related('title')

    for res in expired_holds:
        res.status = Reservation.Status.EXPIRED
        res.save()
        results['reservations_expired'] += 1

        # Check if another member is in the queue
        next_res = Reservation.objects.filter(
            title=res.title,
            status=Reservation.Status.QUEUED
        ).order_by('queue_position', 'created_at').first()

        if next_res:
            next_res.status = Reservation.Status.READY_FOR_PICKUP
            next_res.hold_expires_at = now + timedelta(days=hold_days)
            next_res.save()
            results['reservations_passed_to_next'] += 1
        else:
            # No one waiting, free one RESERVED copy of this title back to AVAILABLE
            held_copy = Copy.objects.filter(title=res.title, status=Copy.Status.RESERVED).first()
            if held_copy:
                held_copy.status = Copy.Status.AVAILABLE
                held_copy.save()
                results['copies_freed_available'] += 1

    # --- 3. AUDIT LOG ---
    AuditLog.objects.create(
        user=executed_by,
        action='NIGHTLY_WATCHMAN_MAINTENANCE',
        module='circulation',
        details={
            'loans_marked_overdue': results['loans_marked_overdue'],
            'fines_processed': results['fines_updated_or_created'],
            'reservations_expired': results['reservations_expired'],
            'reservations_passed_to_next': results['reservations_passed_to_next'],
            'copies_freed': results['copies_freed_available']
        }
    )

    return results
