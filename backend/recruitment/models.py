from django.db import models
from django.utils import timezone
import uuid


class Applicant(models.Model):
    first_name = models.CharField(max_length=100)
    middle_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100)
    dob = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=20, blank=True)
    nationality = models.CharField(max_length=50, blank=True)
    marital_status = models.CharField(max_length=50, blank=True)
    place_of_birth = models.CharField(max_length=200, blank=True)

    email = models.EmailField()
    contact_number = models.CharField(max_length=20, blank=True)
    current_address = models.TextField(blank=True)
    permanent_address = models.TextField(blank=True)
    emergency_name = models.CharField(max_length=200, blank=True)
    emergency_number = models.CharField(max_length=20, blank=True)
    emergency_relationship = models.CharField(max_length=100, blank=True)

    tin = models.CharField(max_length=50, blank=True)
    sss = models.CharField(max_length=50, blank=True)
    philhealth = models.CharField(max_length=50, blank=True)
    pagibig = models.CharField(max_length=50, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"


class Application(models.Model):
    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Under Review', 'Under Review'),
        ('Interview', 'Interview'),
        ('Approved', 'Approved'),
        ('Rejected', 'Rejected'),
        ('Withdrawn', 'Withdrawn'),
    ]

    reference_number = models.CharField(max_length=50, unique=True, default=uuid.uuid4)
    applicant = models.ForeignKey(Applicant, on_delete=models.CASCADE, related_name='applications')
    position = models.CharField(max_length=100)
    employment_type = models.CharField(max_length=50, blank=True)
    preferred_hub = models.CharField(max_length=200, blank=True)
    preferred_start_date = models.DateField(null=True, blank=True)
    driver_info = models.JSONField(null=True, blank=True)
    education = models.JSONField(null=True, blank=True)
    skills = models.JSONField(null=True, blank=True)
    employment_history = models.JSONField(null=True, blank=True)
    rejection_notes = models.TextField(blank=True, null=True)

    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='Pending')
    applied_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.reference_number} - {self.applicant}"


def application_document_upload_to(instance, filename):
    return f"applications/{instance.application.reference_number}/{filename}"


class Document(models.Model):
    application = models.ForeignKey(Application, on_delete=models.CASCADE, related_name='documents')
    file = models.FileField(upload_to=application_document_upload_to)
    label = models.CharField(max_length=100, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.label} ({self.application.reference_number})"
