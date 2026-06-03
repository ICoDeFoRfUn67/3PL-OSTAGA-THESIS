#!/usr/bin/env python
"""
Fast script to add 100 rider and courier employees to the database
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from employees.models import Employee, Hub
import random
from datetime import datetime, timedelta

# Get or create a default hub
hub, _ = Hub.objects.get_or_create(
    name='Default Hub',
    defaults={
        'location': 'Default',
        'city': 'Quezon',
        'company': 'J&T Express',
        'address': 'Default Address',
        'latitude': 0.0,
        'longitude': 0.0,
    }
)

print(f"Using hub: {hub.name}")

# Get existing employee count to determine starting ID
existing_count = Employee.objects.count()
start_id = existing_count + 1

print(f"Creating 100 new employees (starting from ID {start_id})...")

# Prepare bulk create data
employees_to_create = []
first_names = [
    'Juan', 'Maria', 'Jose', 'Antonio', 'Miguel', 'Rosa', 'Carlos', 'Ana',
    'Pedro', 'Teresa', 'Francisco', 'Lucia', 'Diego', 'Carmen', 'Manuel',
    'Isabella', 'Rafael', 'Gabriela', 'Luis', 'Sofia', 'Roberto', 'Elena',
    'Sergio', 'Valentina', 'Alejandro', 'Martina', 'Fernando', 'Catalina',
    'Arturo', 'Monica', 'Ricardo', 'Daniela', 'Gustavo', 'Patricia', 'Hector'
]
last_names = [
    'Santos', 'Garcia', 'Rodriguez', 'Martinez', 'Lopez', 'Gonzalez', 'Hernandez',
    'Perez', 'Sanchez', 'Torres', 'Rivera', 'Cruz', 'Morales', 'Vargas', 'Reyes',
    'Jimenez', 'Castillo', 'Medina', 'Aguilar', 'Flores', 'Rojas', 'Ramirez',
    'Vega', 'Gutierrez', 'Delgado', 'Ortiz', 'Campos', 'Romero', 'Soto', 'Munoz'
]

# Split 100: 50 riders, 50 couriers
num_riders = 50
num_couriers = 50

employee_id_counter = start_id

# Create riders
for i in range(num_riders):
    first_name = random.choice(first_names)
    last_name = random.choice(last_names)
    employee_id = f'RIDER{employee_id_counter:04d}'
    
    employees_to_create.append(
        Employee(
            employee_id=employee_id,
            firstname=first_name,
            lastname=last_name,
            middle_initial='',
            position='Rider',
            employment_type='OCW',
            status='Active',
            role='Employee',
            jtp_code=employee_id,
            can_login=True,
            can_edit_info=True,
            is_active=True,
            hub=hub,
            email_address=f'{employee_id.lower()}@example.com',
            phone_number=f'+63{random.randint(9000000000, 9999999999)}',
            hired_date=datetime.now().date() - timedelta(days=random.randint(1, 365)),
        )
    )
    employee_id_counter += 1

# Create couriers
for i in range(num_couriers):
    first_name = random.choice(first_names)
    last_name = random.choice(last_names)
    employee_id = f'COURIER{employee_id_counter:04d}'
    
    employees_to_create.append(
        Employee(
            employee_id=employee_id,
            firstname=first_name,
            lastname=last_name,
            middle_initial='',
            position='Courier',
            employment_type='OCW',
            status='Active',
            role='Employee',
            jtp_code=employee_id,
            can_login=True,
            can_edit_info=True,
            is_active=True,
            hub=hub,
            email_address=f'{employee_id.lower()}@example.com',
            phone_number=f'+63{random.randint(9000000000, 9999999999)}',
            hired_date=datetime.now().date() - timedelta(days=random.randint(1, 365)),
        )
    )
    employee_id_counter += 1

# Bulk create all at once
created_employees = Employee.objects.bulk_create(employees_to_create)

print(f"✓ Successfully created {len(created_employees)} employees!")
print(f"  - {num_riders} Riders")
print(f"  - {num_couriers} Couriers")

# Verify
total = Employee.objects.count()
riders = Employee.objects.filter(position='Rider').count()
couriers = Employee.objects.filter(position='Courier').count()

print(f"\nDatabase Summary:")
print(f"  Total employees: {total}")
print(f"  Total riders: {riders}")
print(f"  Total couriers: {couriers}")

# Show sample
print(f"\nSample employees created:")
for emp in Employee.objects.order_by('-id')[:5]:
    print(f"  {emp.employee_id}: {emp.full_name} - {emp.position}")
