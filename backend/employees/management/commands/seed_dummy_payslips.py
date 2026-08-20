from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from employees.models import Employee, Payroll, Hub
from django.utils import timezone
from datetime import date, timedelta
import random


class Command(BaseCommand):
    help = 'Create a demo employee with a small payslip history (draft, pending, approved)'

    def add_arguments(self, parser):
        parser.add_argument('--username', type=str, default='demo.employee', help='Username for demo user')
        parser.add_argument('--password', type=str, default='Password123', help='Password for demo user')
        parser.add_argument('--email', type=str, default='demo.employee@example.com', help='Email for demo user')
        parser.add_argument('--hub', type=str, default=None, help='Hub name to assign the employee to')

    def handle(self, *args, **options):
        username = options.get('username')
        password = options.get('password')
        email = options.get('email')
        hub_name = options.get('hub')

        # Ensure a hub exists
        hub = None
        if hub_name:
            hub = Hub.objects.filter(name__iexact=hub_name).first()
        if not hub:
            hub = Hub.objects.first()
        if not hub:
            hub = Hub.objects.create(name='Demo Hub', location='Demo', city='Quezon', company='J&T Express', address='Demo Address', latitude=0.0, longitude=0.0)

        user, created = User.objects.get_or_create(username=username, defaults={'email': email, 'is_active': True})
        if created:
            user.set_password(password)
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Created demo user: {username}'))
        else:
            self.stdout.write(self.style.WARNING(f'User {username} already exists - reusing'))

        # Create or update employee
        emp_defaults = {
            'user': user,
            'firstname': 'Demo',
            'lastname': 'Employee',
            'position': 'Demo',
            'employment_type': 'Full-time',
            'status': 'Active',
            'role': 'Employee',
            'jtp_code': username.upper(),
            'can_login': True,
            'is_active': True,
            'hub': hub,
            'hired_date': date.today() - timedelta(days=30),
            'employee_id': f'DEMO{random.randint(1000,9999)}'
        }

        employee, emp_created = Employee.objects.update_or_create(user=user, defaults=emp_defaults)
        if emp_created:
            self.stdout.write(self.style.SUCCESS(f'Created demo employee for user {username}'))
        else:
            self.stdout.write(self.style.WARNING(f'Updated demo employee for user {username}'))

        # Create three payslips: draft, pending, approved
        today = date.today()
        entries = [
            {'offset_days': -30, 'status': 'draft'},
            {'offset_days': -15, 'status': 'pending'},
            {'offset_days': 0, 'status': 'approved'},
        ]

        created_count = 0
        for e in entries:
            start = today + timedelta(days=e['offset_days'])
            # Normalize to semi-month ranges: 1-15 or 16-end
            if start.day <= 15:
                period_start = date(start.year, start.month, 1)
                period_end = date(start.year, start.month, 15)
            else:
                period_start = date(start.year, start.month, 16)
                last_day = (date(start.year, start.month + 1, 1) - timedelta(days=1)).day if start.month < 12 else 31
                period_end = date(start.year, start.month, last_day)

            # Some simple randomized earnings
            basic_salary = random.choice([4000, 4200, 4500])
            standard_pay = basic_salary
            overtime_pay = basic_salary * 0.25
            incentives = random.choice([0, 100, 200])
            other_allowance = random.choice([0, 50, 100])

            payroll_values = {
                'employee': employee,
                'period_start': period_start,
                'period_end': period_end,
                'standard_pay': standard_pay,
                'basic_salary': basic_salary,
                'overtime_pay': overtime_pay,
                'incentives': incentives,
                'other_allowance': other_allowance,
                'late': 0,
                'id_deduction': 0,
                'uniform': 0,
                'insurance': 0,
                'surety_bond': 0,
                'convenience_fee': 0,
                'general_deduction': 0,
                'deduction_details': {},
                'sss_percent': 4.5,
                'philhealth_percent': 2.75,
                'pagibig_percent': 1.0,
                'status': e['status']
            }

            # Try to find existing payroll for same period
            existing = Payroll.objects.filter(employee=employee, period_start=period_start, period_end=period_end).first()
            if existing:
                existing.status = e['status']
                for k, v in payroll_values.items():
                    if k in ['employee', 'period_start', 'period_end']:
                        continue
                    setattr(existing, k, v)
                existing.save()
                self.stdout.write(self.style.WARNING(f'Updated existing payroll for {employee}: {period_start} - {period_end}'))
            else:
                p = Payroll.objects.create(**payroll_values)
                p.save()
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'Created payroll ({e["status"]}) for {employee} period {period_start} - {period_end}'))

        self.stdout.write(self.style.SUCCESS(f'Created/updated {created_count} payroll entries for demo employee {employee.full_name}'))
