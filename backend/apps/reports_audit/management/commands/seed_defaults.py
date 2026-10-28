from django.core.management.base import BaseCommand
from apps.reports_audit.models import SystemSetting
from apps.notifications.models import MessageTemplate
from apps.catalogue.models import Category
from django.utils.text import slugify


class Command(BaseCommand):
    help = 'Seeds initial default settings, categories, and message templates according to CU Library specifications'

    def handle(self, *args, **options):
        # 1. System Settings (A6)
        settings_defaults = [
            ('LOAN_PERIOD_DAYS', '14', 'Standard loan duration in days'),
            ('MAX_BOOKS_PER_MEMBER', '2', 'Maximum active borrowed books per member'),
            ('RENEWAL_DAYS', '7', 'Additional days granted on renewal'),
            ('MAX_RENEWALS', '1', 'Maximum times a loan can be renewed'),
            ('RESERVATION_HOLD_DAYS', '3', 'Days a returned book is held for a waiting member'),
            ('GRACE_PERIOD_DAYS', '2', 'Days after due date before fines begin accruing'),
            ('DAILY_FINE_RATE_KSH', '5.00', 'Fine per book per day after grace period in Ksh'),
            ('BORROWING_BLOCK_FINE_THRESHOLD', '50.00', 'Unpaid fine threshold that blocks borrowing in Ksh'),
            ('MAX_DAYS_OVERDUE_BLOCK', '14', 'Overdue days after which borrowing is blocked'),
        ]

        for key, value, desc in settings_defaults:
            SystemSetting.objects.update_or_create(
                key=key,
                defaults={'value': value, 'description': desc}
            )
        self.stdout.write(self.style.SUCCESS('Successfully configured System Settings'))

        # 2. Notification Templates (A3)
        templates_defaults = [
            (
                MessageTemplate.TemplateType.DUE_SOON,
                'Due Soon Reminder',
                'Hello {name}, a gentle reminder that {title} is due on {due_date}. Blessings, CU Library.'
            ),
            (
                MessageTemplate.TemplateType.OVERDUE,
                'Overdue Loan Notice',
                'Hello {name}, {title} was due on {due_date}. Please return it. A fine of Ksh {fine} has accrued so far. Blessings, CU Library.'
            ),
            (
                MessageTemplate.TemplateType.RESERVATION_READY,
                'Reservation Ready for Collection',
                'Hello {name}, {title} is ready for you at the CU Library desk. Please collect it within {hold_days} days. Blessings!'
            ),
        ]

        for key, title, template_text in templates_defaults:
            MessageTemplate.objects.update_or_create(
                key=key,
                defaults={'title': title, 'template_text': template_text}
            )
        self.stdout.write(self.style.SUCCESS('Successfully configured Message Templates'))

        # 3. Default Categories
        categories = [
            'Theology & Doctrine',
            'Spiritual Growth & Prayer',
            'Christian Living & Marriage',
            'Leadership & Ministry',
            'Bible Study & Commentaries',
            'Biographies & Missions',
            'Apologetics & Culture'
        ]

        for cat_name in categories:
            Category.objects.get_or_create(
                name=cat_name,
                defaults={'slug': slugify(cat_name)}
            )
        self.stdout.write(self.style.SUCCESS('Successfully configured Categories'))
