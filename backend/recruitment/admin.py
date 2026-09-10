from django.contrib import admin
from .models import Applicant, Application, Document


class DocumentInline(admin.TabularInline):
    model = Document
    extra = 0


@admin.register(Applicant)
class ApplicantAdmin(admin.ModelAdmin):
    list_display = ('first_name', 'last_name', 'email', 'contact_number', 'created_at')
    search_fields = ('first_name', 'last_name', 'email', 'contact_number')


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ('reference_number', 'applicant', 'position', 'preferred_hub', 'status', 'applied_at')
    list_filter = ('status', 'position', 'preferred_hub', 'applied_at')
    search_fields = ('reference_number', 'applicant__first_name', 'applicant__last_name', 'applicant__email')
    inlines = [DocumentInline]


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ('label', 'application', 'uploaded_at')
