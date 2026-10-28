from django.core.management.base import BaseCommand
from apps.circulation.maintenance import run_nightly_watchman


class Command(BaseCommand):
    help = 'Night Watchman: marks overdue loans, updates fines, expires uncollected holds, and compiles reminders.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Starting Night Watchman automated library check...'))
        res = run_nightly_watchman()
        self.stdout.write(self.style.SUCCESS(
            f"Done!\n"
            f"- Loans marked Overdue: {res['loans_marked_overdue']}\n"
            f"- Fines updated/created: {res['fines_updated_or_created']}\n"
            f"- Expired holds cancelled: {res['reservations_expired']}\n"
            f"- Advanced to next in queue: {res['reservations_passed_to_next']}\n"
            f"- Copies returned to shelf: {res['copies_freed_available']}\n"
            f"- Due soon reminders: {res['due_soon_reminders_count']}\n"
            f"- Overdue reminders: {res['overdue_reminders_count']}"
        ))
