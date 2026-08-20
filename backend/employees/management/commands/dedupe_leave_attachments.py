from django.core.management.base import BaseCommand
from employees.models import LeaveRequest, LeaveAttachment, SavedImage
from django.db import transaction
import os

class Command(BaseCommand):
    help = 'Detect and optionally remove duplicate LeaveAttachment and SavedImage records grouped by leave request and filename basename.'

    def add_arguments(self, parser):
        parser.add_argument('--apply', action='store_true', help='Actually delete duplicates. Without this flag, runs as dry-run and prints what would be removed.')

    def handle(self, *args, **options):
        apply_changes = options.get('apply', False)
        total_dup_attachments = 0
        total_dup_saved = 0

        self.stdout.write('Scanning leave requests for duplicate attachments...')
        for lr in LeaveRequest.objects.all():
            attachments = list(LeaveAttachment.objects.filter(leave_request=lr).order_by('id'))
            seen = {}
            dup_attach_ids = []
            for att in attachments:
                basename = os.path.basename(att.file.name) if att.file else None
                key = basename or att.id
                if key in seen:
                    dup_attach_ids.append(att.id)
                else:
                    seen[key] = att.id

            if dup_attach_ids:
                total_dup_attachments += len(dup_attach_ids)
                self.stdout.write(f'LeaveRequest {lr.id}: duplicate LeaveAttachment ids: {dup_attach_ids}')
                if apply_changes:
                    with transaction.atomic():
                        LeaveAttachment.objects.filter(id__in=dup_attach_ids).delete()

            # Now check SavedImage duplicates for this employee + leave_request
            saved_qs = SavedImage.objects.filter(leave_attachment__leave_request=lr).order_by('id')
            seen_saved = {}
            dup_saved_ids = []
            for sv in saved_qs:
                img_name = os.path.basename(sv.image.name) if sv.image else None
                key = img_name or sv.id
                if key in seen_saved:
                    dup_saved_ids.append(sv.id)
                else:
                    seen_saved[key] = sv.id

            if dup_saved_ids:
                total_dup_saved += len(dup_saved_ids)
                self.stdout.write(f'LeaveRequest {lr.id}: duplicate SavedImage ids: {dup_saved_ids}')
                if apply_changes:
                    with transaction.atomic():
                        SavedImage.objects.filter(id__in=dup_saved_ids).delete()

        self.stdout.write(self.style.SUCCESS(f'Scan complete. Duplicate LeaveAttachment records found: {total_dup_attachments}, SavedImage duplicates found: {total_dup_saved}'))
        if not apply_changes:
            self.stdout.write('Dry-run only. Rerun with --apply to delete duplicates.')
