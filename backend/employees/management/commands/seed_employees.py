from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from employees.models import Employee, Hub
from django.utils import timezone
import random


class Command(BaseCommand):
    help = 'Seed employees (riders and couriers) with linked Django user accounts'

    def add_arguments(self, parser):
        parser.add_argument('--count', type=int, default=100, help='Number of employees to create')
        parser.add_argument('--rider-ratio', type=float, default=0.5, help='Fraction of employees who are riders (0-1)')
        parser.add_argument('--password', type=str, default='Password123', help='Default password for created users')
        parser.add_argument('--start-index', type=int, default=1, help='Start index for generated IDs')

    def handle(self, *args, **options):
        count = max(0, options.get('count', 100))
        rider_ratio = float(options.get('rider_ratio', options.get('rider-ratio', 0.5)))
        password = options.get('password') or 'Password123'
        idx = int(options.get('start_index', 1))

        # Ensure there is at least one Hub to assign employees to
        hubs = list(Hub.objects.all())
        if not hubs:
            hub = Hub.objects.create(
                name='Default Hub',
                location='Default',
                city='Quezon',
                company='J&T Express',
                address='Default Address',
                latitude=0.0,
                longitude=0.0,
            )
            hubs = [hub]
            self.stdout.write(self.style.WARNING('No hubs found — created a Default Hub'))

        num_riders = int(count * rider_ratio)
        num_couriers = count - num_riders

        created = 0

        def make_unique_employee_id(prefix, start):
            i = start
            while True:
                eid = f"{prefix}{i:04d}"
                if not Employee.objects.filter(employee_id=eid).exists():
                    return eid, i
                i += 1

        # Helper to create a user + employee
        def create_account(username, employee_id, firstname, lastname, position):
            user, user_created = User.objects.get_or_create(username=username, defaults={'email': f'{username}@example.com', 'is_active': True})
            if user_created:
                user.set_password(password)
                user.save()

            # If an employee with this employee_id exists, update its user and basic fields; otherwise create
            employee, emp_created = Employee.objects.get_or_create(
                employee_id=employee_id,
                defaults={
                    'user': user,
                    'firstname': firstname,
                    'lastname': lastname,
                    'position': position,
                    'employment_type': 'OCW',
                    'status': 'Active',
                    'role': 'Employee',
                    'jtp_code': employee_id,
                    'can_login': True,
                    'is_active': True,
                    'hub': random.choice(hubs),
                }
            )

            # Ensure the user link exists and can_login is True
            changed = False
            if employee.user is None:
                employee.user = user
                changed = True
            if not employee.can_login:
                employee.can_login = True
                changed = True
            if employee.position != position:
                employee.position = position
                changed = True
            if changed:
                employee.save()

            return user_created or emp_created

        # Create riders
        for _ in range(num_riders):
            employee_id, idx = make_unique_employee_id('RIDER', idx)
            username = f'rider{idx:04d}'
            firstname = f'Rider{idx}'
            lastname = 'Auto'
            if create_account(username, employee_id, firstname, lastname, 'Rider'):
                created += 1
            idx += 1

        # Create couriers
        for _ in range(num_couriers):
            employee_id, idx = make_unique_employee_id('COURIER', idx)
            username = f'courier{idx:04d}'
            firstname = f'Courier{idx}'
            lastname = 'Auto'
            if create_account(username, employee_id, firstname, lastname, 'Courier'):
                created += 1
            idx += 1

        self.stdout.write(self.style.SUCCESS(f'Created/updated {created} employee accounts (requested {count})'))
