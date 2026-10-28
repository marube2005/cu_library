from datetime import timedelta
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model
from apps.catalogue.models import Category, Title, Copy
from apps.circulation.models import Loan
from apps.fines.models import Fine

User = get_user_model()


class Command(BaseCommand):
    help = 'Seeds sample users, books, copies, and active loans for testing'

    def handle(self, *args, **options):
        # 1. Staff and Member Accounts
        librarian, _ = User.objects.get_or_create(
            email='librarian@culibrary.org',
            defaults={
                'full_name': 'Elvis Marube',
                'reg_no': 'STAFF/001',
                'phone_whatsapp': '+254711000111',
                'role': User.Role.LIBRARIAN,
                'status': User.Status.APPROVED,
                'is_staff': True,
                'is_superuser': True,
            }
        )
        librarian.set_password('Password123!')
        librarian.save()

        assistant, _ = User.objects.get_or_create(
            email='assistant@culibrary.org',
            defaults={
                'full_name': 'Grace Wanjiku',
                'reg_no': 'STAFF/002',
                'phone_whatsapp': '+254722000222',
                'role': User.Role.ASSISTANT,
                'status': User.Status.APPROVED,
                'is_staff': True,
            }
        )
        assistant.set_password('Password123!')
        assistant.save()

        member1, _ = User.objects.get_or_create(
            email='member@student.ac.ke',
            defaults={
                'full_name': 'David Ochieng',
                'reg_no': 'CU/2024/0482',
                'phone_whatsapp': '+254712345678',
                'role': User.Role.MEMBER,
                'status': User.Status.APPROVED,
                'whatsapp_consent': True,
            }
        )
        member1.set_password('Password123!')
        member1.save()

        member2, _ = User.objects.get_or_create(
            email='faith.mutua@student.ac.ke',
            defaults={
                'full_name': 'Faith Mutua',
                'reg_no': 'CU/2024/0119',
                'phone_whatsapp': '+254798765432',
                'role': User.Role.MEMBER,
                'status': User.Status.APPROVED,
                'whatsapp_consent': True,
            }
        )
        member2.set_password('Password123!')
        member2.save()

        # 2. Books & Copies
        cat_theology = Category.objects.filter(name__icontains='Theology').first()
        cat_prayer = Category.objects.filter(name__icontains='Prayer').first()
        cat_leadership = Category.objects.filter(name__icontains='Leadership').first()

        t1, _ = Title.objects.get_or_create(
            title='Mere Christianity',
            author='C.S. Lewis',
            defaults={
                'isbn': '9780060652920',
                'publisher': 'HarperOne',
                'publication_year': 2001,
                'category': cat_theology,
                'description': 'A forceful and rational defense of the Christian faith, exploring core doctrines and the common ground of Christianity.',
                'cover_url': 'https://covers.openlibrary.org/b/isbn/9780060652920-L.jpg'
            }
        )
        c1, _ = Copy.objects.get_or_create(copy_code='CU-0001', defaults={'title': t1, 'shelf_location': 'Shelf A-1', 'status': Copy.Status.AVAILABLE})
        c2, _ = Copy.objects.get_or_create(copy_code='CU-0002', defaults={'title': t1, 'shelf_location': 'Shelf A-1', 'status': Copy.Status.AVAILABLE})

        t2, _ = Title.objects.get_or_create(
            title='Knowing God',
            author='J.I. Packer',
            defaults={
                'isbn': '9780830816507',
                'publisher': 'IVP Books',
                'publication_year': 1993,
                'category': cat_theology,
                'description': 'A landmark classic demonstrating how knowing God in relationship transforms the Christian heart, mind, and everyday walk.',
                'cover_url': 'https://covers.openlibrary.org/b/isbn/9780830816507-L.jpg'
            }
        )
        c3, _ = Copy.objects.get_or_create(copy_code='CU-0003', defaults={'title': t2, 'shelf_location': 'Shelf A-2', 'status': Copy.Status.AVAILABLE})

        t3, _ = Title.objects.get_or_create(
            title='Celebration of Discipline',
            author='Richard J. Foster',
            defaults={
                'isbn': '9780060628390',
                'publisher': 'HarperSanFrancisco',
                'publication_year': 1998,
                'category': cat_prayer,
                'description': 'An exploration of the classic spiritual disciplines: prayer, fasting, study, simplicity, solitude, and worship.',
                'cover_url': 'https://covers.openlibrary.org/b/isbn/9780060628390-L.jpg'
            }
        )
        c4, _ = Copy.objects.get_or_create(copy_code='CU-0004', defaults={'title': t3, 'shelf_location': 'Shelf B-1', 'status': Copy.Status.BORROWED})

        t4, _ = Title.objects.get_or_create(
            title='Spiritual Leadership',
            author='J. Oswald Sanders',
            defaults={
                'isbn': '9780802482273',
                'publisher': 'Moody Publishers',
                'publication_year': 2007,
                'category': cat_leadership,
                'description': 'Principles of excellence for every believer seeking to grow in spiritual influence, character, and vision.',
                'cover_url': 'https://covers.openlibrary.org/b/isbn/9780802482273-L.jpg'
            }
        )
        c5, _ = Copy.objects.get_or_create(copy_code='CU-0005', defaults={'title': t4, 'shelf_location': 'Shelf C-1', 'status': Copy.Status.BORROWED})

        # 3. Sample Loans (One Active, One Overdue)
        today = timezone.now().date()
        # Active loan: issued 3 days ago, due in 11 days
        l1, _ = Loan.objects.get_or_create(
            copy=c4,
            member=member1,
            defaults={
                'issued_by': librarian,
                'issue_date': today - timedelta(days=3),
                'due_date': today + timedelta(days=11),
                'status': Loan.Status.ISSUED
            }
        )

        # Overdue loan: issued 20 days ago, due 6 days ago (4 chargeable days after 2 grace days)
        l2, created_overdue = Loan.objects.get_or_create(
            copy=c5,
            member=member2,
            defaults={
                'issued_by': librarian,
                'issue_date': today - timedelta(days=20),
                'due_date': today - timedelta(days=6),
                'status': Loan.Status.OVERDUE
            }
        )
        if created_overdue:
            # 4 chargeable days * 5 Ksh = Ksh 20.00 fine
            Fine.objects.get_or_create(
                loan=l2,
                member=member2,
                defaults={
                    'amount': Decimal('20.00'),
                    'status': Fine.Status.UNPAID
                }
            )

        self.stdout.write(self.style.SUCCESS('Successfully seeded sample users, titles, copies, and circulation loans!'))
