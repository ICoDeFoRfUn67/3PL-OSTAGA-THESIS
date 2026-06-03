#!/usr/bin/env python
"""
Directly insert 100 rider and courier employees into PostgreSQL
"""
import os
import django

# Set PostgreSQL connection BEFORE Django setup
os.environ['DATABASE_URL'] = 'postgresql://db_3pl_db_user:1c252y1LRra5SogWdlOBRWNLBjAqHC3R@dpg-d823dkpkh4rs73br35d0-a.oregon-postgres.render.com/db_3pl_db'
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

django.setup()

from employees.models import Employee, Hub
import random
from datetime import datetime, timedelta

# Get or create hub
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

# Get current count
current_count = Employee.objects.count()
start_id = current_count + 1

print(f"Current employees in PostgreSQL: {current_count}")
print(f"Creating 100 new employees (starting from ID {start_id})...")

# Names
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

employees_to_create = []
employee_id_counter = start_id

# 50 Riders
for i in range(50):
    first_name = random.choice(first_names)
    last_name = random.choice(last_names)
    employee_id = f'RIDER{employee_id_counter:04d}'
    
    employees_to_create.append(
        Employee(
            employee_id=employee_id,
            firstname=first_name,
            lastname=last_name,
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

# 50 Couriers
for i in range(50):
    first_name = random.choice(first_names)
    last_name = random.choice(last_names)
    employee_id = f'COURIER{employee_id_counter:04d}'
    
    employees_to_create.append(
        Employee(
            employee_id=employee_id,
            firstname=first_name,
            lastname=last_name,
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

# Bulk create to PostgreSQL
created = Employee.objects.bulk_create(employees_to_create, batch_size=50)

print(f"\n✓ Successfully created {len(created)} employees in PostgreSQL!")
print(f"  - 50 Riders")
print(f"  - 50 Couriers")

# Verify
total = Employee.objects.count()
riders = Employee.objects.filter(position='Rider').count()
couriers = Employee.objects.filter(position='Courier').count()

print(f"\nPostgreSQL Database Summary:")
print(f"  Total employees: {total}")
print(f"  Total riders: {riders}")
print(f"  Total couriers: {couriers}")

# Show samples
print(f"\nLatest 5 employees:")
for emp in Employee.objects.order_by('-id')[:5]:
    print(f"  {emp.employee_id}: {emp.full_name} - {emp.position}")
