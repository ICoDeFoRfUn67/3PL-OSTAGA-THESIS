import json
import uuid
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework import permissions
from rest_framework.pagination import PageNumberPagination
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.utils import timezone
from .serializers import ApplicationSerializer, ApplicantSerializer
from .models import Applicant, Application, Document


class IsAdminOrHRPermission(permissions.BasePermission):
    """
    Allows access only to Admin, HR, or staff users.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_staff or request.user.is_superuser:
            return True
        user_role = getattr(request.user, 'role', '')
        if not user_role and hasattr(request.user, 'employee_profile'):
            user_role = getattr(request.user.employee_profile, 'role', '')
        user_role_str = str(user_role).strip().lower()
        return 'admin' in user_role_str or 'hr' in user_role_str


class PublicDeliveryCentersView(APIView):
    """
    Public endpoint to fetch active delivery centers / hubs for job applicants.
    """
    permission_classes = (permissions.AllowAny,)

    def get(self, request, format=None):
        try:
            from employees.models import Hub
            hubs = Hub.objects.all().order_by('name').values('id', 'name', 'location', 'city', 'address')
            return Response(list(hubs))
        except Exception:
            return Response([])


class ApplicationCreateView(APIView):
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    permission_classes = (permissions.AllowAny,)

    def post(self, request, format=None):
        def parse_json_field(val):
            if isinstance(val, str):
                try:
                    return json.loads(val)
                except Exception:
                    return val
            return val

        applicant_data = {
            'first_name': request.data.get('first_name', '').strip(),
            'middle_name': request.data.get('middle_name', '').strip(),
            'last_name': request.data.get('last_name', '').strip(),
            'dob': request.data.get('dob') or None,
            'gender': request.data.get('gender', '').strip(),
            'nationality': request.data.get('nationality', '').strip(),
            'marital_status': request.data.get('marital_status', '').strip(),
            'place_of_birth': request.data.get('place_of_birth', '').strip(),
            'email': request.data.get('email', '').strip(),
            'contact_number': request.data.get('contact_number', '').strip(),
            'current_address': request.data.get('current_address', '').strip(),
            'permanent_address': request.data.get('permanent_address', '').strip(),
            'emergency_name': request.data.get('emergency_name', '').strip(),
            'emergency_number': request.data.get('emergency_number', '').strip(),
            'emergency_relationship': request.data.get('emergency_relationship', '').strip(),
            'tin': request.data.get('tin', '').strip(),
            'sss': request.data.get('sss', '').strip(),
            'philhealth': request.data.get('philhealth', '').strip(),
            'pagibig': request.data.get('pagibig', '').strip(),
        }

        applicant_serializer = ApplicantSerializer(data=applicant_data)
        applicant_serializer.is_valid(raise_exception=True)

        driver_info = parse_json_field(request.data.get('driver_info'))
        education = parse_json_field(request.data.get('education'))
        skills = parse_json_field(request.data.get('skills'))
        employment_history = parse_json_field(request.data.get('employment_history'))

        application_data = {
            'position': request.data.get('position', '').strip(),
            'employment_type': request.data.get('employment_type', 'Full-time').strip(),
            'preferred_hub': request.data.get('preferred_hub', '').strip(),
            'preferred_start_date': request.data.get('preferred_start_date') or None,
            'driver_info': driver_info,
            'education': education,
            'skills': skills,
            'employment_history': employment_history,
            'applied_at': timezone.now(),
            'status': 'Pending',
        }

        applicant = Applicant.objects.create(**applicant_serializer.validated_data)
        reference = f"APP-{str(uuid.uuid4())[:8].upper()}"
        application = Application.objects.create(applicant=applicant, reference_number=reference, **application_data)

        # Handle uploaded files
        files = request.FILES.getlist('documents')
        for f in files:
            Document.objects.create(application=application, file=f, label=f.name)

        serializer = ApplicationSerializer(application, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ApplicationDetailView(APIView):
    permission_classes = (permissions.AllowAny,)

    def get(self, request, ref, format=None):
        app = get_object_or_404(Application, reference_number__iexact=ref)
        serializer = ApplicationSerializer(app, context={'request': request})
        return Response(serializer.data)


class AdminApplicationsList(APIView):
    permission_classes = (IsAdminOrHRPermission,)

    def get(self, request, format=None):
        qs = Application.objects.select_related('applicant').prefetch_related('documents').order_by('-applied_at')

        # Filtering
        position = request.query_params.get('position')
        hub = request.query_params.get('hub')
        status_q = request.query_params.get('status')
        search = request.query_params.get('search')

        if position and position.lower() != 'all':
            qs = qs.filter(position__iexact=position)
        if hub and hub.lower() != 'all':
            qs = qs.filter(preferred_hub__icontains=hub)
        if search:
            qs = qs.filter(
                Q(reference_number__icontains=search) |
                Q(applicant__first_name__icontains=search) |
                Q(applicant__last_name__icontains=search) |
                Q(applicant__email__icontains=search) |
                Q(applicant__contact_number__icontains=search) |
                Q(position__icontains=search) |
                Q(preferred_hub__icontains=search)
            )

        # Compute status counts BEFORE applying status filter (respects position/hub/search)
        STATUS_CHOICES = ['Pending', 'Under Review', 'Interview', 'Approved', 'Rejected']
        status_counts = {s: qs.filter(status__iexact=s).count() for s in STATUS_CHOICES}

        # Now apply status filter for the actual results list
        if status_q and status_q.lower() != 'all':
            qs = qs.filter(status__iexact=status_q)

        paginator = PageNumberPagination()
        paginator.page_size = 50
        page = paginator.paginate_queryset(qs, request)

        serializer = ApplicationSerializer(page if page is not None else qs, many=True, context={'request': request})
        if page is not None:
            response = paginator.get_paginated_response(serializer.data)
            response.data['status_counts'] = status_counts
            return response
        return Response({'results': serializer.data, 'status_counts': status_counts})


class ApplicationActionView(APIView):
    permission_classes = (IsAdminOrHRPermission,)

    def post(self, request, ref, format=None):
        action = request.data.get('action', '').strip().lower()
        notes = request.data.get('notes', '').strip()
        app = get_object_or_404(Application, reference_number__iexact=ref)

        if action == 'approve':
            app.status = 'Approved'
            if notes:
                app.rejection_notes = notes
            app.save()
            return Response({'status': 'Approved', 'message': 'Application approved successfully'})

        if action == 'reject':
            app.status = 'Rejected'
            if notes:
                app.rejection_notes = notes
            app.save()
            return Response({'status': 'Rejected', 'message': 'Application rejected'})

        if action == 'interview':
            app.status = 'Interview'
            if notes:
                app.rejection_notes = notes
            app.save()
            return Response({'status': 'Interview', 'message': 'Application moved to interview'})

        if action == 'review' or action == 'under review' or action == 'under_review':
            app.status = 'Under Review'
            if notes:
                app.rejection_notes = notes
            app.save()
            return Response({'status': 'Under Review', 'message': 'Application marked as under review'})

        if action == 'convert':
            app.status = 'Approved'
            app.save()
            employee_id = f"EMP-{str(uuid.uuid4())[:8].upper()}"
            return Response({
                'status': 'Converted',
                'employee_id': employee_id,
                'message': f'Applicant converted with employee reference {employee_id}',
            })

        return Response({'detail': f'Unknown action "{action}"'}, status=status.HTTP_400_BAD_REQUEST)
