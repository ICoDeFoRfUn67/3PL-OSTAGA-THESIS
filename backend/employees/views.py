from rest_framework import viewsets, status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.authtoken.models import Token
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.utils import timezone
from django.conf import settings
from django.db import models
from django.db.models import Count, Prefetch
from django.http import HttpResponse, Http404
import os
import json
from .models import Hub, Employee, EditRequest, LeaveRequest, Attendance, LiveLocation, Payroll, EmployeeDocument, ActivityLog, SecurityAlert, HRPermission, SavedImage

def apply_hr_hub_filter(queryset, user, hub_field='hub'):
    """Filter queryset by managed hubs if user is HR."""
    if not user.is_authenticated:
        return queryset
    emp = getattr(user, 'employee', None)
    if emp and emp.role == 'HR':
        try:
            hr_perms = emp.hr_permissions
            managed_hubs = hr_perms.managed_hubs.all()
            if hr_perms.access_type == 'Single' and not managed_hubs.exists() and emp.hub:
                return queryset.filter(**{f"{hub_field}": emp.hub})
            elif managed_hubs.exists():
                return queryset.filter(**{f"{hub_field}__in": managed_hubs})
            else:
                return queryset.none()
        except Exception:
            return queryset.none()
    return queryset


def get_managed_hub_ids(user):
    """Return hub IDs an HR user manages, [] if HR has none, None for non-HR."""
    emp = getattr(user, 'employee', None)
    if not emp or emp.role != 'HR':
        return None
    try:
        hr_perms = emp.hr_permissions
        hub_ids = list(hr_perms.managed_hubs.values_list('id', flat=True))
        if not hub_ids and emp.hub_id:
            hub_ids = [emp.hub_id]
        return hub_ids
    except Exception:
        return [emp.hub_id] if emp.hub_id else []

from .serializers import (
    HubSerializer, EmployeeSerializer, EmployeeListSerializer, EmployeeCreateSerializer, EmployeeDocumentSerializer,
    EditRequestSerializer, LeaveRequestSerializer, LoginSerializer, AttendanceSerializer, 
    LiveLocationSerializer, PayrollSerializer, ActivityLogSerializer, SecurityAlertSerializer, HRPermissionSerializer
)

from datetime import timedelta
import csv
import io
from datetime import date as date_cls, datetime
try:
    import openpyxl
except Exception:
    openpyxl = None

try:
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas
except Exception:
    # reportlab optional
    letter = None
    canvas = None

def _client_ip(request):
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    if xff:
        return xff.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def _request_actor_role(request):
    try:
        return Employee.objects.get(user=request.user).role
    except Employee.DoesNotExist:
        if request.user.is_superuser:
            return 'Admin'
        if request.user.is_staff:
            return 'HR'
        return 'Employee'


class HubViewSet(viewsets.ModelViewSet):
    """ViewSet for viewing and editing hubs - J&T Quezon only"""
    queryset = Hub.objects.all().order_by('name')
    serializer_class = HubSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        qs = Hub.objects.annotate(_employee_count=Count('employees')).order_by('name')
        return apply_hr_hub_filter(qs, self.request.user, hub_field='id')

class MetaView(APIView):
    """Meta endpoint for frontend form option data."""
    permission_classes = [IsAuthenticated]

    def get(self, request, key=None):
        meta_data = {
            'roles': [choice[0] for choice in Employee.ROLE_CHOICES],
            'statuses': [choice[0] for choice in Employee.STATUS_CHOICES],
            'employmentTypes': [choice[0] for choice in Employee.EMPLOYMENT_TYPE_CHOICES],
            'positions': list(Employee.objects.order_by('position').values_list('position', flat=True).distinct()),
            'hubs': HubSerializer(
                apply_hr_hub_filter(Hub.objects.order_by('name'), request.user, hub_field='id'),
                many=True,
                context={'request': request}
            ).data,
        }

        # Attempt to load a philippine locations JSON file from project root.
        # File path: <BASE_DIR>/philippine_locations.json
        try:
            locations_path = os.path.join(settings.BASE_DIR, 'philippine_locations.json')
            if os.path.exists(locations_path):
                with open(locations_path, 'r', encoding='utf-8') as f:
                    try:
                        loc_data = json.load(f)
                        meta_data['locations'] = loc_data
                    except Exception:
                        meta_data['locations'] = {}
            else:
                meta_data['locations'] = {}
        except Exception:
            meta_data['locations'] = {}

        if key:
            if key not in meta_data:
                return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
            if key == 'positions' and not meta_data['positions']:
                meta_data['positions'] = ['Sorter', 'Admin', 'HR', 'Rider' ,'Courier']
            return Response(meta_data[key])

        if not meta_data['positions']:
            meta_data['positions'] = ['Sorter', 'Admin', 'HR', 'Rider' ,'Courier']
        return Response(meta_data)

class EmployeeViewSet(viewsets.ModelViewSet):
    """ViewSet for viewing and editing employees"""
    queryset = Employee.objects.all()
    permission_classes = [IsAuthenticated]  # Require login for updates
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    pagination_class = None
    
    def get_serializer_class(self):
        if self.action == 'create':
            return EmployeeCreateSerializer
        if self.action == 'list':
            return EmployeeListSerializer
        return EmployeeSerializer
    
    def update(self, request, *args, **kwargs):
        """Handle full update with activity logging.

        Uses EmployeeCreateSerializer for input normalization (handles multipart
        QueryDicts and camelCase -> snake_case mappings) then returns the
        canonical EmployeeSerializer representation.
        """
        employee = self.get_object()
        old_data = EmployeeSerializer(employee, context={'request': request}).data

        # Use create serializer for input normalization (to_internal_value)
        input_serializer = EmployeeCreateSerializer(instance=employee, data=request.data, partial=False, context={'request': request})
        input_serializer.is_valid(raise_exception=True)
        input_serializer.save()

        # Re-serialize with the full EmployeeSerializer for consistent response
        output_serializer = EmployeeSerializer(employee, context={'request': request})
        response_data = output_serializer.data

        # Log the update
        changes = self._get_field_changes(old_data, response_data)
        if changes:
            ActivityLog.objects.create(
                user=request.user,
                employee=employee,
                role=getattr(request.user, 'employee', None).role if hasattr(request.user, 'employee') else 'Admin',
                action='update_employee',
                details=f'Updated {employee.full_name}: {changes}',
                ip_address=self.get_client_ip(request)
            )

        return Response(response_data)
    
    def partial_update(self, request, *args, **kwargs):
        """Handle partial update with activity logging.

        Uses EmployeeCreateSerializer for input normalization (handles multipart
        QueryDicts and camelCase -> snake_case mappings) then returns the
        canonical EmployeeSerializer representation.
        """
        employee = self.get_object()
        old_data = EmployeeSerializer(employee, context={'request': request}).data

        input_serializer = EmployeeCreateSerializer(instance=employee, data=request.data, partial=True, context={'request': request})
        input_serializer.is_valid(raise_exception=True)
        input_serializer.save()

        output_serializer = EmployeeSerializer(employee, context={'request': request})
        response_data = output_serializer.data

        # Log the update
        changes = self._get_field_changes(old_data, response_data)
        if changes:
            ActivityLog.objects.create(
                user=request.user,
                employee=employee,
                role=getattr(request.user, 'employee', None).role if hasattr(request.user, 'employee') else 'Admin',
                action='update_employee',
                details=f'Updated {employee.full_name}: {changes}',
                ip_address=self.get_client_ip(request)
            )

        return Response(response_data)
    
    def _get_field_changes(self, old_data: dict, new_data: dict) -> str:
        """Compare old and new data and return formatted changes"""
        changes = []
        important_fields = ['status', 'role', 'can_login', 'can_edit_info', 'is_active', 
                           'position', 'employment_type', 'email_address', 'hub']
        
        for field in important_fields:
            if field in old_data and field in new_data:
                if old_data[field] != new_data[field]:
                    changes.append(f"{field}: {old_data[field]} → {new_data[field]}")
        
        return '; '.join(changes) if changes else 'No significant changes'

    def create(self, request, *args, **kwargs):
        """Handle employee creation with activity logging"""
        requester = getattr(request.user, 'employee', None) if hasattr(request.user, 'employee') else None
        request_role = requester.role if requester else ('Admin' if request.user.is_superuser else 'Employee')
        if request_role == 'HR':
            target_role = request.data.get('role', 'Employee')
            if target_role in ['Admin', 'HR']:
                return Response({'error': 'HR cannot create Admin or HR accounts.'}, status=status.HTTP_403_FORBIDDEN)

        response = super().create(request, *args, **kwargs)

        try:
            employee = Employee.objects.get(id=response.data['id'])
            ActivityLog.objects.create(
                user=request.user,
                employee=employee,
                role=getattr(request.user, 'employee', None).role if hasattr(request.user, 'employee') else 'Admin',
                action='create_employee',
                details=f'Created new employee: {employee.full_name}',
                ip_address=self.get_client_ip(request)
            )
        except Employee.DoesNotExist:
            pass

        return response

    def destroy(self, request, *args, **kwargs):
        """Override delete to ensure associated User is also deleted"""
        instance = self.get_object()
        user = instance.user
        
        # Log the deletion before it's gone
        ActivityLog.objects.create(
            user=request.user,
            employee=None, # Employee will be deleted
            role=_request_actor_role(request),
            action='delete_employee',
            details=f'Deleted employee: {instance.full_name} (ID: {instance.employee_id})',
            ip_address=_client_ip(request),
        )

        # Delete the user if it exists (which cascades to employee)
        # or delete the employee instance directly
        if user:
            user.delete()
        else:
            instance.delete()
            
        return Response(status=status.HTTP_204_NO_CONTENT)

    def get_queryset(self):
        queryset = Employee.objects.all().select_related('hub', 'user')
        if getattr(self, 'action', None) == 'list':
            queryset = queryset.prefetch_related(
                Prefetch(
                    'saved_images',
                    queryset=SavedImage.objects.filter(image_type='profile').order_by('-id').only('id', 'employee_id'),
                )
            )
        queryset = apply_hr_hub_filter(queryset, self.request.user, hub_field='hub')
        hub_id = self.request.query_params.get('hub_id')
        if hub_id:
            try:
                hub_id_int = int(hub_id)
                queryset = queryset.filter(hub_id=hub_id_int)
            except (ValueError, TypeError):
                print(f"⚠️ Invalid hub_id: {hub_id}")
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        employment_type = self.request.query_params.get('employment_type')
        if employment_type:
            queryset = queryset.filter(employment_type=employment_type)
        # Role inclusion/exclusion filters
        role = self.request.query_params.get('role')
        exclude_role = self.request.query_params.get('exclude_role')
        if role:
            queryset = queryset.filter(role=role)
        if exclude_role:
            # Exclude alerts belonging to certain employee roles (comma-separated)
            roles = [r.strip() for r in exclude_role.split(',') if r.strip()]
            if roles:
                queryset = queryset.exclude(role__in=roles)
        # Server-side: if requesting user is HR, automatically exclude Admin employees
        try:
            user_employee = getattr(self.request.user, 'employee', None)
            if user_employee and getattr(user_employee, 'role', '').lower() == 'hr':
                queryset = queryset.exclude(role__iexact='admin')
        except Exception:
            pass
        return queryset

    @action(detail=False, methods=['post'])
    def bulk_toggle_login(self, request):
        """Bulk toggle can_login for multiple employee IDs"""
        employee_ids = request.data.get('employee_ids', [])
        new_status = request.data.get('can_login', False)

        updated_count = 0
        for emp_id in employee_ids:
            try:
                employee = Employee.objects.get(id=emp_id)
                employee.can_login = new_status
                employee.save()
                updated_count += 1
            except Employee.DoesNotExist:
                continue

        ActivityLog.objects.create(
            user=request.user,
            employee=None,
            role=_request_actor_role(request),
            action='bulk_toggle_login',
            details=f'Bulk set can_login={new_status} for {updated_count} account(s); ids={employee_ids}',
            ip_address=_client_ip(request),
        )

        return Response({
            'message': f'Updated {updated_count} accounts',
            'can_login': new_status
        })

    # Removed redundant reset_password action. Standalone reset_password function is used in urls.py.

    @action(detail=True, methods=['post'])
    def blacklist_employee(self, request, pk=None):
        """Blacklist an employee (change status to Blacklist)"""
        try:
            employee = self.get_object()
            reason = request.data.get('reason', 'No reason provided')

            employee.status = 'Blacklist'
            employee.can_login = False
            employee.save()

            SecurityAlert.objects.create(
                employee=employee,
                alert_type='blacklist',
                severity='high',
                message=f'{employee.full_name} has been blacklisted',
                details={'reason': reason}
            )

            ActivityLog.objects.create(
                user=request.user,
                employee=employee,
                role='Admin',
                action='blacklist',
                details=f'Blacklisted {employee.full_name}. Reason: {reason}',
                ip_address=self.get_client_ip(request)
            )

            serializer = self.get_serializer(employee)
            return Response({
                'message': 'Employee blacklisted successfully',
                'employee': serializer.data
            })
        except Employee.DoesNotExist:
            return Response({'error': 'Employee not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'])
    def delete_employee(self, request, pk=None):
        """Permanently delete employee and all associated data"""
        try:
            employee = self.get_object()
            employee_name = employee.full_name
            employee_id = employee.id

            # Log before deletion
            ActivityLog.objects.create(
                user=request.user,
                employee=employee,
                role='Admin',
                action='employee_deleted',
                details=f'Employee {employee_name} has been permanently deleted',
                ip_address=self.get_client_ip(request)
            )

            # Delete associated user if exists
            if employee.user:
                employee.user.delete()
            else:
                # Delete employee (cascades to all related records)
                employee.delete()

            return Response({
                'message': 'Employee and associated user account deleted successfully',
                'deleted_employee': {
                    'id': employee_id,
                    'name': employee_name
                }
            })
        except Employee.DoesNotExist:
            return Response({'error': 'Employee not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'])
    def toggle_edit_permission(self, request, pk=None):
        """Toggle whether employee can edit their own information"""
        try:
            employee = self.get_object()
            can_edit = request.data.get('can_edit', True)

            employee.can_edit_info = can_edit
            employee.save()

            ActivityLog.objects.create(
                user=request.user,
                employee=employee,
                role='Admin',
                action='toggle_edit_permission',
                details=f'Edit permission set to {can_edit} for {employee.full_name}',
                ip_address=self.get_client_ip(request)
            )

            return Response({
                'message': f'Edit permission updated successfully',
                'can_edit_info': employee.can_edit_info
            })
        except Employee.DoesNotExist:
            return Response({'error': 'Employee not found'}, status=status.HTTP_404_NOT_FOUND)

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0]
        return request.META.get('REMOTE_ADDR')


def _get_online_employee_ids(window_minutes=5):
    """Return employee IDs considered online based on recent heartbeat or live location."""
    threshold = timezone.now() - timedelta(minutes=window_minutes)

    recent_location_emp_ids = LiveLocation.objects.filter(
        timestamp__gte=threshold
    ).values_list('employee_id', flat=True).distinct()

    try:
        recent_activity_emp_ids = Employee.objects.filter(
            last_activity__gte=threshold
        ).values_list('id', flat=True).distinct()
    except Exception:
        recent_activity_emp_ids = []

    return set(list(recent_location_emp_ids) + list(recent_activity_emp_ids))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def online_employees(request):
    """Return employees considered online.

    Heuristic: an employee is online if they have a LiveLocation timestamp within
    the last 5 minutes or a recent heartbeat (last_activity).
    """
    try:
        window_minutes = int(request.query_params.get('minutes', 5))
    except (TypeError, ValueError):
        window_minutes = 5

    online_ids = _get_online_employee_ids(window_minutes=window_minutes)

    employees = apply_hr_hub_filter(
        Employee.objects.filter(id__in=online_ids),
        request.user,
        hub_field='hub',
    )
    serializer = EmployeeSerializer(employees, many=True, context={'request': request})

    return Response({'count': employees.count(), 'employees': serializer.data, 'ids': list(online_ids)})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def heartbeat(request):
    """Simple heartbeat endpoint: updates Employee.last_activity for the authenticated user."""
    try:
        emp = Employee.objects.get(user=request.user)
        emp.last_activity = timezone.now()
        emp.save(update_fields=['last_activity'])
        return Response({'status': 'ok', 'updated': True})
    except Employee.DoesNotExist:
        return Response({'status': 'no_employee'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """Clear online presence when the user logs out."""
    client_ip = request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0] or request.META.get('REMOTE_ADDR')
    try:
        emp = Employee.objects.get(user=request.user)
        emp.last_activity = None
        emp.save(update_fields=['last_activity'])
        ActivityLog.objects.create(
            user=request.user,
            employee=emp,
            role=emp.role,
            action='logout',
            details=f'{request.user.username} logged out from {client_ip}',
            ip_address=client_ip,
        )
    except Employee.DoesNotExist:
        pass
    return Response({'status': 'ok'})


# Helper: compute government deductions based on hub-specific rates or defaults
def compute_gov_deductions(employee: Employee, basic_salary):
    """
    Return a tuple of (sss, philhealth, pagibig) deductions (Decimal) computed
    as percentage of basic_salary. Lookup order:
      1. settings.HUB_DEDUCTION_RATES[hub.name] or [hub.location]
      2. settings.DEFAULT_GOV_RATES
      3. fallback defaults in this function
    """
    from decimal import Decimal, ROUND_HALF_UP
    # Fallback default rates (percents)
    FALLBACK = {'sss': 4.5, 'philhealth': 2.75, 'pagibig': 1.0}

    # read rates from settings if available
    rates = None
    try:
        hub = getattr(employee, 'hub', None)
        # Prefer explicit Hub model override fields when set (>0)
        if hub:
            try:
                s = float(getattr(hub, 'sss_rate', 0) or 0)
                ph = float(getattr(hub, 'philhealth_rate', 0) or 0)
                pg = float(getattr(hub, 'pagibig_rate', 0) or 0)
                if s > 0 or ph > 0 or pg > 0:
                    rates = {'sss': s or FALLBACK['sss'], 'philhealth': ph or FALLBACK['philhealth'], 'pagibig': pg or FALLBACK['pagibig']}
            except Exception:
                pass

        hub_key = None
        if hub and not rates:
            hub_key = getattr(hub, 'name', None) or getattr(hub, 'location', None)
        cfg = getattr(settings, 'HUB_DEDUCTION_RATES', None)
        default_cfg = getattr(settings, 'DEFAULT_GOV_RATES', None)
        if not rates:
            if cfg and hub_key and hub_key in cfg:
                rates = cfg.get(hub_key)
            elif default_cfg:
                rates = default_cfg
    except Exception:
        rates = None

    if not rates:
        rates = FALLBACK

    try:
        bs = float(basic_salary or 0)
    except Exception:
        bs = 0.0

    sss = Decimal(str(round(bs * (float(rates.get('sss', FALLBACK['sss'])) / 100.0), 2))).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    phil = Decimal(str(round(bs * (float(rates.get('philhealth', FALLBACK['philhealth'])) / 100.0), 2))).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    pagibig = Decimal(str(round(bs * (float(rates.get('pagibig', FALLBACK['pagibig'])) / 100.0), 2))).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    return sss, phil, pagibig


def compute_payroll_summary(employee: Employee, start_date, end_date,
                            standard_pay=0.0, basic_salary=0.0, overtime_pay=0.0,
                            night_differential=0.0, ndot=0.0,
                            rest_day=0.0, rest_day_ot=0.0, rest_day_nd=0.0, rest_day_ndot=0.0,
                            special_holiday=0.0, special_holiday_ot=0.0, special_holiday_nd=0.0, special_holiday_ndot=0.0,
                            legal_holiday=0.0, legal_holiday_ot=0.0, legal_holiday_nd=0.0, legal_holiday_ndot=0.0,
                            legal_holiday_rd=0.0, legal_holiday_rdot=0.0, legal_holiday_rdnd=0.0, legal_holiday_rdndot=0.0,
                            incentives=0.0, adjustment=0.0, gas=0.0, load=0.0, other_allowance=0.0,
                            rewards_adjustments=0.0, kpi=0.0, allowances=0.0,
                            late=0.0, id_deduction=0.0, uniform=0.0, insurance=0.0, surety_bond=0.0, convenience_fee=0.0, general_deduction=0.0,
                            deduction_details=None):
    """Compute a payroll summary (not persisted) for an employee and period.

    Returns a simple dict suitable for JSON response or for serialization.
    """
    from decimal import Decimal, ROUND_HALF_UP
    from datetime import timedelta

    # Monthly cumulative logic: calculate from the 1st of the month of period_end
    from datetime import date
    cumulative_start = date(end_date.year, end_date.month, 1)
    
    # attendance aggregation (cumulative from start of month)
    qs = Attendance.objects.filter(employee=employee, date__gte=cumulative_start, date__lte=end_date)
    total_seconds = 0.0
    overtime_seconds = 0.0
    late_count = 0
    present_days = set()
    STANDARD_DAY_HOURS = 8
    LATE_HOUR = 10

    for a in qs:
        if a.clock_in_time and a.clock_out_time:
            diff = (a.clock_out_time - a.clock_in_time).total_seconds()
            if diff > 0:
                total_seconds += diff
                hours = diff / 3600.0
                if hours > STANDARD_DAY_HOURS:
                    overtime_seconds += (hours - STANDARD_DAY_HOURS) * 3600.0
        elif a.clock_in_time and not a.clock_out_time:
            # If employee clocked in but didn't clock out and the date is today, approximate until now
            try:
                from django.utils import timezone as djtz
                today = djtz.now().date()
                if a.date == today:
                    diff = (djtz.now() - a.clock_in_time).total_seconds()
                    if diff > 0:
                        total_seconds += diff
                        hours = diff / 3600.0
                        if hours > STANDARD_DAY_HOURS:
                            overtime_seconds += (hours - STANDARD_DAY_HOURS) * 3600.0
            except Exception:
                pass
        if a.clock_in_time and getattr(a.clock_in_time, 'hour', None) is not None:
            if a.clock_in_time.hour >= LATE_HOUR:
                late_count += 1
        if a.clock_in_time:
            present_days.add(a.date)

    total_hours = round(total_seconds / 3600.0, 2)
    overtime_hours = round(overtime_seconds / 3600.0, 2)

    # working weekdays count
    def count_weekdays(s, e):
        days = 0
        cur = s
        while cur <= e:
            if cur.weekday() < 5:
                days += 1
            cur += timedelta(days=1)
        return days
    working_days = count_weekdays(cumulative_start, end_date)

    # approved leave days overlapping
    leave_days = 0
    approved_leaves = LeaveRequest.objects.filter(employee=employee, status='approved')
    for lr in approved_leaves:
        ls = lr.start_date
        le = lr.end_date
        overlap_start = max(ls, cumulative_start)
        overlap_end = min(le, end_date)
        if overlap_start <= overlap_end:
            leave_days += count_weekdays(overlap_start, overlap_end)

    absences = max(0, working_days - len(present_days) - leave_days)

    # Automatically calculate overtime pay as exactly 25% of basic salary
    overtime_pay = float(basic_salary or 0) * 0.25

    # sum all itemized earnings
    total_earnings_val = (
        float(standard_pay or 0) +
        float(basic_salary or 0) +
        float(overtime_pay or 0) +
        float(night_differential or 0) +
        float(ndot or 0) +
        float(rest_day or 0) +
        float(rest_day_ot or 0) +
        float(rest_day_nd or 0) +
        float(rest_day_ndot or 0) +
        float(special_holiday or 0) +
        float(special_holiday_ot or 0) +
        float(special_holiday_nd or 0) +
        float(special_holiday_ndot or 0) +
        float(legal_holiday or 0) +
        float(legal_holiday_ot or 0) +
        float(legal_holiday_nd or 0) +
        float(legal_holiday_ndot or 0) +
        float(legal_holiday_rd or 0) +
        float(legal_holiday_rdot or 0) +
        float(legal_holiday_rdnd or 0) +
        float(legal_holiday_rdndot or 0) +
        float(incentives or 0) +
        float(adjustment or 0) +
        float(gas or 0) +
        float(load or 0) +
        float(other_allowance or 0) +
        float(rewards_adjustments or 0) +
        float(kpi or 0) +
        float(allowances or 0)
    )
    total_earnings = Decimal(str(total_earnings_val))

    # calculate government deductions
    sss_amt, phil_amt, pagibig_amt = compute_gov_deductions(employee, float(total_earnings))
    total_gov = float(sss_amt + phil_amt + pagibig_amt)

    # deduction_details may be JSON/dict/number
    total_deductions_list = [
        float(late or 0),
        float(id_deduction or 0),
        float(uniform or 0),
        float(insurance or 0),
        float(surety_bond or 0),
        float(convenience_fee or 0),
        float(general_deduction or 0),
        total_gov
    ]
    if deduction_details is None:
        deduction_details = {}
    try:
        if isinstance(deduction_details, dict):
            total_deductions_list.append(sum(float(v or 0) for v in deduction_details.values()))
        else:
            total_deductions_list.append(float(deduction_details or 0))
    except Exception:
        pass

    total_deductions = sum(total_deductions_list)
    net_pay = float((total_earnings - Decimal(str(total_deductions))).quantize(Decimal('0.01')))

    return {
        'employee': employee.id,
        'period_start': start_date,
        'period_end': end_date,
        'total_hours': total_hours,
        'overtime_hours': overtime_hours,
        'lates': late_count,
        'jtp_code': getattr(employee, 'jtp_code', 'N/A'),
        'tin': getattr(employee, 'tin', 'N/A'),
        'sss_no': getattr(employee, 'sss', 'N/A'),
        'philhealth_no': getattr(employee, 'philhealth', 'N/A'),
        'pagibig_no': getattr(employee, 'pagibig', 'N/A'),
        'absences': absences,
        'standard_pay': float(standard_pay or 0),
        'basic_salary': float(basic_salary or 0),
        'overtime_pay': float(overtime_pay or 0),
        'night_differential': float(night_differential or 0),
        'ndot': float(ndot or 0),
        'rest_day': float(rest_day or 0),
        'rest_day_ot': float(rest_day_ot or 0),
        'rest_day_nd': float(rest_day_nd or 0),
        'rest_day_ndot': float(rest_day_ndot or 0),
        'special_holiday': float(special_holiday or 0),
        'special_holiday_ot': float(special_holiday_ot or 0),
        'special_holiday_nd': float(special_holiday_nd or 0),
        'special_holiday_ndot': float(special_holiday_ndot or 0),
        'legal_holiday': float(legal_holiday or 0),
        'legal_holiday_ot': float(legal_holiday_ot or 0),
        'legal_holiday_nd': float(legal_holiday_nd or 0),
        'legal_holiday_ndot': float(legal_holiday_ndot or 0),
        'legal_holiday_rd': float(legal_holiday_rd or 0),
        'legal_holiday_rdot': float(legal_holiday_rdot or 0),
        'legal_holiday_rdnd': float(legal_holiday_rdnd or 0),
        'legal_holiday_rdndot': float(legal_holiday_rdndot or 0),
        'incentives': float(incentives or 0),
        'adjustment': float(adjustment or 0),
        'gas': float(gas or 0),
        'load': float(load or 0),
        'other_allowance': float(other_allowance or 0),
        'rewards_adjustments': float(rewards_adjustments or 0),
        'kpi': float(kpi or 0),
        'allowances': float(allowances or 0),
        'late': float(late or 0),
        'id_deduction': float(id_deduction or 0),
        'uniform': float(uniform or 0),
        'insurance': float(insurance or 0),
        'surety_bond': float(surety_bond or 0),
        'convenience_fee': float(convenience_fee or 0),
        'general_deduction': float(general_deduction or 0),
        'total_earnings': float(total_earnings),
        'deduction_details': deduction_details,
        'total_deductions': float(total_deductions),
        'sss_percent': float(getattr(settings, 'DEFAULT_GOV_RATES', {}).get('sss', 4.5)),
        'philhealth_percent': float(getattr(settings, 'DEFAULT_GOV_RATES', {}).get('philhealth', 2.75)),
        'pagibig_percent': float(getattr(settings, 'DEFAULT_GOV_RATES', {}).get('pagibig', 1.0)),
        'sss_deduction': float(sss_amt),
        'philhealth_deduction': float(phil_amt),
        'pagibig_deduction': float(pagibig_amt),
        'total_government_deductions': float(total_gov),
        'net_pay': net_pay,
    }


class AttendanceViewSet(viewsets.ModelViewSet):
    """ViewSet for attendance records - clock in/out with images"""
    serializer_class = AttendanceSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = Attendance.objects.exclude(employee__role__in=['Admin', 'HR']).select_related('employee', 'employee__hub').order_by('-date', '-clock_in_time')
        queryset = apply_hr_hub_filter(queryset, self.request.user, hub_field='employee__hub')
        hub_id = self.request.query_params.get('hub_id')
        employee_id = self.request.query_params.get('employee_id')
        date = self.request.query_params.get('date')

        if hub_id:
            queryset = queryset.filter(employee__hub_id=hub_id)
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        if date:
            queryset = queryset.filter(date=date)
        return queryset

    @action(detail=False, methods=['post'])
    def clock_in(self, request):
        employee_id = request.data.get('employee')
        image = request.FILES.get('clock_in_image')
        
        if not employee_id:
            return Response({'error': 'Employee ID required'}, status=400)
            
        try:
            today = timezone.now().date()
            attendance, created = Attendance.objects.get_or_create(
                employee_id=employee_id,
                date=today,
                defaults={'clock_in_time': timezone.now()}
            )
            if not created and attendance.clock_in_time:
                return Response({'error': 'Already clocked in today'}, status=400)

            if image:
                # Read raw bytes BEFORE saving to disk so we can persist in PostgreSQL
                image_bytes = None
                try:
                    image.seek(0)
                    image_bytes = image.read()
                    image.seek(0)  # reset so Django can also write to disk
                except Exception as e:
                    print(f"[clock_in] Warning: could not read image bytes: {e}")

                ext = image.name.split('.')[-1] if '.' in image.name else 'jpg'
                filename = f'clock_in_{employee_id}_{today}.{ext}'
                attendance.clock_in_image.save(filename, image, save=True)

                # Persist in SavedImage with binary data in PostgreSQL
                try:
                    saved = SavedImage(
                        employee_id=employee_id,
                        image=attendance.clock_in_image,
                        image_type='clock_in',
                        attendance=attendance,
                        original_filename=filename,
                        content_type=getattr(image, 'content_type', 'image/jpeg'),
                        description=f'Clock in for {today}',
                    )
                    if image_bytes:
                        saved.image_data = image_bytes
                    saved.save()
                except Exception as e:
                    print(f"[clock_in] Error saving to SavedImage: {e}")
            
            attendance.clock_in_time = timezone.now()
            attendance.status = 'Present'
            lat = request.data.get('clock_in_latitude') or request.data.get('latitude')
            lng = request.data.get('clock_in_longitude') or request.data.get('longitude')
            if lat is not None:
                attendance.clock_in_latitude = lat
            if lng is not None:
                attendance.clock_in_longitude = lng
            attendance.save()

            try:
                emp = Employee.objects.get(id=employee_id)
                ActivityLog.objects.create(
                    user=request.user,
                    employee=emp,
                    role=emp.role,
                    action='clock_in',
                    details=f'Clock in at {attendance.clock_in_time}',
                    ip_address=_client_ip(request),
                )
            except Employee.DoesNotExist:
                pass
            
            serializer = AttendanceSerializer(attendance, context={'request': request})
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=400)

    @action(detail=False, methods=['post'])
    def clock_out(self, request):
        employee_id = request.data.get('employee')
        image = request.FILES.get('clock_out_image')
        
        if not employee_id:
            return Response({'error': 'Employee ID required'}, status=400)
            
        try:
            today = timezone.now().date()
            attendance = Attendance.objects.get(
                employee_id=employee_id,
                date=today
            )
            if not attendance.clock_in_time:
                return Response({'error': 'No clock in record found'}, status=400)
                
            # Check if already clocked out today
            if attendance.clock_out_time:
                return Response({'error': 'Already clocked out today'}, status=400)
                
            if image:
                # Read raw bytes BEFORE saving to disk so we can persist in PostgreSQL
                image_bytes = None
                try:
                    image.seek(0)
                    image_bytes = image.read()
                    image.seek(0)  # reset so Django can also write to disk
                except Exception as e:
                    print(f"[clock_out] Warning: could not read image bytes: {e}")

                ext = image.name.split('.')[-1] if '.' in image.name else 'jpg'
                filename = f'clock_out_{employee_id}_{today}.{ext}'
                attendance.clock_out_image.save(filename, image, save=True)

                # Persist in SavedImage with binary data in PostgreSQL
                try:
                    saved = SavedImage(
                        employee_id=employee_id,
                        image=attendance.clock_out_image,
                        image_type='clock_out',
                        attendance=attendance,
                        original_filename=filename,
                        content_type=getattr(image, 'content_type', 'image/jpeg'),
                        description=f'Clock out for {today}',
                    )
                    if image_bytes:
                        saved.image_data = image_bytes
                    saved.save()
                except Exception as e:
                    print(f"[clock_out] Error saving to SavedImage: {e}")
            
            attendance.clock_out_time = timezone.now()
            lat = request.data.get('clock_out_latitude') or request.data.get('latitude')
            lng = request.data.get('clock_out_longitude') or request.data.get('longitude')
            if lat is not None:
                attendance.clock_out_latitude = lat
            if lng is not None:
                attendance.clock_out_longitude = lng
            attendance.save()

            try:
                emp = Employee.objects.get(id=employee_id)
                ActivityLog.objects.create(
                    user=request.user,
                    employee=emp,
                    role=emp.role,
                    action='clock_out',
                    details=f'Clock out at {attendance.clock_out_time}',
                    ip_address=_client_ip(request),
                )
            except Employee.DoesNotExist:
                pass
            
            serializer = AttendanceSerializer(attendance, context={'request': request})
            return Response(serializer.data)
        except Attendance.DoesNotExist:
            return Response({'error': 'No attendance record for today'}, status=404)
        except Exception as e:
            return Response({'error': str(e)}, status=400)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Attendance summary for today: present = clocked in; absent = active employees with no clock-in."""
        today = timezone.localdate()
        active_employees = Employee.objects.filter(status='Active')
        active_count = active_employees.count()
        present_today = (
            Attendance.objects.filter(date=today, clock_in_time__isnull=False)
            .values('employee_id')
            .distinct()
            .count()
        )
        absent_today = max(0, active_count - present_today)
        late_today = Attendance.objects.filter(
            date=today,
            clock_in_time__isnull=False,
            clock_in_time__hour__gte=10,
        ).count()
        total_records_today = Attendance.objects.filter(date=today).count()

        return Response({
            'total': total_records_today,
            'active_employees': active_count,
            'present': present_today,
            'absent': absent_today,
            'late': late_today,
        })

    @action(detail=False, methods=['get'])
    def hub_summary(self, request):
        """Attendance counts by hub for charting (read-only; does not mutate rows)."""
        date_str = request.query_params.get('date')
        target_date = timezone.localdate()
        if date_str:
            try:
                from datetime import date as date_cls
                target_date = date_cls.fromisoformat(date_str)
            except Exception:
                target_date = timezone.localdate()

        hub_stats = {}
        employees = Employee.objects.filter(status='Active').select_related('hub')
        for emp in employees:
            hub_name = emp.hub.name if emp.hub else 'Unknown'
            if hub_name not in hub_stats:
                hub_stats[hub_name] = {'present': 0, 'absent': 0, 'late': 0}

            att = (
                Attendance.objects.filter(employee=emp, date=target_date)
                .order_by('-id')
                .first()
            )
            if att and att.clock_in_time:
                if att.clock_in_time.hour >= 10:
                    hub_stats[hub_name]['late'] += 1
                else:
                    hub_stats[hub_name]['present'] += 1
            else:
                hub_stats[hub_name]['absent'] += 1

        result = [
            {
                'hub_name': hub_name,
                'present': stats['present'],
                'absent': stats['absent'],
                'late': stats['late'],
            }
            for hub_name, stats in hub_stats.items()
        ]
        return Response(result)

    @action(detail=False, methods=['get'])
    def aggregate(self, request):
        """Aggregate attendance stats for a given period (start_date, end_date).

        Returns counts: present, absent, late, overtime_hours, total_hours and
        breakdowns for last 7 days, last 15 days and last 30 days relative to end_date.
        """
        # Parse dates
        end_date_str = request.query_params.get('end_date')
        start_date_str = request.query_params.get('start_date')
        employee_id = request.query_params.get('employee_id')

        try:
            if end_date_str:
                end_date = date_cls.fromisoformat(end_date_str)
            else:
                end_date = timezone.localdate()
        except Exception:
            end_date = timezone.localdate()

        try:
            if start_date_str:
                start_date = date_cls.fromisoformat(start_date_str)
            else:
                # default to first day of current month
                start_date = date_cls(end_date.year, end_date.month, 1)
        except Exception:
            start_date = date_cls(end_date.year, end_date.month, 1)

        def compute_range(s: date_cls, e: date_cls):
            qs = Attendance.objects.filter(date__gte=s, date__lte=e)
            if employee_id:
                try:
                    qs = qs.filter(employee_id=int(employee_id))
                except Exception:
                    pass

            total_seconds = 0.0
            overtime_seconds = 0.0
            present_days = set()
            late_days = set()

            STANDARD_DAY_HOURS = 8
            LATE_HOUR = 10

            for a in qs:
                if a.clock_in_time:
                    present_days.add(a.date)
                    if getattr(a.clock_in_time, 'hour', None) is not None and a.clock_in_time.hour >= LATE_HOUR:
                        late_days.add(a.date)

                if a.clock_in_time and a.clock_out_time:
                    diff = (a.clock_out_time - a.clock_in_time).total_seconds()
                    if diff > 0:
                        total_seconds += diff
                        hours = diff / 3600.0
                        if hours > STANDARD_DAY_HOURS:
                            overtime_seconds += (hours - STANDARD_DAY_HOURS) * 3600.0
                elif a.clock_in_time and not a.clock_out_time:
                    # approximate until end of day
                    try:
                        from django.utils import timezone as djtz
                        if a.date == djtz.now().date():
                            diff = (djtz.now() - a.clock_in_time).total_seconds()
                            if diff > 0:
                                total_seconds += diff
                                hours = diff / 3600.0
                                if hours > STANDARD_DAY_HOURS:
                                    overtime_seconds += (hours - STANDARD_DAY_HOURS) * 3600.0
                    except Exception:
                        pass

            total_hours = round(total_seconds / 3600.0, 2)
            overtime_hours = round(overtime_seconds / 3600.0, 2)

            # working weekdays count
            def count_weekdays(s_date, e_date):
                days = 0
                cur = s_date
                while cur <= e_date:
                    if cur.weekday() < 5:
                        days += 1
                    cur = cur + timedelta(days=1)
                return days

            working_days = count_weekdays(s, e)

            # approved leave days overlapping
            leave_days = 0
            approved_leaves = LeaveRequest.objects.filter(status='approved')
            for lr in approved_leaves:
                ls = lr.start_date
                le = lr.end_date
                overlap_start = max(ls, s)
                overlap_end = min(le, e)
                if overlap_start <= overlap_end:
                    # count weekdays in overlap
                    leave_days += count_weekdays(overlap_start, overlap_end)

            present = len(present_days)
            late = len(late_days)
            absences = max(0, working_days - present - leave_days)

            return {
                'present': present,
                'late': late,
                'absent': absences,
                'total_hours': total_hours,
                'overtime_hours': overtime_hours,
                'working_days': working_days,
            }

        # Overall for requested range
        overall = compute_range(start_date, end_date)

        # weekly (last 7 days ending end_date)
        weekly_start = end_date - timedelta(days=6)
        weekly = compute_range(weekly_start, end_date)

        # last 15 days
        fortnight_start = end_date - timedelta(days=14)
        fortnight = compute_range(fortnight_start, end_date)

        # last 30 days
        monthly_start = end_date - timedelta(days=29)
        monthly = compute_range(monthly_start, end_date)

        return Response({
            'requested_start': start_date,
            'requested_end': end_date,
            'overall': overall,
            'weekly': weekly,
            'fortnight': fortnight,
            'monthly': monthly,
        })

    @action(detail=False, methods=['get'])
    def download(self, request):
        """Download attendance records for a period in CSV/XLSX/PDF format.

        Query params: start_date, end_date, employee_id, format (csv|xlsx|pdf)
        """
        fmt = (request.query_params.get('format') or 'csv').lower()
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')
        employee_id = request.query_params.get('employee_id')

        try:
            if end_date_str:
                end_date = date_cls.fromisoformat(end_date_str)
            else:
                end_date = timezone.localdate()
        except Exception:
            end_date = timezone.localdate()

        try:
            if start_date_str:
                start_date = date_cls.fromisoformat(start_date_str)
            else:
                start_date = date_cls(end_date.year, end_date.month, 1)
        except Exception:
            start_date = date_cls(end_date.year, end_date.month, 1)

        qs = Attendance.objects.filter(date__gte=start_date, date__lte=end_date).select_related('employee').order_by('date')
        if employee_id:
            try:
                qs = qs.filter(employee_id=int(employee_id))
            except Exception:
                pass

        # Build rows
        rows = []
        for a in qs:
            rows.append({
                'id': a.id,
                'employee_name': getattr(a.employee, 'full_name', ''),
                'jtp_code': getattr(a.employee, 'jtp_code', ''),
                'hub_name': getattr(a.employee.hub, 'name', '') if getattr(a.employee, 'hub', None) else '',
                'city': getattr(a.employee.hub, 'city', '') if getattr(a.employee, 'hub', None) else '',
                'date': a.date.isoformat() if a.date else '',
                'clock_in_time': a.clock_in_time.isoformat() if a.clock_in_time else '',
                'clock_out_time': a.clock_out_time.isoformat() if a.clock_out_time else '',
                'clock_in_image': a.clock_in_image.url if a.clock_in_image else '',
                'clock_out_image': a.clock_out_image.url if a.clock_out_image else '',
                'clock_in_latitude': a.clock_in_latitude,
                'clock_in_longitude': a.clock_in_longitude,
                'clock_out_latitude': a.clock_out_latitude,
                'clock_out_longitude': a.clock_out_longitude,
                'status': a.status,
                'total_hours': getattr(a, 'total_hours', ''),
                'overtime_hours': getattr(a, 'overtime_hours', ''),
            })

        filename_base = 'attendance-report-monthly'

        if fmt == 'csv':
            si = io.StringIO()
            writer = csv.writer(si)
            header = list(rows[0].keys()) if rows else ['id','employee_name','jtp_code','hub_name','city','date','clock_in_time','clock_out_time','clock_in_image','clock_out_image','clock_in_latitude','clock_in_longitude','clock_out_latitude','clock_out_longitude','status','total_hours','overtime_hours']
            writer.writerow(header)
            for r in rows:
                writer.writerow([r.get(h, '') for h in header])
            resp = HttpResponse(si.getvalue(), content_type='text/csv')
            resp['Content-Disposition'] = f'attachment; filename="{filename_base}.csv"'
            return resp

        if fmt == 'xlsx' and openpyxl is not None:
            from openpyxl import Workbook
            wb = Workbook()
            ws = wb.active
            header = list(rows[0].keys()) if rows else ['id','employee_name','jtp_code','hub_name','city','date','clock_in_time','clock_out_time','clock_in_image','clock_out_image','clock_in_latitude','clock_in_longitude','clock_out_latitude','clock_out_longitude','status','total_hours','overtime_hours']
            ws.append(header)
            for r in rows:
                ws.append([r.get(h, '') for h in header])
            bio = io.BytesIO()
            wb.save(bio)
            bio.seek(0)
            resp = HttpResponse(bio.read(), content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            resp['Content-Disposition'] = f'attachment; filename="{filename_base}.xlsx"'
            return resp

        # PDF fallback (simple table) if reportlab available
        if fmt == 'pdf' and canvas is not None and letter is not None:
            bio = io.BytesIO()
            c = canvas.Canvas(bio, pagesize=letter)
            width, height = letter
            y = height - 40
            # Simple header
            c.setFont('Helvetica-Bold', 12)
            c.drawString(40, y, 'Attendance Report')
            y -= 24
            c.setFont('Helvetica', 10)
            for r in rows:
                line = f"{r.get('date','')} - {r.get('employee_name','')} - {r.get('clock_in_time','')} - {r.get('clock_out_time','')} - {r.get('status','')}"
                c.drawString(40, y, line[:1000])
                y -= 14
                if y < 60:
                    c.showPage()
                    y = height - 40
            c.save()
            bio.seek(0)
            resp = HttpResponse(bio.read(), content_type='application/pdf')
            resp['Content-Disposition'] = f'attachment; filename="{filename_base}.pdf"'
            return resp

        # Default: CSV
        si = io.StringIO()
        writer = csv.writer(si)
        header = list(rows[0].keys()) if rows else ['id','employee_name','jtp_code','hub_name','city','date','clock_in_time','clock_out_time','clock_in_image','clock_out_image','clock_in_latitude','clock_in_longitude','clock_out_latitude','clock_out_longitude','status','total_hours','overtime_hours']
        writer.writerow(header)
        for r in rows:
            writer.writerow([r.get(h, '') for h in header])
        resp = HttpResponse(si.getvalue(), content_type='text/csv')
        resp['Content-Disposition'] = f'attachment; filename="{filename_base}.csv"'
        return resp

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Admin: Approve an attendance entry. Per user request, approving leaves recorded hours unchanged."""
        try:
            # Only allow HR or Admin users to approve attendance
            try:
                actor = Employee.objects.get(user=request.user)
            except Employee.DoesNotExist:
                actor = None
            if not actor or getattr(actor, 'role', '').lower() not in ['hr', 'admin']:
                raise PermissionDenied('Only HR or Admin users may approve attendance')

            attendance = self.get_object()
            # Persist approval state
            attendance.is_approved = True
            attendance.approved_by = request.user
            attendance.approved_at = timezone.now()
            attendance.save()

            ActivityLog.objects.create(
                user=request.user,
                employee=attendance.employee,
                role=_request_actor_role(request),
                action='attendance_approved',
                details=f'Attendance {attendance.id} approved by {getattr(request.user, "username", "")}',
                ip_address=_client_ip(request),
            )

            serializer = AttendanceSerializer(attendance, context={'request': request})
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=400)

    @action(detail=True, methods=['post'])
    def disapprove(self, request, pk=None):
        """Admin: Disapprove an attendance entry. This will remove recorded hours for the day (clear clock in/out)."""
        try:
            # Only allow HR or Admin users to disapprove attendance
            try:
                actor = Employee.objects.get(user=request.user)
            except Employee.DoesNotExist:
                actor = None
            if not actor or getattr(actor, 'role', '').lower() not in ['hr', 'admin']:
                raise PermissionDenied('Only HR or Admin users may disapprove attendance')

            attendance = self.get_object()

            # remove recorded times so the day contributes no hours
            attendance.clock_in_time = None
            attendance.clock_out_time = None
            attendance.status = 'Absent'
            # clear approval state as well
            attendance.is_approved = False
            attendance.approved_by = None
            attendance.approved_at = None
            attendance.save()

            ActivityLog.objects.create(
                user=request.user,
                employee=attendance.employee,
                role=_request_actor_role(request),
                action='attendance_disapproved',
                details=f'Attendance {attendance.id} disapproved by {getattr(request.user, "username", "")}; hours removed',
                ip_address=_client_ip(request),
            )

            serializer = AttendanceSerializer(attendance, context={'request': request})
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=400)

class LeaveRequestViewSet(viewsets.ModelViewSet):
    queryset = LeaveRequest.objects.all()
    serializer_class = LeaveRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = (
            LeaveRequest.objects.all()
            .select_related('employee', 'reviewed_by')
            .prefetch_related('attachments')
            .order_by('-created_at')
        )
        user = self.request.user
        status = self.request.query_params.get('status')
        employee_id = self.request.query_params.get('employee_id')
        hub_id = self.request.query_params.get('hub_id')

        if status:
            qs = qs.filter(status=status)

        try:
            actor = Employee.objects.get(user=user)
        except Employee.DoesNotExist:
            actor = None

        is_plain_employee = actor and getattr(actor, 'role', '').lower() == 'employee'

        if is_plain_employee:
            qs = qs.filter(employee=actor)
        else:
            if actor and getattr(actor, 'role', '').lower() == 'hr':
                qs = qs.exclude(employee__role__iexact='admin')
            if employee_id:
                qs = qs.filter(employee_id=employee_id)
            if hub_id:
                qs = qs.filter(employee__hub_id=hub_id)

        return qs

    def perform_create(self, serializer):
        # Employee submits their own leave request; restrict via employee.user mapping
        user = self.request.user
        try:
            emp = Employee.objects.get(user=user)
        except Employee.DoesNotExist:
            emp = None

        # Save leave request, then persist any uploaded files as LeaveAttachment
        if emp:
            instance = serializer.save(employee=emp)
        else:
            instance = serializer.save()

        # Handle uploaded files under key 'attachments' (frontend sends multiple files with this key)
        try:
            files = self.request.FILES.getlist('attachments') if hasattr(self.request.FILES, 'getlist') else []
            from .models import LeaveAttachment
            for f in files:
                # Avoid creating duplicate attachments for the same leave request
                try:
                    basename = os.path.basename(f.name)
                except Exception:
                    basename = getattr(f, 'name', None) or None

                # If an attachment with the same basename already exists for this request, skip it
                if basename:
                    existing = LeaveAttachment.objects.filter(leave_request=instance, file__icontains=basename).first()
                    if existing:
                        continue

                # create LeaveAttachment pointing to this leave request
                att = LeaveAttachment.objects.create(leave_request=instance, file=f)
                try:
                    # persist permanently in SavedImage, but avoid duplicate SavedImage entries
                    existing_saved = SavedImage.objects.filter(employee=instance.employee, image__icontains=att.file.name, leave_attachment__leave_request=instance).first()
                    if existing_saved:
                        continue

                    SavedImage.objects.create(
                        employee=instance.employee,
                        image=att.file,
                        image_type='leave_attachment',
                        leave_attachment=att,
                        description=f'Leave attachment for request {instance.id}'
                    )
                except Exception as e:
                    print('Failed to create SavedImage for leave attachment:', e)
        except Exception as e:
            # don't fail the request if attachments saving has issues; log for debugging
            print('Failed to save leave attachments:', e)

        if emp:
            ActivityLog.objects.create(
                user=user,
                employee=emp,
                role=emp.role,
                action='submit_leave_request',
                details=f'Submitted leave request id={instance.id}',
                ip_address=_client_ip(self.request),
            )

    @action(detail=True, methods=['patch'])
    def approve(self, request, pk=None):
        instance = self.get_object()
        instance.status = 'approved'
        # allow admin to include an optional note when approving
        instance.notes = request.data.get('notes', instance.notes)
        instance.reviewed_by = request.user
        instance.reviewed_at = timezone.now()
        instance.save()
        ActivityLog.objects.create(
            user=request.user,
            employee=instance.employee,
            role=_request_actor_role(request),
            action='approve_request',
            details=f'Approved leave request id={instance.id} for {instance.employee.full_name}',
            ip_address=_client_ip(request),
        )
        return Response(self.get_serializer(instance).data)

    @action(detail=True, methods=['patch'])
    def reject(self, request, pk=None):
        instance = self.get_object()
        instance.status = 'rejected'
        instance.notes = request.data.get('notes', instance.notes)
        instance.reviewed_by = request.user
        instance.reviewed_at = timezone.now()
        instance.save()
        ActivityLog.objects.create(
            user=request.user,
            employee=instance.employee,
            role=_request_actor_role(request),
            action='reject_request',
            details=f'Rejected leave request id={instance.id} for {instance.employee.full_name}',
            ip_address=_client_ip(request),
        )
        return Response(self.get_serializer(instance).data)

    @action(detail=False, methods=['delete'])
    def clear_all(self, request):
        """Delete all records in the current queryset (filtered by permissions)"""
        queryset = self.get_queryset()
        count = queryset.count()
        queryset.delete()
        
        # Log this destructive action
        ActivityLog.objects.create(
            user=request.user,
            action='clear_all_leave_requests',
            details=f'Cleared {count} leave requests',
            ip_address=_client_ip(request)
        )
        return Response({'message': f'Successfully cleared {count} leave requests'}, status=status.HTTP_200_OK)


class EditRequestViewSet(viewsets.ModelViewSet):
    """ViewSet for edit requests with approval logic"""
    queryset = EditRequest.objects.all()
    serializer_class = EditRequestSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    
    def get_queryset(self):
        queryset = EditRequest.objects.all().select_related('employee', 'reviewed_by').order_by('-created_at')
        status = self.request.query_params.get('status')
        if status:
            queryset = queryset.filter(status=status)
            
        employee_id = self.request.query_params.get('employee_id')
        hub_id = self.request.query_params.get('hub_id')
        user = self.request.user

        # Staff/Superusers see everything
        if user.is_staff or user.is_superuser:
            if employee_id:
                queryset = queryset.filter(employee_id=employee_id)
            if hub_id:
                queryset = queryset.filter(employee__hub_id=hub_id)
            return queryset

        # For regular employees/HR, filter based on their own profile
        try:
            actor = Employee.objects.get(user=user)
        except Employee.DoesNotExist:
            # If user is logged in but has no employee profile, and is not staff, show nothing
            return EditRequest.objects.none()

        is_hr = getattr(actor, 'role', '').lower() == 'hr'
        is_admin_role = getattr(actor, 'role', '').lower() == 'admin' # Application-level Admin role
        
        if is_admin_role:
            # App-level Admin sees all
            pass 
        elif is_hr:
            # HR sees everyone except Admins
            queryset = queryset.exclude(employee__role__iexact='admin')
        else:
            # Regular employee sees only their own
            queryset = queryset.filter(employee=actor)

        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        if hub_id:
            queryset = queryset.filter(employee__hub_id=hub_id)
            
        return queryset
    
    def create(self, request, *args, **kwargs):
        # Accept multipart/form-data: requested_data may be a JSON string
        requested_data = request.data.get('requested_data', '{}')
        try:
            if isinstance(requested_data, str):
                requested_data = json.loads(requested_data)
        except Exception:
            requested_data = {}

        uploaded = request.FILES.get('uploaded_files')
        # Validate uploaded file (if present)
        if uploaded:
            MAX_SIZE = 5 * 1024 * 1024  # 5 MB
            if uploaded.size > MAX_SIZE:
                return Response({'error': 'Uploaded file is too large. Max 5MB.'}, status=status.HTTP_400_BAD_REQUEST)

            is_doc_upload = isinstance(requested_data, dict) and requested_data.get('document_upload')

            if is_doc_upload:
                # For document uploads, allow PDF, text/csv, images, Word, Excel, ZIP files, etc.
                allowed_types = [
                    'image/',
                    'application/pdf',
                    'text/',
                    'application/msword',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'application/vnd.ms-excel',
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'application/zip',
                    'application/x-zip-compressed',
                ]
                content_type = uploaded.content_type or ''
                if not any(content_type.startswith(p) for p in allowed_types):
                    return Response({'error': 'Invalid file type for document. Allowed formats: PDF, Images, Word, Excel, CSV, Text, ZIP.'}, status=status.HTTP_400_BAD_REQUEST)
            else:
                # Regular edit requests (profile pictures etc.) only allow images
                allowed_prefix = 'image/'
                if not (uploaded.content_type and uploaded.content_type.startswith(allowed_prefix)):
                    return Response({'error': 'Invalid file type. Only images are allowed.'}, status=status.HTTP_400_BAD_REQUEST)

        # Build serializer data. If we can determine the employee from request.user,
        # include it so the serializer doesn't reject the payload as missing `employee`.
        data = {'requested_data': requested_data}
        emp = None
        if getattr(request, 'user', None) and getattr(request.user, 'is_authenticated', False):
            emp = Employee.objects.filter(user_id=getattr(request.user, 'id', None)).first()

        if emp:
            data['employee'] = emp.id
        else:
            # If caller provided employee in the form/payload, accept it.
            if request.data.get('employee'):
                try:
                    data['employee'] = int(request.data.get('employee'))
                except Exception:
                    data['employee'] = request.data.get('employee')

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer, uploaded=uploaded)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer, uploaded=None):
        # Save using validated data for `employee` (provided in payload or set
        # by create()). Only attach uploaded file here to avoid accidentally
        # passing the wrong object for `employee`.
        if uploaded:
            instance = serializer.save(uploaded_files=uploaded)
        else:
            instance = serializer.save()
        try:
            ActivityLog.objects.create(
                user=self.request.user if self.request.user.is_authenticated else None,
                employee=instance.employee,
                role=instance.employee.role,
                action='submit_edit_request',
                details=f'Submitted edit request id={instance.id}',
                ip_address=_client_ip(self.request),
            )
        except Exception:
            pass

    @action(detail=True, methods=['patch'])
    def approve(self, request, pk=None):
        instance = self.get_object()
        instance.status = 'approved'
        instance.reviewed_by = request.user
        instance.reviewed_at = timezone.now()
        instance.save()
        
        # Mapping for camelCase to snake_case fields (from EmployeeCreateSerializer)
        FIELD_MAP = {
            'firstName': 'firstname', 'lastName': 'lastname', 'middleInitial': 'middle_initial',
            'placeOfBirth': 'place_of_birth', 'dateOfBirth': 'date_of_birth', 'maritalStatus': 'marital_status',
            'email': 'email_address', 'phone': 'phone_number', 'currentAddress': 'current_address',
            'permanentAddress': 'permanent_address', 'employmentType': 'employment_type',
            'hireDate': 'hired_date', 'jtpCode': 'jtp_code', 'employeeId': 'employee_id',
            'emergencyContactName': 'emergency_contact_name', 'emergencyContactPhone': 'emergency_contact_phone',
            'canEditInfo': 'can_edit_info', 'isActive': 'is_active',
        }
        
        try:
            requested_data = instance.requested_data or {}

            # Check if this is a document upload request
            if requested_data.get('document_upload') and instance.uploaded_files:
                # Create an EmployeeDocument from the uploaded file
                doc = EmployeeDocument(
                    employee=instance.employee,
                    file=instance.uploaded_files,
                    document_type='other',
                )
                doc.save()
            else:
                # 1. Handle Profile Picture Update
                if instance.uploaded_files:
                    # Read bytes directly from the file to ensure they land in DB
                    image_bytes = None
                    try:
                        instance.uploaded_files.seek(0)
                        image_bytes = instance.uploaded_files.read()
                        instance.uploaded_files.seek(0)
                    except Exception as e:
                        print(f"Warning: Could not read bytes for approved edit request image: {e}")

                    # Save to SavedImage as 'profile' type for permanent storage
                    saved_image = SavedImage(
                        employee=instance.employee,
                        image=instance.uploaded_files,
                        image_type='profile',
                        edit_request=instance,
                        is_approved=True,
                        description=f'Profile picture update from Request #{instance.id}'
                    )
                    if image_bytes:
                        saved_image.image_data = image_bytes
                    saved_image.save()
                    
                    # Update employee's profile image to point to this new file
                    instance.employee.profile_image = instance.uploaded_files
                
                # 2. Apply requested_data fields (handling mapping)
                for field, value in requested_data.items():
                    if field in ('profile_image', 'document_upload', 'file_name'):
                        continue
                    
                    # Map camelCase to snake_case if necessary
                    target_field = FIELD_MAP.get(field, field)
                    
                    if hasattr(instance.employee, target_field):
                        # Handle empty strings for dates/emails
                        if value in ('', 'null', None):
                            value = None
                        setattr(instance.employee, target_field, value)
            
            instance.employee.save()
        except Exception as e:
            print(f"Error applying approved edit request: {str(e)}")
            pass
        
        ActivityLog.objects.create(
            user=request.user,
            employee=instance.employee,
            role=_request_actor_role(request),
            action='approve_request',
            details=f'Approved edit request id={instance.id} for {instance.employee.full_name}',
            ip_address=_client_ip(request),
        )
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    @action(detail=True, methods=['patch'])
    def reject(self, request, pk=None):
        instance = self.get_object()
        notes = request.data.get('notes', '')
        instance.status = 'rejected'
        instance.notes = notes
        instance.reviewed_by = request.user
        instance.reviewed_at = timezone.now()
        instance.save()
        ActivityLog.objects.create(
            user=request.user,
            employee=instance.employee,
            role=_request_actor_role(request),
            action='reject_request',
            details=f'Rejected edit request id={instance.id} for {instance.employee.full_name}',
            ip_address=_client_ip(request),
        )
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=False, methods=['delete'])
    def clear_all(self, request):
        """Delete all records in the current queryset (filtered by permissions)"""
        queryset = self.get_queryset()
        count = queryset.count()
        queryset.delete()
        
        # Log this destructive action
        ActivityLog.objects.create(
            user=request.user,
            action='clear_all_edit_requests',
            details=f'Cleared {count} edit requests',
            ip_address=_client_ip(request)
        )
        return Response({'message': f'Successfully cleared {count} edit requests'}, status=status.HTTP_200_OK)

class EmployeeDocumentViewSet(viewsets.ModelViewSet):
    """ViewSet for employee documents/attachments"""
    queryset = EmployeeDocument.objects.all()
    serializer_class = EmployeeDocumentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = EmployeeDocument.objects.select_related('employee', 'employee__user').all()
        user = self.request.user
        employee_id = self.request.query_params.get('employee_id')

        if user.is_staff or user.is_superuser:
            if employee_id:
                qs = qs.filter(employee_id=employee_id)
        else:
            try:
                emp = Employee.objects.get(user=user)
                qs = qs.filter(employee=emp)
            except Employee.DoesNotExist:
                qs = qs.none()

        return qs

    def perform_destroy(self, instance):
        user = self.request.user
        if not (user.is_staff or user.is_superuser):
            try:
                emp = Employee.objects.get(user=user)
                if instance.employee_id != emp.id:
                    raise PermissionDenied('You can only delete your own documents.')
            except Employee.DoesNotExist:
                raise PermissionDenied('Employee profile not found.')
        super().perform_destroy(instance)

class PayrollViewSet(viewsets.ModelViewSet):
    """ViewSet for payroll

    Harden create/update payloads for JSON NOT NULL constraints.

    This UI uses PATCH for editing, but some clients may accidentally send a POST.
    If a POST happens, we must still guarantee `deduction_details` is non-null.
    """
    """
    We harden create/update payloads so NOT NULL JSON fields don't raise IntegrityError.
    

    Note:
    - Some clients may POST partial payloads.
    - `deduction_details` must never be null for NOT NULL DB constraint.
    - We enforce default values on create to avoid 500 IntegrityError.


    Note: Payslip management UI expects to always list employees for the selected hub,
    even if they don't have a Payroll record yet. So we return a merged queryset:
    - existing Payroll rows
    - missing employees for the hub with net_pay=0 and status='draft'
    """
    queryset = Payroll.objects.all().order_by('-period_end')
    serializer_class = PayrollSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Read filters
        hub = self.request.query_params.get('hub')
        status_filter = self.request.query_params.get('status')
        period_start = self.request.query_params.get('period_start')
        period_end = self.request.query_params.get('period_end')
        search = self.request.query_params.get('search')
        employee_id = self.request.query_params.get('employee_id')
        year = self.request.query_params.get('year')

        # Existing payroll rows
        queryset = Payroll.objects.exclude(employee__role__in=['Admin', 'HR']).select_related('employee', 'employee__hub').order_by('-period_end')
        queryset = apply_hr_hub_filter(queryset, self.request.user, hub_field='employee__hub')

        if getattr(self, 'action', None) != 'list':
            return queryset

        if hub:
            queryset = queryset.filter(employee__hub__name=hub)

        if period_start and period_end:
            queryset = queryset.filter(period_start=period_start, period_end=period_end)
        elif period_start:
            queryset = queryset.filter(period_start=period_start)
        elif period_end:
            queryset = queryset.filter(period_end=period_end)
        elif year and year != 'All':
            # Fallback: if only year provided, filter by period_end year
            queryset = queryset.filter(period_end__year=year)

        if status_filter and status_filter != 'All':
            queryset = queryset.filter(status=status_filter)

        if search:
            queryset = queryset.filter(
                models.Q(employee__firstname__icontains=search) |
                models.Q(employee__lastname__icontains=search)
            )

        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)

        # Build list of employees for the hub (or all)
        employees_qs = Employee.objects.exclude(role__in=['Admin', 'HR']).select_related('hub')
        if hub:
            employees_qs = employees_qs.filter(hub__name=hub)

        if employee_id:
            # If UI passes employee_id, restrict to it
            try:
                employees_qs = employees_qs.filter(id=int(employee_id))
            except (ValueError, TypeError):
                pass

        if search:
            employees_qs = employees_qs.filter(
                models.Q(firstname__icontains=search) |
                models.Q(lastname__icontains=search)
            )

        employees = list(employees_qs)
        payroll_by_employee_id = {p.employee_id: p for p in queryset}
        
        # Only add missing employees as drafts if the user isn't strictly filtering for another status
        if status_filter and status_filter.lower() not in ['all', 'draft']:
            missing_employees = []
        else:
            missing_employees = [e for e in employees if e.id not in payroll_by_employee_id]

        # Determine date range for placeholders
        from datetime import date as _date
        from decimal import Decimal
        try:
            if period_start and period_end:
                start_date = _date.fromisoformat(period_start)
                end_date = _date.fromisoformat(period_end)
            elif period_start:
                start_date = _date.fromisoformat(period_start)
                end_date = start_date
            elif period_end:
                end_date = _date.fromisoformat(period_end)
                start_date = end_date
            else:
                start_date = _date.today()
                end_date = _date.today()
        except Exception:
            start_date = _date.today()
            end_date = _date.today()

        # --- PERFORMANCE OPTIMIZATION ---
        # Instead of running 1 Attendance query + 1 LeaveRequest query per missing employee (N+1),
        # batch-load ALL attendance and leave records for all missing employees in just 2 queries.
        placeholders = []
        if missing_employees:
            missing_ids = [e.id for e in missing_employees]
            cumulative_start = _date(end_date.year, end_date.month, 1)

            # Single batch query for all attendance records
            all_attendance = Attendance.objects.filter(
                employee_id__in=missing_ids,
                date__gte=cumulative_start,
                date__lte=end_date,
            ).values_list('employee_id', 'clock_in_time', 'clock_out_time', 'date')

            # Group attendance by employee_id
            from collections import defaultdict
            from datetime import timedelta
            att_by_emp = defaultdict(list)
            for emp_id, ci, co, d in all_attendance:
                att_by_emp[emp_id].append((ci, co, d))

            # Single batch query for all approved leave requests
            all_leaves = LeaveRequest.objects.filter(
                employee_id__in=missing_ids,
                status='approved',
            ).values_list('employee_id', 'start_date', 'end_date')

            leave_by_emp = defaultdict(list)
            for emp_id, ls, le in all_leaves:
                leave_by_emp[emp_id].append((ls, le))

            def count_weekdays(s, e):
                days = 0
                cur = s
                while cur <= e:
                    if cur.weekday() < 5:
                        days += 1
                    cur += timedelta(days=1)
                return days

            working_days = count_weekdays(cumulative_start, end_date)

            LATE_HOUR = 10
            STANDARD_DAY_HOURS = 8

            for emp in missing_employees:
                ph = type('_PayrollPlaceholder', (), {})()
                ph.id = None
                ph.employee = emp
                ph.employee_id = emp.id
                ph.period_start = start_date
                ph.period_end = end_date
                ph.standard_pay = Decimal('0')
                ph.basic_salary = Decimal('0')
                ph.overtime_pay = Decimal('0')
                ph.night_differential = Decimal('0')
                ph.ndot = Decimal('0')
                ph.rest_day = Decimal('0')
                ph.rest_day_ot = Decimal('0')
                ph.rest_day_nd = Decimal('0')
                ph.rest_day_ndot = Decimal('0')
                ph.special_holiday = Decimal('0')
                ph.special_holiday_ot = Decimal('0')
                ph.special_holiday_nd = Decimal('0')
                ph.special_holiday_ndot = Decimal('0')
                ph.legal_holiday = Decimal('0')
                ph.legal_holiday_ot = Decimal('0')
                ph.legal_holiday_nd = Decimal('0')
                ph.legal_holiday_ndot = Decimal('0')
                ph.legal_holiday_rd = Decimal('0')
                ph.legal_holiday_rdot = Decimal('0')
                ph.legal_holiday_rdnd = Decimal('0')
                ph.legal_holiday_rdndot = Decimal('0')
                ph.incentives = Decimal('0')
                ph.adjustment = Decimal('0')
                ph.gas = Decimal('0')
                ph.load = Decimal('0')
                ph.other_allowance = Decimal('0')
                ph.rewards_adjustments = Decimal('0')
                ph.kpi = Decimal('0')
                ph.allowances = Decimal('0')
                ph.late = Decimal('0')
                ph.id_deduction = Decimal('0')
                ph.uniform = Decimal('0')
                ph.insurance = Decimal('0')
                ph.surety_bond = Decimal('0')
                ph.convenience_fee = Decimal('0')
                ph.general_deduction = Decimal('0')
                ph.deduction_details = {}
                ph.sss_deduction = Decimal('0')
                ph.philhealth_deduction = Decimal('0')
                ph.pagibig_deduction = Decimal('0')
                ph.net_pay = Decimal('0')
                ph.status = 'draft'
                ph.payslip_image = None
                ph.created_at = timezone.now()
                ph.updated_at = timezone.now()

                # Compute attendance stats from pre-loaded data (no extra DB queries)
                try:
                    total_seconds = 0.0
                    overtime_seconds = 0.0
                    late_count = 0
                    present_days = set()
                    for ci, co, d in att_by_emp.get(emp.id, []):
                        if ci and co:
                            diff = (co - ci).total_seconds()
                            if diff > 0:
                                total_seconds += diff
                                hours = diff / 3600.0
                                if hours > STANDARD_DAY_HOURS:
                                    overtime_seconds += (hours - STANDARD_DAY_HOURS) * 3600.0
                        if ci and getattr(ci, 'hour', None) is not None:
                            if ci.hour >= LATE_HOUR:
                                late_count += 1
                        if ci:
                            present_days.add(d)

                    ph.total_hours = Decimal(str(round(total_seconds / 3600.0, 2)))
                    ph.overtime_hours = Decimal(str(round(overtime_seconds / 3600.0, 2)))
                    ph.lates = late_count

                    leave_days = 0
                    for ls, le in leave_by_emp.get(emp.id, []):
                        overlap_start = max(ls, cumulative_start)
                        overlap_end = min(le, end_date)
                        if overlap_start <= overlap_end:
                            leave_days += count_weekdays(overlap_start, overlap_end)

                    ph.absences = max(0, working_days - len(present_days) - leave_days)
                except Exception:
                    ph.total_hours = Decimal('0')
                    ph.overtime_hours = Decimal('0')
                    ph.lates = 0
                    ph.absences = 0

                placeholders.append(ph)

        results = list(queryset) + placeholders
        return results

    def perform_create(self, serializer):
        """Compute attendance, government deductions, and net_pay before persisting a new Payroll."""
        try:
            emp = serializer.validated_data.get('employee')
            period_start = serializer.validated_data.get('period_start')
            period_end = serializer.validated_data.get('period_end')
            
            # List of all numeric fields to extract
            fields_to_extract = [
                'standard_pay', 'basic_salary', 'night_differential', 'ndot',
                'rest_day', 'rest_day_ot', 'rest_day_nd', 'rest_day_ndot',
                'special_holiday', 'special_holiday_ot', 'special_holiday_nd', 'special_holiday_ndot',
                'legal_holiday', 'legal_holiday_ot', 'legal_holiday_nd', 'legal_holiday_ndot',
                'legal_holiday_rd', 'legal_holiday_rdot', 'legal_holiday_rdnd', 'legal_holiday_rdndot',
                'incentives', 'adjustment', 'gas', 'load', 'other_allowance', 'rewards_adjustments', 'kpi', 'allowances',
                'late', 'id_deduction', 'uniform', 'insurance', 'surety_bond', 'convenience_fee', 'general_deduction'
            ]
            summary_kwargs = {}
            for field in fields_to_extract:
                val = serializer.validated_data.get(field, 0)
                summary_kwargs[field] = float(val or 0)
            
            deduction_details = serializer.validated_data.get('deduction_details', {}) or {}

            # Use compute helper to calculate derived fields
            summary = compute_payroll_summary(emp, period_start, period_end, deduction_details=deduction_details, **summary_kwargs)

            # Populate computed fields into validated_data so serializer.save() persists them
            serializer.validated_data['total_hours'] = summary.get('total_hours', 0)
            serializer.validated_data['overtime_hours'] = summary.get('overtime_hours', 0)
            serializer.validated_data['lates'] = summary.get('lates', 0)
            serializer.validated_data['absences'] = summary.get('absences', 0)
            # Allow percent overrides from payload; if provided, compute gov deductions using overrides
            total_earnings = float(summary.get('total_earnings', 0))
            # Allow percent overrides from either validated_data or raw request payload
            sss_pct = serializer.validated_data.get('sss_percent') if 'sss_percent' in serializer.validated_data else (self.request.data.get('sss_percent') or None)
            phil_pct = serializer.validated_data.get('philhealth_percent') if 'philhealth_percent' in serializer.validated_data else (self.request.data.get('philhealth_percent') or None)
            pagibig_pct = serializer.validated_data.get('pagibig_percent') if 'pagibig_percent' in serializer.validated_data else (self.request.data.get('pagibig_percent') or None)

            if sss_pct is not None or phil_pct is not None or pagibig_pct is not None:
                # Use provided percents when present (treat None or 0 as no-override)
                try:
                    sss_amt = float(total_earnings * (float(sss_pct or 0) / 100.0))
                    phil_amt = float(total_earnings * (float(phil_pct or 0) / 100.0))
                    pagibig_amt = float(total_earnings * (float(pagibig_pct or 0) / 100.0))
                except Exception:
                    sss_amt = summary.get('sss_deduction', 0)
                    phil_amt = summary.get('philhealth_deduction', 0)
                    pagibig_amt = summary.get('pagibig_deduction', 0)
            else:
                sss_amt = summary.get('sss_deduction', 0)
                phil_amt = summary.get('philhealth_deduction', 0)
                pagibig_amt = summary.get('pagibig_deduction', 0)

            serializer.validated_data['sss_deduction'] = sss_amt
            serializer.validated_data['philhealth_deduction'] = phil_amt
            serializer.validated_data['pagibig_deduction'] = pagibig_amt

            # Persist any percent overrides (ensure numeric or zero)
            if sss_pct is not None:
                serializer.validated_data['sss_percent'] = float(sss_pct or 0)
            if phil_pct is not None:
                serializer.validated_data['philhealth_percent'] = float(phil_pct or 0)
            if pagibig_pct is not None:
                serializer.validated_data['pagibig_percent'] = float(pagibig_pct or 0)

            # Recompute net_pay using final deduction values
            serializer.validated_data['net_pay'] = summary.get('net_pay', 0)
        except Exception:
            # If computing fails, fall back to serializer defaults and allow model.save() to compute net_pay
            pass

        return serializer.save()

    def perform_update(self, serializer):
        """When updating a Payroll, recompute derived fields from the newest values and persist them."""
        old_status = getattr(serializer.instance, 'status', None)

        # Prevent HR users from modifying a payslip that is already approved.
        try:
            actor_role = _request_actor_role(self.request)
            if str(old_status or '').lower() == 'approved' and str(actor_role or '').lower() == 'hr':
                raise PermissionDenied('Approved payslip cannot be modified by HR')
        except PermissionDenied:
            raise
        except Exception:
            # If role determination fails, be conservative and allow superusers only
            if not (self.request.user.is_superuser or self.request.user.is_staff):
                raise PermissionDenied('Not authorized to modify this payslip')
        try:
            # Determine effective values (use existing instance values for missing fields)
            instance = serializer.instance
            emp = serializer.validated_data.get('employee', instance.employee)
            period_start = serializer.validated_data.get('period_start', instance.period_start)
            period_end = serializer.validated_data.get('period_end', instance.period_end)
            
            # List of all numeric fields to extract
            fields_to_extract = [
                'standard_pay', 'basic_salary', 'night_differential', 'ndot',
                'rest_day', 'rest_day_ot', 'rest_day_nd', 'rest_day_ndot',
                'special_holiday', 'special_holiday_ot', 'special_holiday_nd', 'special_holiday_ndot',
                'legal_holiday', 'legal_holiday_ot', 'legal_holiday_nd', 'legal_holiday_ndot',
                'legal_holiday_rd', 'legal_holiday_rdot', 'legal_holiday_rdnd', 'legal_holiday_rdndot',
                'incentives', 'adjustment', 'gas', 'load', 'other_allowance', 'rewards_adjustments', 'kpi', 'allowances',
                'late', 'id_deduction', 'uniform', 'insurance', 'surety_bond', 'convenience_fee', 'general_deduction'
            ]
            summary_kwargs = {}
            for field in fields_to_extract:
                val = serializer.validated_data.get(field)
                if val is None:
                    val = getattr(instance, field, 0)
                summary_kwargs[field] = float(val or 0)

            deduction_details = serializer.validated_data.get('deduction_details', instance.deduction_details) or {}

            summary = compute_payroll_summary(emp, period_start, period_end, deduction_details=deduction_details, **summary_kwargs)

            serializer.validated_data['total_hours'] = summary.get('total_hours', getattr(instance, 'total_hours', 0))
            serializer.validated_data['overtime_hours'] = summary.get('overtime_hours', getattr(instance, 'overtime_hours', 0))
            serializer.validated_data['lates'] = summary.get('lates', getattr(instance, 'lates', 0))
            serializer.validated_data['absences'] = summary.get('absences', getattr(instance, 'absences', 0))

            total_earnings = float(summary.get('total_earnings', 0))
            # For updates allow override via payload or validated_data; fall back to instance values
            sss_pct = serializer.validated_data.get('sss_percent') if 'sss_percent' in serializer.validated_data else (self.request.data.get('sss_percent') or getattr(instance, 'sss_percent', None))
            phil_pct = serializer.validated_data.get('philhealth_percent') if 'philhealth_percent' in serializer.validated_data else (self.request.data.get('philhealth_percent') or getattr(instance, 'philhealth_percent', None))
            pagibig_pct = serializer.validated_data.get('pagibig_percent') if 'pagibig_percent' in serializer.validated_data else (self.request.data.get('pagibig_percent') or getattr(instance, 'pagibig_percent', None))

            if sss_pct is not None or phil_pct is not None or pagibig_pct is not None:
                try:
                    sss_amt = float(total_earnings * (float(sss_pct or 0) / 100.0))
                    phil_amt = float(total_earnings * (float(phil_pct or 0) / 100.0))
                    pagibig_amt = float(total_earnings * (float(pagibig_pct or 0) / 100.0))
                except Exception:
                    sss_amt = summary.get('sss_deduction', getattr(instance, 'sss_deduction', 0))
                    phil_amt = summary.get('philhealth_deduction', getattr(instance, 'philhealth_deduction', 0))
                    pagibig_amt = summary.get('pagibig_deduction', getattr(instance, 'pagibig_deduction', 0))
            else:
                sss_amt = summary.get('sss_deduction', getattr(instance, 'sss_deduction', 0))
                phil_amt = summary.get('philhealth_deduction', getattr(instance, 'philhealth_deduction', 0))
                pagibig_amt = summary.get('pagibig_deduction', getattr(instance, 'pagibig_deduction', 0))

            serializer.validated_data['sss_deduction'] = sss_amt
            serializer.validated_data['philhealth_deduction'] = phil_amt
            serializer.validated_data['pagibig_deduction'] = pagibig_amt

            if 'sss_percent' in serializer.validated_data:
                serializer.validated_data['sss_percent'] = float(serializer.validated_data.get('sss_percent') or 0)
            if 'philhealth_percent' in serializer.validated_data:
                serializer.validated_data['philhealth_percent'] = float(serializer.validated_data.get('philhealth_percent') or 0)
            if 'pagibig_percent' in serializer.validated_data:
                serializer.validated_data['pagibig_percent'] = float(serializer.validated_data.get('pagibig_percent') or 0)

            # net_pay: recompute conservatively
            serializer.validated_data['net_pay'] = summary.get('net_pay', 0)
        except Exception:
            pass

        saved = serializer.save()
        try:
            new_status = getattr(saved, 'status', None)
            emp = getattr(saved, 'employee', None)
            if emp and str(new_status).lower() == 'approved' and str(old_status or '').lower() != 'approved':
                ActivityLog.objects.create(
                    user=self.request.user,
                    employee=emp,
                    role=_request_actor_role(self.request),
                    action='approve_payslip',
                    details=f'Approved payslip payroll id={saved.id} period {saved.period_start}–{saved.period_end}',
                    ip_address=_client_ip(self.request),
                )
            elif emp:
                ActivityLog.objects.create(
                    user=self.request.user,
                    employee=emp,
                    role=_request_actor_role(self.request),
                    action='update_payslip',
                    details=f'Updated payroll id={saved.id} status={new_status}',
                    ip_address=_client_ip(self.request),
                )
        except Exception:
            pass

        return saved
        """Compute a payroll summary for an employee and period without persisting.

        Query params: employee_id, period_start (YYYY-MM-DD), period_end (YYYY-MM-DD)
        Optional: basic_salary, allowances, overtime_pay, incentives, deduction_details (json)
        """
class PayrollSummaryView(APIView):
    """Compute a payroll summary for an employee and period without persisting."""
    permission_classes = [IsAuthenticated]

    def get(self, request):

        emp_id = request.query_params.get('employee_id')
        period_start = request.query_params.get('period_start')
        period_end = request.query_params.get('period_end')
        if not emp_id or not period_start or not period_end:
            return Response({'detail': 'employee_id, period_start and period_end are required'}, status=400)

        try:
            emp = Employee.objects.get(id=int(emp_id))
        except Employee.DoesNotExist:
            return Response({'detail': 'Employee not found'}, status=404)

        try:
            from datetime import date
            start = date.fromisoformat(period_start)
            end = date.fromisoformat(period_end)
        except Exception:
            return Response({'detail': 'Invalid period_start/period_end'}, status=400)

        try:
            standard_pay = float(request.query_params.get('standard_pay', 0))
            basic = float(request.query_params.get('basic_salary', 0))
            overtime_pay = float(request.query_params.get('overtime_pay', 0))
            night_differential = float(request.query_params.get('night_differential', 0))
            ndot = float(request.query_params.get('ndot', 0))
            rest_day = float(request.query_params.get('rest_day', 0))
            rest_day_ot = float(request.query_params.get('rest_day_ot', 0))
            rest_day_nd = float(request.query_params.get('rest_day_nd', 0))
            rest_day_ndot = float(request.query_params.get('rest_day_ndot', 0))
            special_holiday = float(request.query_params.get('special_holiday', 0))
            special_holiday_ot = float(request.query_params.get('special_holiday_ot', 0))
            special_holiday_nd = float(request.query_params.get('special_holiday_nd', 0))
            special_holiday_ndot = float(request.query_params.get('special_holiday_ndot', 0))
            legal_holiday = float(request.query_params.get('legal_holiday', 0))
            legal_holiday_ot = float(request.query_params.get('legal_holiday_ot', 0))
            legal_holiday_nd = float(request.query_params.get('legal_holiday_nd', 0))
            legal_holiday_ndot = float(request.query_params.get('legal_holiday_ndot', 0))
            legal_holiday_rd = float(request.query_params.get('legal_holiday_rd', 0))
            legal_holiday_rdot = float(request.query_params.get('legal_holiday_rdot', 0))
            legal_holiday_rdnd = float(request.query_params.get('legal_holiday_rdnd', 0))
            legal_holiday_rdndot = float(request.query_params.get('legal_holiday_rdndot', 0))
            incentives = float(request.query_params.get('incentives', 0))
            adjustment = float(request.query_params.get('adjustment', 0))
            gas = float(request.query_params.get('gas', 0))
            load = float(request.query_params.get('load', 0))
            other_allowance = float(request.query_params.get('other_allowance', 0))
            rewards_adjustments = float(request.query_params.get('rewards_adjustments', 0))
            kpi = float(request.query_params.get('kpi', 0))
            allowances = float(request.query_params.get('allowances', 0))

            late = float(request.query_params.get('late', 0))
            id_deduction = float(request.query_params.get('id_deduction', 0))
            uniform = float(request.query_params.get('uniform', 0))
            insurance = float(request.query_params.get('insurance', 0))
            surety_bond = float(request.query_params.get('surety_bond', 0))
            convenience_fee = float(request.query_params.get('convenience_fee', 0))
            general_deduction = float(request.query_params.get('general_deduction', 0))
        except Exception:
            standard_pay = basic = overtime_pay = night_differential = ndot = rest_day = rest_day_ot = rest_day_nd = rest_day_ndot = special_holiday = special_holiday_ot = special_holiday_nd = special_holiday_ndot = legal_holiday = legal_holiday_ot = legal_holiday_nd = legal_holiday_ndot = legal_holiday_rd = legal_holiday_rdot = legal_holiday_rdnd = legal_holiday_rdndot = incentives = adjustment = gas = load = other_allowance = rewards_adjustments = kpi = allowances = late = id_deduction = uniform = insurance = surety_bond = convenience_fee = general_deduction = 0.0

        dd = request.query_params.get('deduction_details')
        try:
            if dd:
                import json as _json
                dd_parsed = _json.loads(dd)
            else:
                dd_parsed = {}
        except Exception:
            dd_parsed = {}

        summary = compute_payroll_summary(emp, start, end,
                                          standard_pay=standard_pay, basic_salary=basic, overtime_pay=overtime_pay,
                                          night_differential=night_differential, ndot=ndot,
                                          rest_day=rest_day, rest_day_ot=rest_day_ot, rest_day_nd=rest_day_nd, rest_day_ndot=rest_day_ndot,
                                          special_holiday=special_holiday, special_holiday_ot=special_holiday_ot, special_holiday_nd=special_holiday_nd, special_holiday_ndot=special_holiday_ndot,
                                          legal_holiday=legal_holiday, legal_holiday_ot=legal_holiday_ot, legal_holiday_nd=legal_holiday_nd, legal_holiday_ndot=legal_holiday_ndot,
                                          legal_holiday_rd=legal_holiday_rd, legal_holiday_rdot=legal_holiday_rdot, legal_holiday_rdnd=legal_holiday_rdnd, legal_holiday_rdndot=legal_holiday_rdndot,
                                          incentives=incentives, adjustment=adjustment, gas=gas, load=load, other_allowance=other_allowance,
                                          rewards_adjustments=rewards_adjustments, kpi=kpi, allowances=allowances,
                                          late=late, id_deduction=id_deduction, uniform=uniform, insurance=insurance, surety_bond=surety_bond, convenience_fee=convenience_fee, general_deduction=general_deduction,
                                          deduction_details=dd_parsed)
        return Response(summary)
        try:
            if dd:
                import json as _json
                dd_parsed = _json.loads(dd)
            else:
                dd_parsed = {}
        except Exception:
            dd_parsed = {}

        summary = compute_payroll_summary(emp, start, end, basic_salary=basic, allowances=allowances, overtime_pay=overtime_pay, incentives=incentives, deduction_details=dd_parsed)
        return Response(summary)


class LiveLocationViewSet(viewsets.ModelViewSet):
    """Live location tracking"""
    queryset = LiveLocation.objects.all().order_by('-timestamp')
    serializer_class = LiveLocationSerializer
    permission_classes = [IsAuthenticated]

class ServeSavedImageView(APIView):
    """Serve images directly from the database (binary data)"""
    permission_classes = [AllowAny] # Or IsAuthenticated if preferred

    def get(self, request, pk, filename=None):
        try:
            saved_image = SavedImage.objects.get(pk=pk, is_active=True)
            if not saved_image.image_data:
                # Fallback to file if data is missing for some reason
                if saved_image.image:
                    return HttpResponse(saved_image.image.read(), content_type=saved_image.content_type or 'image/jpeg')
                raise Http404("Image data not found")
            
            response = HttpResponse(saved_image.image_data, content_type=saved_image.content_type or 'image/jpeg')
            # Optional: Add cache headers
            response['Cache-Control'] = 'public, max-age=31536000'
            return response
        except SavedImage.DoesNotExist:
            raise Http404("Image not found")
        except Exception as e:
            return Response({'error': str(e)}, status=500)

class LoginView(APIView):
    permission_classes = [AllowAny]
    
    # Track failed login attempts per user
    failed_attempts = {}
    MAX_FAILED_ATTEMPTS = 5
    
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        username = serializer.validated_data.get('username')
        password = serializer.validated_data.get('password')
        
        if not username or not password:
            return Response({'error': 'Username and password are required'}, status=status.HTTP_400_BAD_REQUEST)

        account = User.objects.filter(username=username).first()
        if not account:
            return Response({'error': 'Account did not exist'}, status=status.HTTP_400_BAD_REQUEST)
        if not account.is_active:
            return Response({'error': 'Account is disabled. Contact administrator.'}, status=status.HTTP_403_FORBIDDEN)

        user = authenticate(username=username, password=password)
        client_ip = self.get_client_ip(request)
        failed_count = self.failed_attempts.get(username, 0)
        if not user:
            # Fallback: try to authenticate using email as identifier
            email_user = User.objects.filter(email=username).first()
            if email_user:
                user = authenticate(username=email_user.username, password=password)

        if user and user.is_active:
            try:
                employee = Employee.objects.get(user=user)
                role = employee.role
                # ✓ ENABLED: Check can_login restriction to prevent unauthorized access
                if not employee.can_login:
                    SecurityAlert.objects.create(
                        employee=employee,
                        alert_type='account_disabled',
                        severity='high',
                        message=f'{employee.full_name} attempted login while account is disabled.',
                        details={
                            'username': username,
                            'ip_address': client_ip,
                            'timestamp': str(timezone.now())
                        }
                    )
                    return Response(
                        {'error': 'Account has been disabled by administrator'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            except Employee.DoesNotExist:
                employee = None
                role = 'Admin' if user.is_superuser else 'HR' if user.is_staff else 'Employee'

            self.failed_attempts[username] = 0

            ActivityLog.objects.create(
                user=user,
                employee=employee,
                role=role,
                action='login',
                details=f'{username} logged in successfully from {client_ip}',
                ip_address=client_ip
            )

            refresh = RefreshToken.for_user(user)

            return Response({
                'role': role,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'role': role
                },
                'employee': EmployeeSerializer(employee, context={'request': request}).data if employee else None,
                'token': str(refresh.access_token),
                'refresh': str(refresh)
            })

        # Known account, active user, wrong password
        self.failed_attempts[username] = failed_count + 1
        failed_count = self.failed_attempts[username]

        try:
            user_obj = User.objects.get(username=username)
            employee = Employee.objects.get(user=user_obj)
        except (User.DoesNotExist, Employee.DoesNotExist):
            employee = None

        alert_type = 'failed_login'
        severity = 'low'
        if failed_count >= self.MAX_FAILED_ATTEMPTS:
            alert_type = 'multiple_attempts'
            severity = 'high'
            message = f'Multiple failed login attempts detected for {username} ({failed_count} attempts from {client_ip})'
        else:
            message = f'Failed login attempt for {username}'

        SecurityAlert.objects.create(
            employee=employee,
            alert_type=alert_type,
            severity=severity,
            message=message,
            details={
                'username': username,
                'ip_address': client_ip,
                'failed_attempts': failed_count,
                'timestamp': str(timezone.now())
            }
        )

        if employee:
            ActivityLog.objects.create(
                employee=employee,
                role=employee.role,
                action='failed_login',
                details=f'Failed login attempt #{failed_count} for {username}',
                ip_address=client_ip
            )

        if failed_count >= self.MAX_FAILED_ATTEMPTS:
            error_msg = 'Too many failed login attempts. Please try again later.'
        else:
            error_msg = 'Password is incorrect'

        return Response({'error': error_msg}, status=status.HTTP_401_UNAUTHORIZED)

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0]
        return request.META.get('REMOTE_ADDR')


class CurrentUserView(APIView):
    """Return current authenticated user with employee data"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        try:
            employee = Employee.objects.get(user=user)
            role = employee.role
            employee_data = EmployeeSerializer(employee, context={'request': request}).data
        except Employee.DoesNotExist:
            employee = None
            role = 'Admin' if user.is_superuser else 'HR' if user.is_staff else 'Employee'
            employee_data = None
        
        return Response({
            'role': role,
            'user': {
                'id': user.id,
                'username': user.username,
                'role': role
            },
            'employee': employee_data,
        })

class EmployeeStatsView(APIView):
    def get(self, request):
        total = Employee.objects.count()
        active = Employee.objects.filter(status='Active').count()
        resign = Employee.objects.filter(status='Resign').count()
        awol = Employee.objects.filter(status='AWOL').count()
        blacklist = Employee.objects.filter(status='Blacklist').count()
        
        full_time = Employee.objects.filter(employment_type='Full-time').count()
        ocw = Employee.objects.filter(employment_type='OCW').count()
        
        return Response({
            'total': total,
            'active': active,
            'resign': resign,
            'awol': awol,
            'blacklist': blacklist,
            'fullTime': full_time,
            'ocw': ocw,
        })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_account_status(request):
    user_id = request.data.get('user_id')
    if not user_id:
        return Response({"error": "user_id required"}, status=status.HTTP_400_BAD_REQUEST)
    
    # Convert user_id to integer if it's a string
    try:
        if isinstance(user_id, str):
            user_id = int(user_id)
    except (ValueError, TypeError):
        return Response({"error": "Invalid user_id format. Must be an integer."}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        employee = Employee.objects.get(id=user_id)
        user = employee.user
        
        if not user:
            return Response({"error": "User profile not found."}, status=status.HTTP_404_NOT_FOUND)

        user.is_active = not user.is_active
        user.save()
        return Response({"message": f"User {'enabled' if user.is_active else 'disabled'} successfully.", "is_active": user.is_active})
    except Employee.DoesNotExist:
        return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    username = request.data.get('username')
    password = request.data.get('password')
    user = authenticate(username=username, password=password)

    if user is None:
        return Response({"error": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)

    if not user.is_active:
        return Response({"error": "Account is disabled. Contact administrator."}, status=status.HTTP_403_FORBIDDEN)

    # Get the associated employee
    try:
        employee = Employee.objects.get(user=user)
        employee_data = {
            'id': employee.id,
            'firstname': employee.firstname,
            'lastname': employee.lastname,
            'middle_initial': employee.middle_initial,
            'full_name': employee.full_name,
            'position': employee.position,
            'employment_type': employee.employment_type,
            'status': employee.status,
            'role': employee.role,
            'hub': employee.hub_id,
            'hub_name': employee.hub.name if employee.hub else None,
            'employee_id': employee.employee_id,
            'jtp_code': employee.jtp_code,
            'profile_image_url': employee.profile_image.url if employee.profile_image else None,
            'can_login': employee.can_login,
            'can_edit_info': employee.can_edit_info,
        }
    except Employee.DoesNotExist:
        return Response({"error": "Employee profile not found."}, status=status.HTTP_404_NOT_FOUND)

    refresh = RefreshToken.for_user(user)
    
    return Response({
        "token": str(refresh.access_token),
        "refresh": str(refresh),
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": employee.role,
        },
        "employee": employee_data,
    })

@api_view(['POST'])
def approve_edit_request(request):
    request_id = request.data.get('request_id')
    if not request_id:
        return Response({"error": "request_id required"}, status=400)
    try:
        edit_request = EditRequest.objects.get(id=request_id)
        if edit_request.status != "approved":
            return Response({"error": "Edit request not approved."}, status=status.HTTP_400_BAD_REQUEST)
        
        employee = edit_request.employee
        if not employee:
            return Response({"error": "Employee not found."}, status=status.HTTP_404_NOT_FOUND)
        
        requested_data = edit_request.requested_data or {}
        for field, value in requested_data.items():
            if hasattr(employee, field):
                setattr(employee, field, value)
        employee.save()
        return Response({"message": "Employee information updated successfully."})
    except EditRequest.DoesNotExist:
        return Response({"error": "Edit request not found."}, status=status.HTTP_404_NOT_FOUND)


# CSV Download for Payroll
@api_view(['GET'])
def download_hub_payroll_csv(request):
    import csv
    from django.http import HttpResponse
    
    hub_id = request.GET.get('hub_id') or request.query_params.get('hub_id')
    if not hub_id:
        return Response({"error": "hub_id required"}, status=400)
    
    period_start = request.GET.get('period_start') or request.query_params.get('period_start')
    period_end = request.GET.get('period_end') or request.query_params.get('period_end')
    status_filter = request.GET.get('status') or request.query_params.get('status')

    payrolls = Payroll.objects.select_related('employee', 'employee__hub').filter(
        employee__hub_id=hub_id
    )

    if period_start and period_end:
        payrolls = payrolls.filter(
            period_start=period_start,
            period_end=period_end
        )

    if status_filter:
        payrolls = payrolls.filter(status=status_filter)

    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="hub_{hub_id}_payroll.csv"'

    writer = csv.writer(response)

    # HEADER
    writer.writerow([
        'Full Name',
        'JTP Code',
        'Hub',
        'Period Start',
        'Period End',
        'Basic Salary',
        'Allowances',
        'Overtime Pay',
        'Incentives',
        'SSS',
        'PhilHealth',
        'Pag-IBIG',
        'Net Pay',
        'Status'
    ])

    # DATA
    for p in payrolls:
        writer.writerow([
            f"{p.employee.firstname} {p.employee.lastname}",
            p.employee.jtp_code,
            p.employee.hub.name if p.employee.hub else '',
            p.period_start,
            p.period_end,
            p.basic_salary,
            p.allowances,
            p.overtime_pay,
            p.incentives,
            p.sss_deduction,
            p.philhealth_deduction,
            p.pagibig_deduction,
            p.net_pay,
            p.status
        ])

    return response


# ===================== ACTIVITY LOG VIEWSET =====================

class ActivityLogViewSet(viewsets.ModelViewSet):
    """ViewSet for activity logs"""
    queryset = ActivityLog.objects.all()
    serializer_class = ActivityLogSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = ActivityLog.objects.all().select_related('employee', 'user').order_by('-created_at')
        # Apply HR hub filter so HR only sees logs for their managed hubs' employees
        queryset = apply_hr_hub_filter(queryset, self.request.user, hub_field='employee__hub')
        
        # Filter by role
        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(role=role)
        exclude_role = self.request.query_params.get('exclude_role')
        if exclude_role:
            roles = [r.strip() for r in exclude_role.split(',') if r.strip()]
            if roles:
                queryset = queryset.exclude(role__in=roles).exclude(employee__role__in=roles)
        
        # Filter by action
        action = self.request.query_params.get('action')
        if action:
            queryset = queryset.filter(action=action)
        
        # Filter by employee
        employee_id = self.request.query_params.get('employee_id')
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)

        # Server-side: if requesting user is HR, automatically exclude activities
        # that are either performed by Admins (`role='Admin'`) or target Admin employees
        try:
            user_employee = getattr(self.request.user, 'employee', None)
            if user_employee and getattr(user_employee, 'role', '').lower() == 'hr':
                queryset = queryset.exclude(
                    models.Q(role__iexact='admin')
                    | models.Q(employee__role__iexact='admin')
                    | models.Q(user__is_superuser=True)
                    | models.Q(user__employee__role__iexact='admin')
                )
        except Exception:
            pass

        return queryset

    def perform_create(self, serializer):
        """Auto-log activity on creation"""
        serializer.save()

    @action(detail=False, methods=['delete'])
    def clear_all(self, request):
        """Delete all logs visible to the user"""
        queryset = self.get_queryset()
        count = queryset.count()
        queryset.delete()
        return Response({'message': f'Successfully cleared {count} logs'}, status=status.HTTP_200_OK)
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


# ===================== SECURITY ALERT VIEWSET =====================

class SecurityAlertViewSet(viewsets.ModelViewSet):
    """ViewSet for security alerts"""
    queryset = SecurityAlert.objects.all()
    serializer_class = SecurityAlertSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = SecurityAlert.objects.all().select_related('employee', 'resolved_by').order_by('-created_at')
        
        # Filter by severity
        severity = self.request.query_params.get('severity')
        if severity:
            queryset = queryset.filter(severity=severity)
        
        # Filter by alert_type
        alert_type = self.request.query_params.get('alert_type')
        if alert_type:
            queryset = queryset.filter(alert_type=alert_type)
        
        # Filter resolved/unresolved
        resolved = self.request.query_params.get('resolved')
        if resolved is not None:
            queryset = queryset.filter(is_resolved=resolved.lower() == 'true')
        
        # Filter by employee
        employee_id = self.request.query_params.get('employee_id')
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        
        # Server-side: if requesting user is HR, automatically exclude alerts
        # that reference Admin employees
        try:
            user_employee = getattr(self.request.user, 'employee', None)
            if user_employee and getattr(user_employee, 'role', '').lower() == 'hr':
                queryset = queryset.exclude(employee__role__iexact='admin')
                admin_usernames = User.objects.filter(
                    models.Q(is_superuser=True) | models.Q(employee__role__iexact='Admin')
                ).values_list('username', flat=True).distinct()
                username_q = None
                for un in admin_usernames:
                    if not un:
                        continue
                    part = models.Q(details__username=un)
                    username_q = part if username_q is None else (username_q | part)
                if username_q is not None:
                    queryset = queryset.exclude(username_q)
        except Exception:
            pass

        return queryset

    @action(detail=True, methods=['patch'])
    def resolve(self, request, pk=None):
        """Mark alert as resolved"""
        instance = self.get_object()
        instance.is_resolved = True
        instance.resolved_by = request.user
        instance.resolved_at = timezone.now()
        instance.save()
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=False, methods=['delete'])
    def clear_all(self, request):
        """Delete all alerts visible to the user"""
        queryset = self.get_queryset()
        count = queryset.count()
        queryset.delete()
        return Response({'message': f'Successfully cleared {count} alerts'}, status=status.HTTP_200_OK)


# ===================== HR PERMISSIONS VIEWSET =====================

class HRPermissionViewSet(viewsets.ModelViewSet):
    """ViewSet for managing HR permissions"""
    queryset = HRPermission.objects.all()
    serializer_class = HRPermissionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user_employee = Employee.objects.filter(user=self.request.user).first()
        queryset = HRPermission.objects.all()
        
        # Filter by hr_employee if provided in query params
        hr_employee_id = self.request.query_params.get('hr_employee')
        if hr_employee_id:
            queryset = queryset.filter(hr_employee_id=hr_employee_id)

        # Restrict visibility if not Admin
        is_admin = self.request.user.is_superuser or self.request.user.is_staff or (user_employee and user_employee.role == 'Admin')
        if is_admin:
            return queryset
        
        # HR can only view their own permissions
        return queryset.filter(hr_employee__user=self.request.user)


# ===================== ACCOUNT MANAGEMENT ENDPOINTS =====================

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def lock_unlock_account(request, employee_id):
    """Lock or unlock an employee account (controls can_login field)"""
    try:
        employee = Employee.objects.get(id=employee_id)
        action = request.data.get('action')  # 'lock' or 'unlock'
        
        if action == 'lock':
            employee.can_login = False
        elif action == 'unlock':
            employee.can_login = True
        else:
            return Response(
                {"error": "Invalid action. Use 'lock' or 'unlock'."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        employee.save()
        
        # Get the role of the requesting user
        try:
            admin_employee = Employee.objects.get(user=request.user)
            admin_role = admin_employee.role
        except Employee.DoesNotExist:
            admin_role = 'Admin' if request.user.is_superuser else 'HR' if request.user.is_staff else 'Unknown'
        
        # Log the activity
        ActivityLog.objects.create(
            employee=employee,
            user=request.user,
            role=admin_role,
            action='update_employee',
            details=f"Account {'locked' if action == 'lock' else 'unlocked'} (can_login={employee.can_login})",
            ip_address=_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        return Response({
            "message": f"Account {'locked' if action == 'lock' else 'unlocked'} successfully.",
            "can_login": employee.can_login
        })
    except Employee.DoesNotExist:
        return Response(
            {"error": "Employee not found."},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reset_password(request, employee_id):
    """Reset employee password (Admin or authorized HR)"""
    try:
        # Check requester role and permissions
        try:
            requester_employee = Employee.objects.get(user=request.user)
            is_admin = requester_employee.role == 'Admin'
        except Employee.DoesNotExist:
            if request.user.is_superuser or request.user.is_staff:
                is_admin = True
                requester_employee = None
            else:
                return Response({"error": "Unauthorized: Requester profile not found."}, status=status.HTTP_403_FORBIDDEN)
        
        # Check HR permissions if not admin
        if not is_admin:
            if requester_employee is None or requester_employee.role != 'HR':
                return Response({"error": "Unauthorized access."}, status=status.HTTP_403_FORBIDDEN)
            
            # Check if this HR has reset_password permission
            try:
                perms = requester_employee.hr_permissions
                if not perms.can_reset_password:
                    return Response({"error": "You do not have permission to reset passwords."}, status=status.HTTP_403_FORBIDDEN)
            except HRPermission.DoesNotExist:
                return Response({"error": "HR permissions not configured."}, status=status.HTTP_403_FORBIDDEN)
        
        employee = Employee.objects.get(id=employee_id)
        user = employee.user
        if not user:
            # Self-healing: Dynamically create Django User account if it doesn't exist
            username = employee.jtp_code or employee.employee_id or f"emp_{employee.id}"
            username = username.strip().lower()
            
            from django.contrib.auth.models import User
            if User.objects.filter(username=username).exists():
                username = f"{username}_{employee.id}"
                
            user = User.objects.create_user(
                username=username,
                first_name=employee.firstname or '',
                last_name=employee.lastname or ''
            )
            employee.user = user
            employee.save()
        
        # Check if manual password provided
        manual_password = request.data.get('manual_password')
        temp_password = None
        
        if manual_password:
            if len(manual_password) < 8:
                 return Response({"error": "Password must be at least 8 characters."}, status=status.HTTP_400_BAD_REQUEST)
            user.set_password(manual_password)
            temp_password = manual_password
        else:
            # Generate temporary password
            import secrets
            import string
            temp_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))
            user.set_password(temp_password)
        
        user.save()
        
        # Log the activity
        ActivityLog.objects.create(
            employee=employee,
            user=request.user,
            role=requester_employee.role if requester_employee else 'Admin',
            action='reset_password',
            details=f"Password {'manually set' if manual_password else 'reset'} by {requester_employee.role if requester_employee else 'Admin'} for {employee.full_name}.",
            ip_address=_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        # Create security alert
        SecurityAlert.objects.create(
            employee=employee,
            alert_type='password_reset',
            severity='medium',
            message='Your password has been updated by an administrator',
            details={'reset_by': request.user.username, 'is_manual': bool(manual_password)}
        )
        
        return Response({
            "message": "Password updated successfully.",
            "temporary_password": temp_password if not manual_password else None,
            "is_manual": bool(manual_password)
        })
    except Employee.DoesNotExist:
        return Response({"error": "Employee not found."}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """Allow a user to change their own password"""
    old_password = request.data.get('old_password')
    new_password = request.data.get('new_password')
    
    if not old_password or not new_password:
        return Response({'error': 'Both current and new passwords are required.'}, status=400)
    
    user = request.user
    if not user.check_password(old_password):
        return Response({'error': 'Incorrect current password.'}, status=400)
    
    try:
        user.set_password(new_password)
        user.save()
        
        # Log this security action
        try:
            employee = Employee.objects.filter(user=user).first()
            ActivityLog.objects.create(
                user=user,
                employee=employee,
                action='change_password',
                details='User changed their own password',
                ip_address=_client_ip(request)
            )
        except Exception:
            pass
            
        return Response({'message': 'Password changed successfully.'})
    except Exception as e:
        return Response({'error': str(e)}, status=500)

# ===================== SERVE SAVED IMAGE FROM DATABASE =====================

class ServeSavedImageView(APIView):
    """
    Serve a SavedImage record's binary content directly from PostgreSQL.
    This bypasses the filesystem entirely, so images remain accessible even
    after Render restarts or redeploys (ephemeral disk is wiped on every deploy).
    """
    # NOTE: Changed to AllowAny because browsers do not send Authorization headers
    # when loading images via <img> tags. Secure this in the future with signed URLs
    # or UUIDs if necessary.
    permission_classes = [AllowAny]

    def get(self, request, pk, filename=None):
        try:
            # Try to get the record
            saved = SavedImage.objects.filter(pk=pk).first()
            if not saved:
                print(f"[ServeSavedImage] Image {pk} not found in database")
                raise Http404("Image record not found")
        except Exception as e:
            if isinstance(e, Http404):
                raise e
            print(f"[ServeSavedImage] Error fetching image {pk}: {e}")
            raise Http404("Invalid request")

        # --- 1. Prefer binary data stored in PostgreSQL ---
        if saved.image_data:
            try:
                content_type = saved.content_type or 'image/jpeg'
                # Handle memoryview or bytes
                data = saved.image_data
                if hasattr(data, 'tobytes'):
                    data = data.tobytes()
                elif not isinstance(data, (bytes, bytearray)):
                    data = bytes(data)
                
                if not data:
                    print(f"[ServeSavedImage] Image {pk} has empty image_data field")
                    raise Http404("Image data is empty")

                response = HttpResponse(data, content_type=content_type)
                fname = saved.original_filename or f'image_{pk}.jpg'
                response['Content-Disposition'] = f'inline; filename="{fname}"'
                response['Cache-Control'] = 'private, max-age=86400'
                return response
            except Exception as e:
                print(f"[ServeSavedImage] Error serving binary data for {pk}: {e}")

        # --- 2. Fallback: try to read from filesystem ---
        if saved.image:
            try:
                # check if file exists on disk
                if os.path.exists(saved.image.path):
                    saved.image.open('rb')
                    data = saved.image.read()
                    saved.image.close()
                    content_type = saved.content_type or 'image/jpeg'
                    response = HttpResponse(data, content_type=content_type)
                    fname = saved.original_filename or f'image_{pk}.jpg'
                    response['Content-Disposition'] = f'inline; filename="{fname}"'
                    response['Cache-Control'] = 'private, max-age=86400'
                    return response
            except Exception as e:
                print(f"[ServeSavedImage] FS Fallback failed for {pk}: {e}")

        print(f"[ServeSavedImage] Image {pk} has no data in DB and no file on disk")
        raise Http404("Image data not available in DB or on disk")


class DashboardAnalyticsView(APIView):
    """Single endpoint returning all analytics data for the admin dashboard."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from datetime import date as date_cls, timedelta
        from collections import defaultdict

        today = timezone.localdate()
        thirty_days_ago = today - timedelta(days=29)

        # --- Apply hub filter for HR users ---
        managed_hub_ids = get_managed_hub_ids(request.user)
        is_hr = managed_hub_ids is not None

        def filter_employees(qs):
            if managed_hub_ids is not None:
                return qs.filter(hub_id__in=managed_hub_ids)
            return qs

        def filter_hubs(qs):
            if managed_hub_ids is not None:
                return qs.filter(id__in=managed_hub_ids)
            return qs

        # ── 1. Attendance Trend last 30 days (daily present/late/absent) ──
        attendance_trend = []
        base_emp_qs = filter_employees(Employee.objects.all())
        all_active = base_emp_qs.filter(status='Active')
        active_count = all_active.count()
        total_employees_count = base_emp_qs.count()
        total_hubs_count = filter_hubs(Hub.objects.all()).count()

        employee_status_counts = {
            'Active': active_count,
            'Resign': base_emp_qs.filter(status='Resign').count(),
            'AWOL': base_emp_qs.filter(status='AWOL').count(),
            'Blacklist': base_emp_qs.filter(status='Blacklist').count(),
        }

        employment_type_counts = {
            'Full-time': all_active.filter(employment_type='Full-time').count(),
            'OCW': all_active.filter(employment_type='OCW').count(),
        }

        # Get attendance records for last 30 days
        att_qs = Attendance.objects.filter(
            date__gte=thirty_days_ago,
            date__lte=today
        )
        if managed_hub_ids is not None:
            att_qs = att_qs.filter(employee__hub_id__in=managed_hub_ids)

        # Group by date
        att_by_date = defaultdict(lambda: {'present': 0, 'late': 0, 'on_leave': 0})
        for a in att_qs.select_related('employee'):
            key = str(a.date)
            if a.clock_in_time:
                if a.clock_in_time.hour >= 10:
                    att_by_date[key]['late'] += 1
                else:
                    att_by_date[key]['present'] += 1

        # Get approved leave per day
        leave_qs = LeaveRequest.objects.filter(
            status='approved',
            start_date__lte=today,
            end_date__gte=thirty_days_ago
        )
        if managed_hub_ids is not None:
            leave_qs = leave_qs.filter(employee__hub_id__in=managed_hub_ids)

        leave_by_date = defaultdict(int)
        for lr in leave_qs:
            cur = lr.start_date
            while cur <= lr.end_date:
                if thirty_days_ago <= cur <= today:
                    leave_by_date[str(cur)] += 1
                cur += timedelta(days=1)

        # Build 30-day trend list
        cur_date = thirty_days_ago
        while cur_date <= today:
            key = str(cur_date)
            day_data = att_by_date.get(key, {'present': 0, 'late': 0})
            present = day_data.get('present', 0)
            late = day_data.get('late', 0)
            on_leave = leave_by_date.get(key, 0)
            absent = max(0, active_count - present - late - on_leave)
            attendance_trend.append({
                'date': key,
                'present': present,
                'late': late,
                'absent': absent,
                'on_leave': on_leave,
            })
            cur_date += timedelta(days=1)

        # ── 2. Top Hubs by Active Employee Count ──
        hubs_qs = filter_hubs(Hub.objects.all())
        hub_active_counts = []
        for hub in hubs_qs:
            count = filter_employees(Employee.objects.filter(hub=hub, status='Active')).count()
            hub_active_counts.append({'hub_name': hub.name, 'active_count': count})
        hub_active_counts.sort(key=lambda x: x['active_count'], reverse=True)

        # ── 3. AWOL / Resign / Blacklist by Hub ──
        awol_resign_blacklist = []
        for hub in hubs_qs:
            awol = filter_employees(Employee.objects.filter(hub=hub, status='AWOL')).count()
            resign = filter_employees(Employee.objects.filter(hub=hub, status='Resign')).count()
            blacklist = filter_employees(Employee.objects.filter(hub=hub, status='Blacklist')).count()
            if awol + resign + blacklist > 0:
                awol_resign_blacklist.append({
                    'hub_name': hub.name,
                    'awol': awol,
                    'resign': resign,
                    'blacklist': blacklist,
                })
        awol_resign_blacklist.sort(key=lambda x: x['awol'] + x['resign'] + x['blacklist'], reverse=True)

        # ── 4. Attendance Approval Status (today) ──
        att_today_qs = Attendance.objects.filter(date=today)
        if managed_hub_ids is not None:
            att_today_qs = att_today_qs.filter(employee__hub_id__in=managed_hub_ids)
        att_approved = att_today_qs.filter(is_approved=True).count()
        att_pending = att_today_qs.filter(is_approved=False).count()
        att_total = att_today_qs.count()
        attendance_approval = {
            'approved': att_approved,
            'pending': att_pending,
            'total': att_total,
        }

        # ── 5. Top Employees by Attendance Rate (best hub = most active) ──
        # Find hub with most active employees
        top_hub = None
        top_hub_name = 'All Hubs'
        if hub_active_counts:
            top_hub_name = hub_active_counts[0]['hub_name']
            top_hub = hubs_qs.filter(name=top_hub_name).first()

        # Calculate attendance rates for employees in the top hub
        top_employees = []
        if top_hub:
            hub_employees = filter_employees(Employee.objects.filter(hub=top_hub, status='Active'))
        else:
            hub_employees = filter_employees(Employee.objects.filter(status='Active'))

        # Count working days in last 30 days (weekdays only)
        working_days = 0
        cur = thirty_days_ago
        while cur <= today:
            if cur.weekday() < 5:  # Monday=0 ... Friday=4
                working_days += 1
            cur += timedelta(days=1)
        working_days = max(1, working_days)

        for emp_obj in hub_employees[:20]:  # limit to avoid N+1 slowness
            att_count = Attendance.objects.filter(
                employee=emp_obj,
                date__gte=thirty_days_ago,
                date__lte=today,
                clock_in_time__isnull=False
            ).count()
            late_count = Attendance.objects.filter(
                employee=emp_obj,
                date__gte=thirty_days_ago,
                date__lte=today,
                clock_in_time__hour__gte=10
            ).count()
            absent_count = max(0, working_days - att_count)
            rate = round((att_count / working_days) * 100, 1)
            top_employees.append({
                'name': emp_obj.full_name,
                'position': emp_obj.position or 'N/A',
                'attendance_rate': f'{rate}%',
                'late_count': late_count,
                'absent_count': absent_count,
                'hub_name': emp_obj.hub.name if emp_obj.hub else 'N/A',
            })
        top_employees.sort(key=lambda x: float(x['attendance_rate'].replace('%', '')), reverse=True)
        top_employees = top_employees[:10]

        # ── 6. Top Hubs by Overtime Hours (this month) ──
        month_start = date_cls(today.year, today.month, 1)
        hub_overtime = []
        STANDARD_DAY_HOURS = 8
        for hub in hubs_qs:
            hub_att_qs = Attendance.objects.filter(
                employee__hub=hub,
                date__gte=month_start,
                date__lte=today,
                clock_in_time__isnull=False,
                clock_out_time__isnull=False
            )
            overtime_seconds = 0.0
            for a in hub_att_qs:
                diff = (a.clock_out_time - a.clock_in_time).total_seconds()
                if diff > 0:
                    hours = diff / 3600.0
                    if hours > STANDARD_DAY_HOURS:
                        overtime_seconds += (hours - STANDARD_DAY_HOURS) * 3600.0
            overtime_hours = round(overtime_seconds / 3600.0, 1)
            if overtime_hours > 0:
                hub_overtime.append({'hub_name': hub.name, 'overtime_hours': overtime_hours})
        hub_overtime.sort(key=lambda x: x['overtime_hours'], reverse=True)

        # ── 7. Leave Requests Overview ──
        leave_all_qs = LeaveRequest.objects.all()
        if managed_hub_ids is not None:
            leave_all_qs = leave_all_qs.filter(employee__hub_id__in=managed_hub_ids)
        leave_overview = {
            'approved': leave_all_qs.filter(status='approved').count(),
            'pending': leave_all_qs.filter(status='pending').count(),
            'rejected': leave_all_qs.filter(status='rejected').count(),
            'cancelled': leave_all_qs.filter(status='cancelled').count(),
            'total': leave_all_qs.count(),
        }

        # ── 8. Security Alerts Summary ──
        alerts_qs = SecurityAlert.objects.all().order_by('-created_at')
        if is_hr:
            alerts_qs = alerts_qs.exclude(employee__role='Admin')
            if managed_hub_ids is not None:
                alerts_qs = alerts_qs.filter(
                    models.Q(employee__hub_id__in=managed_hub_ids) | models.Q(employee__isnull=True)
                )
        
        recent_alerts = []
        for alert in alerts_qs[:5]:
            recent_alerts.append({
                'id': alert.id,
                'severity': alert.severity,
                'alert_type': alert.alert_type,
                'details': alert.details if isinstance(alert.details, str) else str(alert.details),
                'created_at': alert.created_at.isoformat() if alert.created_at else None,
                'is_resolved': alert.is_resolved,
            })

        alert_counts = {
            'high': alerts_qs.filter(severity='high').count(),
            'medium': alerts_qs.filter(severity='medium').count(),
            'low': alerts_qs.filter(severity='low').count(),
            'critical': alerts_qs.filter(severity='critical').count(),
            'total': alerts_qs.count(),
            'unresolved': alerts_qs.filter(is_resolved=False).count(),
        }

        # ── 9. Online employees (same detection as /employees/online/) ──
        online_ids = _get_online_employee_ids(window_minutes=5)
        online_qs = filter_employees(Employee.objects.filter(id__in=online_ids))
        online_count = online_qs.count()

        # ── 10. Payroll / Payslip Analytics per 15 days ──
        from django.db.models import Sum
        payroll_qs = Payroll.objects.all()
        if managed_hub_ids is not None:
            payroll_qs = payroll_qs.filter(employee__hub_id__in=managed_hub_ids)

        period_totals = payroll_qs.values('period_start', 'period_end').annotate(
            total_net_pay=Sum('net_pay')
        ).order_by('period_start')

        payslip_trend = []
        for pt in list(period_totals)[-12:]:  # last 12 periods
            start_str = pt['period_start'].strftime('%b %d')
            end_str = pt['period_end'].strftime('%b %d, %Y')
            label = f"{start_str} - {end_str}"
            payslip_trend.append({
                'label': label,
                'total_pay': float(pt['total_net_pay'] or 0),
            })

        # ── 11. Highest Paid Employee per Hub ──
        highest_paid_employees = []
        for hub in hubs_qs:
            top_payroll = Payroll.objects.filter(employee__hub=hub).order_by('-net_pay').first()
            if top_payroll:
                highest_paid_employees.append({
                    'hub_name': hub.name,
                    'employee_name': top_payroll.employee.full_name,
                    'amount': float(top_payroll.net_pay),
                })
            else:
                highest_paid_employees.append({
                    'hub_name': hub.name,
                    'employee_name': 'N/A',
                    'amount': 0.0,
                })
        highest_paid_employees.sort(key=lambda x: x['amount'], reverse=True)

        # ── 12. Total Payroll Pay per Hub ──
        hub_total_pay = []
        for hub in hubs_qs:
            total_pay = Payroll.objects.filter(employee__hub=hub).aggregate(total=Sum('net_pay'))['total'] or 0
            hub_total_pay.append({
                'hub_name': hub.name,
                'total_pay': float(total_pay),
            })
        hub_total_pay.sort(key=lambda x: x['total_pay'], reverse=True)

        return Response({
            'attendance_trend': attendance_trend,
            'top_hubs_active': hub_active_counts,
            'awol_resign_blacklist': awol_resign_blacklist,
            'attendance_approval': attendance_approval,
            'top_employees': top_employees,
            'top_hub_name': top_hub_name,
            'top_hubs_overtime': hub_overtime,
            'leave_overview': leave_overview,
            'security_alerts': recent_alerts,
            'security_alert_counts': alert_counts,
            'online_count': online_count,
            'total_employees': total_employees_count,
            'active_employees': active_count,
            'total_hubs': total_hubs_count,
            'employee_status_counts': employee_status_counts,
            'employment_type_counts': employment_type_counts,
            'payslip_trend': payslip_trend,
            'highest_paid_employees': highest_paid_employees,
            'hub_total_pay': hub_total_pay,
        })


class TopEmployeesByHubView(APIView):
    """Return top 10 employees ranked by attendance rate for a specific hub."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from datetime import date as date_cls, timedelta

        today = timezone.localdate()
        thirty_days_ago = today - timedelta(days=29)

        hub_id = request.query_params.get('hub_id')
        managed_hub_ids = get_managed_hub_ids(request.user)

        # Count working days (weekdays) in last 30 days
        working_days = 0
        cur = thirty_days_ago
        while cur <= today:
            if cur.weekday() < 5:
                working_days += 1
            cur += timedelta(days=1)
        working_days = max(1, working_days)

        # Filter employees by hub (scoped to HR-managed hubs)
        if hub_id:
            try:
                hub_id_int = int(hub_id)
            except (TypeError, ValueError):
                return Response({'top_employees': [], 'hub_name': 'Invalid Hub', 'working_days': working_days})
            if managed_hub_ids is not None and hub_id_int not in managed_hub_ids:
                return Response({'top_employees': [], 'hub_name': 'Access Denied', 'working_days': working_days})
            hub_employees = Employee.objects.filter(hub_id=hub_id_int, status='Active').select_related('hub')
            hub_name = Hub.objects.filter(id=hub_id_int).values_list('name', flat=True).first() or 'Unknown Hub'
        else:
            hubs_qs = Hub.objects.all()
            if managed_hub_ids is not None:
                hubs_qs = hubs_qs.filter(id__in=managed_hub_ids)
            top_hub = hubs_qs.annotate(
                active_count=models.Count('employees', filter=models.Q(employees__status='Active'))
            ).order_by('-active_count').first()
            if top_hub:
                hub_employees = Employee.objects.filter(hub=top_hub, status='Active').select_related('hub')
                hub_name = top_hub.name
            else:
                return Response({'top_employees': [], 'hub_name': 'N/A', 'working_days': working_days})

        # Build ranked list
        results = []
        for emp_obj in hub_employees[:50]:  # cap to avoid slowness
            att_count = Attendance.objects.filter(
                employee=emp_obj,
                date__gte=thirty_days_ago,
                date__lte=today,
                clock_in_time__isnull=False,
            ).count()
            late_count = Attendance.objects.filter(
                employee=emp_obj,
                date__gte=thirty_days_ago,
                date__lte=today,
                clock_in_time__hour__gte=10,
            ).count()
            absent_count = max(0, working_days - att_count)
            rate = round((att_count / working_days) * 100, 1)
            results.append({
                'name': emp_obj.full_name,
                'position': emp_obj.position or 'N/A',
                'attendance_rate': rate,
                'attendance_rate_display': f'{rate}%',
                'late_count': late_count,
                'absent_count': absent_count,
                'hub_name': emp_obj.hub.name if emp_obj.hub else 'N/A',
            })

        results.sort(key=lambda x: x['attendance_rate'], reverse=True)
        top_10 = results[:10]

        return Response({
            'top_employees': top_10,
            'hub_name': hub_name,
            'working_days': working_days,
        })

