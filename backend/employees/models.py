from decimal import Decimal
import json
from django.db import models
from django.contrib.auth.models import User
from datetime import date
import os
from typing import TYPE_CHECKING, Any

# Provide typing-only stubs for static analysis (no runtime effect)
if TYPE_CHECKING:
    # Simple name hints for the type checker. Use Any to avoid declaring
    # classes that would be re-declared later in this module.
    LeaveRequest: Any
    LeaveAttachment: Any


# ===================== FILE PATH HELPERS =====================

def profile_picture_path(instance, filename):
    ext = filename.split('.')[-1] if '.' in filename else 'jpg'
    emp_id = instance.employee_id or f"new_{instance.firstname}_{instance.lastname}"
    return f'profile_pictures/{emp_id}.{ext}'


def employee_document_path(instance, filename):
    emp_id = instance.employee.employee_id or instance.employee.id
    return f'employee_documents/{emp_id}/{filename}'


def attendance_clock_in_path(instance, filename):
    ext = filename.split('.')[-1] if '.' in filename else 'jpg'
    return f'attendance_records/{instance.employee.id}/{instance.date}/clock_in.{ext}'


def attendance_clock_out_path(instance, filename):
    ext = filename.split('.')[-1] if '.' in filename else 'jpg'
    return f'attendance_records/{instance.employee.id}/{instance.date}/clock_out.{ext}'


# ===================== HUB =====================

class Hub(models.Model):
    name = models.CharField(max_length=100)
    location = models.CharField(max_length=100)
    city = models.CharField(max_length=100, default="Quezon")
    company = models.CharField(max_length=100, default="J&T Express")
    address = models.CharField(max_length=200)
    latitude = models.FloatField()
    longitude = models.FloatField()
    employee_count = models.IntegerField(default=0)
    # Per-hub override rates (percent values). Optional: if zero, fall back to DEFAULT_GOV_RATES
    sss_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0'))
    philhealth_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0'))
    pagibig_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0'))

    def __str__(self):
        return f"{self.name} ({self.city})"


# ===================== EMPLOYEE =====================

class Employee(models.Model):
    # Inform static type checkers that an auto-generated primary key exists
    id: int

    STATUS_CHOICES = [
        ('Active', 'Active'),
        ('Resign', 'Resign'),
        ('AWOL', 'AWOL'),
        ('Blacklist', 'Blacklist'),
    ]

    EMPLOYMENT_TYPE_CHOICES = [
        ('Full-time', 'Full-time'),
        ('OCW', 'OCW')
    ]

    ROLE_CHOICES = [
        ('Employee', 'Employee'),
        ('HR', 'HR'),
        ('Admin', 'Admin'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, null=True, blank=True)

    # ===== NAME =====
    firstname = models.CharField(max_length=50)
    lastname = models.CharField(max_length=50)
    middle_initial = models.CharField(max_length=10, blank=True)

    @property
    def full_name(self):
        return f"{self.firstname} {self.lastname}"

    # ===== PERSONAL INFO =====
    place_of_birth = models.CharField(max_length=100, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=10, blank=True)
    nationality = models.CharField(max_length=50, blank=True)
    marital_status = models.CharField(max_length=20, blank=True)

    # ===== CONTACT =====
    email_address = models.EmailField(blank=True, null=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)

    # Structured address fields (replaces legacy free-text fields)
    region = models.CharField(max_length=100, blank=True, null=True)
    province = models.CharField(max_length=100, blank=True, null=True)
    city_municipality = models.CharField(max_length=100, blank=True, null=True)
    barangay = models.CharField(max_length=200, blank=True, null=True)
    zip_code = models.CharField(max_length=20, blank=True, null=True)

    # ===== EMPLOYMENT =====
    position = models.CharField(max_length=100)
    employment_type = models.CharField(max_length=20, choices=EMPLOYMENT_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Active')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='Employee')

    hub = models.ForeignKey(Hub, on_delete=models.SET_NULL, null=True, blank=True, related_name='employees')

    hired_date = models.DateField(null=True, blank=True)
    jtp_code = models.CharField(max_length=50, blank=True)

    employee_id = models.CharField(max_length=20, unique=True)

    # ===== EMERGENCY =====
    emergency_contact_name = models.CharField(max_length=100, blank=True, null=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True, null=True)

    # ===== DOCUMENT FIELDS (TEXT) =====
    tin = models.CharField(max_length=20, blank=True, null=True)
    sss = models.CharField(max_length=20, blank=True, null=True)
    philhealth = models.CharField(max_length=20, blank=True, null=True)
    pagibig = models.CharField(max_length=20, blank=True, null=True)

    # ===== PROFILE =====
    profile_image = models.ImageField(upload_to=profile_picture_path, null=True, blank=True)

    # ===== LOGIN =====
    can_login = models.BooleanField(default=False)
    can_edit_info = models.BooleanField(default=True)  # Whether employee can edit their own info

    is_active = models.BooleanField(default=True)  # Ensure this field exists

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    # Last activity timestamp (used for presence/heartbeat)
    last_activity = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.full_name} - {self.position}"


# ===================== HR PERMISSIONS =====================

class HRPermission(models.Model):
    """Stores permissions for HR users"""
    ACCESS_TYPE_CHOICES = [
        ('Single', 'Single Hub Access'),
        ('Multiple', 'Multiple Hub Access'),
    ]

    hr_employee = models.OneToOneField(Employee, on_delete=models.CASCADE, related_name='hr_permissions')
    
    # Hub Management
    access_type = models.CharField(max_length=20, choices=ACCESS_TYPE_CHOICES, default='Single')
    managed_hubs = models.ManyToManyField('Hub', related_name='hr_managers', blank=True)
    
    # HR Permissions
    can_view_employees = models.BooleanField(default=False)
    can_edit_employee_info = models.BooleanField(default=False)
    can_edit_payslip = models.BooleanField(default=False)
    can_delete_employees = models.BooleanField(default=False)
    can_reset_password = models.BooleanField(default=False)
    can_enable_employee_edit = models.BooleanField(default=False)  # Enable employees to edit their own info
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"HR Permissions for {self.hr_employee.full_name}"


# ===================== ATTACHMENTS (VERY IMPORTANT FOR YOUR UI) =====================

class EmployeeDocument(models.Model):
    DOCUMENT_TYPES = [
        ('resume', 'Resume'),
        ('id', 'ID'),
        ('license', 'Driver License'),
        ('other', 'Other'),
    ]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='documents')
    file = models.FileField(upload_to=employee_document_path)

    file_name = models.CharField(max_length=255, blank=True)
    file_size = models.IntegerField(null=True, blank=True)  # in KB
    document_type = models.CharField(max_length=50, blank=True, default='document')

    uploaded_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):  # type: ignore
        if self.file:
            self.file_name = os.path.basename(self.file.name)
            self.file_size = self.file.size // 1024  # KB
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.employee.full_name} - {self.file_name}"


# ===================== ATTENDANCE =====================

class Attendance(models.Model):
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name='attendance_records'
    )

    date = models.DateField()

    clock_in_time = models.DateTimeField(
        null=True,
        blank=True
    )

    clock_out_time = models.DateTimeField(
        null=True,
        blank=True
    )

    clock_in_image = models.ImageField(
        upload_to=attendance_clock_in_path,
        null=True,
        blank=True
    )

    clock_out_image = models.ImageField(
        upload_to=attendance_clock_out_path,
        null=True,
        blank=True
    )

    status = models.CharField(
        max_length=20,
        default='Present'
    )

    # Whether this attendance record has been reviewed/approved by HR
    is_approved = models.BooleanField(default=False)
    approved_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='approved_attendances'
    )
    approved_at = models.DateTimeField(null=True, blank=True)

    # GPS LOCATION FIELDS

    clock_in_latitude = models.DecimalField(
        max_digits=10,
        decimal_places=7,
        null=True,
        blank=True
    )

    clock_in_longitude = models.DecimalField(
        max_digits=10,
        decimal_places=7,
        null=True,
        blank=True
    )

    clock_out_latitude = models.DecimalField(
        max_digits=10,
        decimal_places=7,
        null=True,
        blank=True
    )

    clock_out_longitude = models.DecimalField(
        max_digits=10,
        decimal_places=7,
        null=True,
        blank=True
    )

    class Meta:
        unique_together = ['employee', 'date']
        ordering = ['-date']

    def __str__(self):
        return f"{self.employee.full_name} - {self.date}"

# ===================== LOCATION =====================

class LiveLocation(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE)
    latitude = models.FloatField()
    longitude = models.FloatField()
    timestamp = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.employee.full_name}"


# ===================== PAYROLL =====================

class Payroll(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('pending', 'Pending'),
        ('approved', 'Approved'),
    ]
    
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE)
    period_start = models.DateField()
    period_end = models.DateField()

# Attendance Summary
    total_hours = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0'))
    overtime_hours = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0'))
    lates = models.IntegerField(default=0)
    absences = models.IntegerField(default=0)

    # Earnings (Expanded)
    standard_pay = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0'))
    basic_salary = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0'))
    overtime_pay = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0')) # Fixed at 25% of basic pay
    night_differential = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0'))
    ndot = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0'))
    rest_day = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0'))
    rest_day_ot = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0'))
    rest_day_nd = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0'))
    rest_day_ndot = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0'))
    special_holiday = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0'))
    special_holiday_ot = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0'))
    special_holiday_nd = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0'))
    special_holiday_ndot = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0'))
    legal_holiday = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0'))
    legal_holiday_ot = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0'))
    legal_holiday_nd = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0'))
    legal_holiday_ndot = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0'))
    legal_holiday_rd = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0'))
    legal_holiday_rdot = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0'))
    legal_holiday_rdnd = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0'))
    legal_holiday_rdndot = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0'))
    incentives = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0'))
    adjustment = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0'))
    gas = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0'))
    load = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0'))
    other_allowance = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0'))
    rewards_adjustments = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0'))
    kpi = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0'))
    allowances = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0')) # legacy support
    
    # Deductions (itemized & expanded)
    late = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0'))
    id_deduction = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0'))
    uniform = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0'))
    insurance = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0'))
    surety_bond = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0'))
    convenience_fee = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0'))
    general_deduction = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0')) # general "deduction" input
    deduction_details = models.JSONField(default=dict)  # e.g., {"RCBC Loan": 500, "Union Dues": 200}
    
    # Government Deductions
    sss_deduction = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0'))
    philhealth_deduction = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0'))
    pagibig_deduction = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0'))
    # Stored percentage overrides (if admin set custom percents for this payroll)
    sss_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0'))
    philhealth_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0'))
    pagibig_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0'))

    net_pay = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0'))
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')

    payslip_image = models.ImageField(upload_to='payslips/', null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        # Calculate overtime pay automatically as 25% of basic pay
        self.overtime_pay = Decimal(float(self.basic_salary or 0) * 0.25).quantize(Decimal('0.01'))

        # Calculate totals
        total_earnings = (
            float(self.standard_pay or 0) +
            float(self.basic_salary or 0) +
            float(self.overtime_pay or 0) +
            float(self.night_differential or 0) +
            float(self.ndot or 0) +
            float(self.rest_day or 0) +
            float(self.rest_day_ot or 0) +
            float(self.rest_day_nd or 0) +
            float(self.rest_day_ndot or 0) +
            float(self.special_holiday or 0) +
            float(self.special_holiday_ot or 0) +
            float(self.special_holiday_nd or 0) +
            float(self.special_holiday_ndot or 0) +
            float(self.legal_holiday or 0) +
            float(self.legal_holiday_ot or 0) +
            float(self.legal_holiday_nd or 0) +
            float(self.legal_holiday_ndot or 0) +
            float(self.legal_holiday_rd or 0) +
            float(self.legal_holiday_rdot or 0) +
            float(self.legal_holiday_rdnd or 0) +
            float(self.legal_holiday_rdndot or 0) +
            float(self.incentives or 0) +
            float(self.adjustment or 0) +
            float(self.gas or 0) +
            float(self.load or 0) +
            float(self.other_allowance or 0) +
            float(self.rewards_adjustments or 0) +
            float(self.kpi or 0) +
            float(self.allowances or 0)
        )

        total_deductions_list = [
            float(self.late or 0),
            float(self.sss_deduction or 0),
            float(self.philhealth_deduction or 0),
            float(self.pagibig_deduction or 0),
            float(self.id_deduction or 0),
            float(self.uniform or 0),
            float(self.insurance or 0),
            float(self.surety_bond or 0),
            float(self.convenience_fee or 0),
            float(self.general_deduction or 0),
        ]

        deduction_data = self.deduction_details
        if isinstance(deduction_data, dict):
            total_deductions_list.append(sum(float(value or 0) for value in deduction_data.values()))
        elif isinstance(deduction_data, (list, tuple)):
            total_deductions_list.append(sum(float(value or 0) for value in deduction_data))
        elif isinstance(deduction_data, (int, float, Decimal)):
            total_deductions_list.append(float(deduction_data))
        elif isinstance(deduction_data, str):
            try:
                parsed = json.loads(deduction_data)
                if isinstance(parsed, dict):
                    total_deductions_list.append(sum(float(value or 0) for value in parsed.values()))
                elif isinstance(parsed, (list, tuple)):
                    total_deductions_list.append(sum(float(value or 0) for value in parsed))
                else:
                    total_deductions_list.append(float(parsed))
            except (ValueError, TypeError, json.JSONDecodeError):
                pass

        total_deductions = sum(total_deductions_list)

        self.net_pay = Decimal(total_earnings - total_deductions).quantize(Decimal('0.01'))
        super().save(*args, **kwargs)


# ===================== EDIT REQUEST =====================

class EditRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE)

    requested_data = models.JSONField()  # ALL fields (text + file names)
    uploaded_files = models.FileField(upload_to='edit_requests/', null=True, blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    notes = models.TextField(blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.employee.full_name} - {self.status}"


# ===================== LEAVE REQUEST =====================

class LeaveRequest(models.Model):
    # Inform static type checkers that an auto-generated primary key exists
    id: int
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='leave_requests')

    # Leave details
    leave_type = models.CharField(max_length=50, default='Vacation')
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.TextField(blank=True, null=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    notes = models.TextField(blank=True, null=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.employee.full_name} - {self.leave_type} - {self.status}"


# Attachments for leave requests
class LeaveAttachment(models.Model):
    # Inform static type checkers that an auto-generated primary key exists
    id: int
    leave_request = models.ForeignKey(LeaveRequest, on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to='leave_attachments/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        # Use getattr to avoid static-analysis complaints about dynamic model attributes
        try:
            lr = getattr(self, 'leave_request', None)
            lr_id = getattr(lr, 'id', None) if lr is not None else None
            fname = getattr(self.file, 'name', None) if getattr(self, 'file', None) else None
            if lr_id and fname:
                return f"Leave {lr_id} - {fname}"
        except Exception:
            pass
        return f"LeaveAttachment {getattr(self, 'id', '')}"

# ===================== ACTIVITY LOG =====================

class ActivityLog(models.Model):
    """Track all employee, HR, and Admin activities"""

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, null=True, blank=True, related_name='activity_logs')
    
    role = models.CharField(max_length=20, choices=[
        ('Employee', 'Employee'),
        ('HR', 'HR'),
        ('Admin', 'Admin'),
    ], default='Employee')
    
    # Free-form action key (e.g. clock_in, approve_request, submit_leave_request)
    action = models.CharField(max_length=50)
    details = models.TextField(blank=True)
    
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.role} - {self.action} - {self.created_at}"


# ===================== SECURITY ALERT =====================

class SecurityAlert(models.Model):
    """Track security alerts including login attempts"""
    
    ALERT_TYPE_CHOICES = [
        ('login_attempt', 'Login Attempt'),
        ('failed_login', 'Failed Login'),
        ('suspicious_login', 'Suspicious Login'),
        ('account_locked', 'Account Locked'),
        ('account_disabled', 'Account Disabled'),
        ('multiple_attempts', 'Multiple Login Attempts'),
    ]

    SEVERITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, null=True, blank=True)
    
    alert_type = models.CharField(max_length=30, choices=ALERT_TYPE_CHOICES)
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, default='low')
    
    message = models.TextField()
    details = models.JSONField(default=dict)  # Store extra info like IP, location, etc.
    
    is_resolved = models.BooleanField(default=False)
    resolved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='resolved_alerts')
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.alert_type} - {self.severity} - {self.created_at}"


# ===================== PERMANENT IMAGE STORAGE =====================

def saved_image_path(instance, filename):
    """Generate permanent path for saved images"""
    ext = filename.split('.')[-1] if '.' in filename else 'jpg'
    emp_id = instance.employee.employee_id or instance.employee.id
    import datetime
    ts = instance.created_at.strftime('%Y%m%d_%H%M%S') if instance.created_at else datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
    return f'saved_images/{emp_id}/{instance.image_type}/{ts}.{ext}'


class SavedImage(models.Model):
    """
    Permanent storage for all employee images.
    Images stored here are retained until explicitly deleted.
    This prevents image loss when editing profiles, approving requests, or deleting temporary records.
    """
    
    IMAGE_TYPE_CHOICES = [
        ('profile', 'Profile Picture'),
        ('edit_request', 'Edit Request Image'),
        ('clock_in', 'Clock In'),
        ('clock_out', 'Clock Out'),
        ('leave_attachment', 'Leave Request Attachment'),
        ('payslip', 'Payslip'),
    ]
    
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='saved_images')
    image = models.ImageField(upload_to=saved_image_path)
    image_type = models.CharField(max_length=20, choices=IMAGE_TYPE_CHOICES)
    
    # Binary data storage for database persistence
    image_data = models.BinaryField(null=True, blank=True)
    content_type = models.CharField(max_length=100, null=True, blank=True)
    original_filename = models.CharField(max_length=255, null=True, blank=True)
    
    # Link to original request/record (optional, for reference)
    edit_request = models.ForeignKey(EditRequest, on_delete=models.SET_NULL, null=True, blank=True, related_name='saved_images')
    attendance = models.ForeignKey(Attendance, on_delete=models.SET_NULL, null=True, blank=True, related_name='saved_images')
    leave_attachment = models.ForeignKey(LeaveAttachment, on_delete=models.SET_NULL, null=True, blank=True, related_name='saved_images')
    
    # Status tracking
    is_active = models.BooleanField(default=True)  # Can be soft-deleted
    is_approved = models.BooleanField(default=False)  # For edit requests/leave requests
    
    description = models.TextField(blank=True)  # Additional metadata
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['employee', 'image_type']),
            models.Index(fields=['employee', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.employee.full_name} - {self.image_type} - {self.created_at.strftime('%Y-%m-%d')}"
    
    def save(self, *args, **kwargs):
        """
        Persist image bytes into PostgreSQL image_data field so images survive
        Render's ephemeral filesystem wipes on redeploy/restart.
        """
        if self.image and not self.image_data:
            try:
                # 1. Try to read from the underlying file object (works before save to disk)
                raw_file = getattr(self.image, 'file', None)
                data = None

                if raw_file:
                    try:
                        # Ensure we are at the start
                        if hasattr(raw_file, 'seek'):
                            raw_file.seek(0)
                        data = raw_file.read()
                        # If it's a stream, we might need to seek back for Django's save
                        if hasattr(raw_file, 'seek'):
                            raw_file.seek(0)
                    except Exception:
                        data = None

                # 2. Fallback: Open by name (if already on disk)
                if not data:
                    try:
                        self.image.open('rb')
                        data = self.image.read()
                        self.image.close()
                    except Exception:
                        data = None

                if data:
                    self.image_data = data
                    # Auto-detect content type if not set
                    if not self.content_type:
                        content_type = getattr(raw_file, 'content_type', None)
                        if content_type:
                            self.content_type = content_type
                        else:
                            # Simple extension-based guess
                            ext = os.path.splitext(self.image.name)[1].lower()
                            types = {'.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif'}
                            self.content_type = types.get(ext, 'image/jpeg')

                if not self.original_filename:
                    self.original_filename = os.path.basename(self.image.name)

            except Exception as e:
                print(f"[SavedImage] Error reading image bytes for DB storage: {e}")

        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        """Delete the image file when deleting the record"""
        if self.image:
            try:
                self.image.delete(save=False)
            except Exception:
                pass
        super().delete(*args, **kwargs)


# ===================== SIGNALS FOR PERMANENT BACKUP =====================

from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=Employee)
def backup_employee_profile_image(sender, instance, created, **kwargs):
    """Backup employee profile image to SavedImage whenever it's updated.
    Reads bytes directly from the image field so they persist in PostgreSQL.
    """
    if not instance.profile_image:
        return

    # Read bytes so they land in image_data (DB-persistent)
    data = None
    try:
        raw = getattr(instance.profile_image, 'file', None)
        if raw is not None:
            raw.seek(0)
            data = raw.read()
    except Exception:
        data = None

    if not data:
        try:
            instance.profile_image.open('rb')
            data = instance.profile_image.read()
            instance.profile_image.close()
        except Exception:
            data = None

    if not data:
        return

    # Check if there is already a SavedImage with the exact same bytes for this employee
    # to avoid duplicate backups of the same image
    latest_saved = SavedImage.objects.filter(
        employee=instance,
        image_type='profile'
    ).order_by('-id').first()

    if latest_saved and latest_saved.image_data == data:
        return # already backed up this exact image

    try:
        fname = os.path.basename(instance.profile_image.name)
        saved = SavedImage(
            employee=instance,
            image=instance.profile_image,
            image_type='profile',
            original_filename=fname,
            description=f"Auto-backup of profile image for {instance.full_name}",
        )
        saved.image_data = data
        saved.save()
    except Exception as e:
        print(f"[signal] Error auto-backing up profile image: {e}")

def _read_image_bytes(image_field):
    """
    Try to read bytes from an ImageField/FileField; returns bytes or None.
    This is critical for persisting images in PostgreSQL BinaryField.
    """
    if not image_field:
        return None
    data = None
    try:
        # 1. Try reading from the underlying file object (e.g. UploadedFile)
        # This is fastest and works before save to disk.
        raw = getattr(image_field, 'file', None)
        if raw:
            try:
                if hasattr(raw, 'seek'):
                    raw.seek(0)
                data = raw.read()
                if hasattr(raw, 'seek'):
                    raw.seek(0) # reset for other uses
            except Exception:
                data = None
        
        # 2. Fallback: Try opening the file (if it's already on disk)
        if not data:
            try:
                image_field.open('rb')
                data = image_field.read()
                image_field.close()
            except Exception:
                data = None
    except Exception as e:
        print(f"[models] Critical error in _read_image_bytes: {e}")
        data = None
    return data or None


@receiver(post_save, sender=Attendance)
def backup_attendance_images(sender, instance, created, **kwargs):
    """Backup clock in/out images to SavedImage with binary data in PostgreSQL."""

    # --- Clock-in ---
    if instance.clock_in_image:
        fname_in = os.path.basename(instance.clock_in_image.name)
        existing_in = SavedImage.objects.filter(
            employee=instance.employee,
            image_type='clock_in',
            attendance=instance,
            original_filename=fname_in,
        ).exists()

        if not existing_in:
            try:
                data_in = _read_image_bytes(instance.clock_in_image)
                saved_in = SavedImage(
                    employee=instance.employee,
                    image=instance.clock_in_image,
                    image_type='clock_in',
                    attendance=instance,
                    original_filename=fname_in,
                    description=f"Clock-in image for {instance.employee.full_name} on {instance.date}",
                )
                if data_in:
                    saved_in.image_data = data_in
                saved_in.save()
            except Exception as e:
                print(f"[signal] Error backing up clock-in image: {e}")

    # --- Clock-out ---
    if instance.clock_out_image:
        fname_out = os.path.basename(instance.clock_out_image.name)
        existing_out = SavedImage.objects.filter(
            employee=instance.employee,
            image_type='clock_out',
            attendance=instance,
            original_filename=fname_out,
        ).exists()

        if not existing_out:
            try:
                data_out = _read_image_bytes(instance.clock_out_image)
                saved_out = SavedImage(
                    employee=instance.employee,
                    image=instance.clock_out_image,
                    image_type='clock_out',
                    attendance=instance,
                    original_filename=fname_out,
                    description=f"Clock-out image for {instance.employee.full_name} on {instance.date}",
                )
                if data_out:
                    saved_out.image_data = data_out
                saved_out.save()
            except Exception as e:
                print(f"[signal] Error backing up clock-out image: {e}")

@receiver(post_save, sender=LeaveAttachment)
def backup_leave_attachment(sender, instance, created, **kwargs):
    """Backup leave attachments to SavedImage with binary data in PostgreSQL."""
    if not instance.file:
        return

    fname = os.path.basename(instance.file.name)
    existing = SavedImage.objects.filter(
        employee=instance.leave_request.employee,
        image_type='leave_attachment',
        leave_attachment=instance,
        original_filename=fname,
    ).exists()

    if not existing:
        try:
            data = _read_image_bytes(instance.file)
            lr = getattr(instance, 'leave_request', None)
            emp = getattr(lr, 'employee', None)
            emp_full = getattr(emp, 'full_name', getattr(instance, 'employee', None) and getattr(instance.employee, 'full_name', 'Unknown'))
            lr_id = getattr(lr, 'id', '')
            employee_obj = emp or (getattr(instance, 'leave_request', None) and getattr(instance.leave_request, 'employee', None)) or getattr(instance, 'employee', None)
            saved = SavedImage(
                employee=employee_obj,
                image=instance.file,
                image_type='leave_attachment',
                leave_attachment=instance,
                original_filename=fname,
                description=f"Leave attachment for {emp_full} (Request #{lr_id})",
            )
            if data:
                saved.image_data = data
            saved.save()
        except Exception as e:
            print(f"[signal] Error backing up leave attachment: {e}")

@receiver(post_save, sender=EditRequest)
def backup_edit_request_image(sender, instance, created, **kwargs):
    """Backup edit request images to SavedImage with binary data in PostgreSQL."""
    if not instance.uploaded_files:
        return

    fname = os.path.basename(instance.uploaded_files.name)
    existing = SavedImage.objects.filter(
        employee=instance.employee,
        image_type='edit_request',
        edit_request=instance,
        original_filename=fname,
    ).exists()

    if not existing:
        try:
            data = _read_image_bytes(instance.uploaded_files)
            saved = SavedImage(
                employee=instance.employee,
                image=instance.uploaded_files,
                image_type='edit_request',
                edit_request=instance,
                original_filename=fname,
                description=f"Edit request attachment for {instance.employee.full_name}",
            )
            if data:
                saved.image_data = data
            saved.save()
        except Exception as e:
            print(f"[signal] Error backing up edit request image: {e}")

@receiver(post_save, sender=Payroll)
def backup_payroll_payslip(sender, instance, created, **kwargs):
    """Backup payroll payslip images to SavedImage with binary data in PostgreSQL."""
    if not instance.payslip_image:
        return

    fname = os.path.basename(instance.payslip_image.name)
    existing = SavedImage.objects.filter(
        employee=instance.employee,
        image_type='payslip',
        original_filename=fname,
    ).exists()

    if not existing:
        try:
            data = _read_image_bytes(instance.payslip_image)
            saved = SavedImage(
                employee=instance.employee,
                image=instance.payslip_image,
                image_type='payslip',
                original_filename=fname,
                description=f"Payslip for {instance.employee.full_name} (Period: {instance.period_start} to {instance.period_end})",
            )
            if data:
                saved.image_data = data
            saved.save()
        except Exception as e:
            print(f"[signal] Error backing up payslip image: {e}")


# =============================================================================
# PAYMENT ACCOUNT MODEL
# =============================================================================

class PaymentAccount(models.Model):
    ACCOUNT_TYPE_CHOICES = [
        ('Maya', 'Maya'),
        ('GCash', 'GCash'),
        ('Bank Card', 'Bank Card'),
        ('Credit Card/Debit Card', 'Credit Card/Debit Card'),
    ]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='payment_accounts')
    account_name = models.CharField(max_length=150, blank=True, help_text="Account Holder Name")
    account_number = models.CharField(max_length=100, help_text="Mobile number, Bank Account, or Card number")
    account_type = models.CharField(max_length=50, choices=ACCOUNT_TYPE_CHOICES)
    bank_name = models.CharField(max_length=100, blank=True, null=True, help_text="Bank/Provider Name (e.g. BDO, BPI, UnionBank)")
    qr_code = models.ImageField(upload_to='payment_qr_codes/', null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['employee', 'account_type']),
            models.Index(fields=['account_type']),
        ]

    def __str__(self):
        return f"{self.employee.full_name} - {self.account_type} ({self.account_number})"


@receiver(post_save, sender=PaymentAccount)
def backup_payment_qr_code(sender, instance, created, **kwargs):
    """Backup payment account QR code images to SavedImage with binary data."""
    if not instance.qr_code:
        return

    fname = os.path.basename(instance.qr_code.name)
    existing = SavedImage.objects.filter(
        employee=instance.employee,
        image_type='payment_qr',
        original_filename=fname,
    ).exists()

    if not existing:
        try:
            data = _read_image_bytes(instance.qr_code)
            saved = SavedImage(
                employee=instance.employee,
                image=instance.qr_code,
                image_type='payment_qr',
                original_filename=fname,
                description=f"Payment QR Code ({instance.account_type}) for {instance.employee.full_name}",
            )
            if data:
                saved.image_data = data
            saved.save()
        except Exception as e:
            print(f"[signal] Error backing up payment QR code: {e}")

