from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from employees.models import Employee, Hub, Attendance, Payroll
from datetime import datetime, date, timedelta
from django.utils import timezone
from decimal import Decimal
import random


def random_time_on_date(d, start_hour=8, end_hour=17):
    hour = random.randint(start_hour, end_hour)
    minute = random.randint(0, 59)
    second = random.randint(0, 59)
    naive = datetime(d.year, d.month, d.day, hour, minute, second)
    try:
        return timezone.make_aware(naive, timezone.get_current_timezone())
    except Exception:
        return naive


class Command(BaseCommand):
    help = 'Create employee Shaun L Ostaga with attendance and payslip history'

    def handle(self, *args, **options):
        # Create or get hub
        hub, _ = Hub.objects.get_or_create(name='Sariaya', defaults={
            'location': 'Sariaya',
            'city': 'Sariaya',
            'company': 'J&T Express',
            'address': 'Sariaya',
            'latitude': 13.9756,
            'longitude': 121.5210,
            'employee_count': 1,
        })

        # Create Django user
        user, created = User.objects.get_or_create(username='shaun.ostaga')
        if created:
            user.set_password('Teken123')
            user.is_active = True
            user.save()

        # Create Employee
        employee, emp_created = Employee.objects.get_or_create(
            employee_id='EMP-SHAUN-0001',
            defaults={
                'firstname': 'Shaun',
                'lastname': 'L Ostaga',
                'middle_initial': 'L',
                'position': 'Operator',
                'employment_type': 'Full-time',
                'status': 'Active',
                'role': 'Employee',
                'hub': hub,
                'hired_date': date(2024, 1, 1),
                'can_login': True,
                'is_active': True,
            }
        )

        if emp_created:
            employee.user = user
            employee.email_address = 'shaun.ostaga@example.com'
            employee.save()

        # Attendance and payroll from Jan to Jun of current year
        year = date.today().year
        start_month = 1
        end_month = 6

        for month in range(start_month, end_month + 1):
            # For each day in month create attendance record (Mon-Fri present, weekends random)
            first_day = date(year, month, 1)
            if month == 12:
                last_day = date(year, 12, 31)
            else:
                last_day = date(year, month + 1, 1) - timedelta(days=1)

            day = first_day
            today = date.today()
            while day <= last_day and day <= today:
                # Randomize status
                if day.weekday() < 5:  # Mon-Fri
                    status = random.choices(['Present', 'Present', 'Present', 'Late', 'Absent'], [0.6,0.1,0.2,0.05,0.05])[0]
                else:
                    status = random.choice(['Present', 'Absent', 'Present'])

                # Ensure uniqueness
                att, _ = Attendance.objects.get_or_create(employee=employee, date=day, defaults={
                    'status': status,
                    'clock_in_time': random_time_on_date(day, 8, 9) if status in ['Present', 'Late'] else None,
                    'clock_out_time': random_time_on_date(day, 16, 17) if status in ['Present', 'Late'] else None,
                })

                day += timedelta(days=1)

            # Create payroll for the month
            period_start = date(year, month, 1)
            period_end = last_day
            pay, _ = Payroll.objects.get_or_create(employee=employee, period_start=period_start, period_end=period_end, defaults={
                'basic_salary': Decimal('15000.00'),
                'standard_pay': Decimal('15000.00'),
                'total_hours': Decimal('160.00'),
                'overtime_hours': Decimal('5.00'),
                'lates': 2,
                'absences': 1,
                'incentives': Decimal('500.00'),
                'status': 'approved',
            })

        # Cleanup: remove any attendance records for this employee beyond today (if created earlier)
        future_qs = Attendance.objects.filter(employee=employee, date__gt=date.today())
        if future_qs.exists():
            deleted_count, _ = future_qs.delete()
            self.stdout.write(f'Removed {deleted_count} future attendance records for {employee.employee_id}')

        self.stdout.write(self.style.SUCCESS('Created/updated Shaun L Ostaga, attendance and payroll records'))
