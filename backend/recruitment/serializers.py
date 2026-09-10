from rest_framework import serializers
from .models import Applicant, Application, Document


class DocumentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = ('id', 'label', 'file', 'file_url', 'uploaded_at')

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class ApplicantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Applicant
        fields = '__all__'

    def validate_contact_number(self, value):
        if value and not str(value).isdigit():
            raise serializers.ValidationError('Contact number must contain digits only.')
        if value and len(str(value)) != 11:
            raise serializers.ValidationError('Contact number must contain exactly 11 digits.')
        return value


class ApplicationSerializer(serializers.ModelSerializer):
    applicant = ApplicantSerializer()
    documents = DocumentSerializer(many=True, read_only=True)

    class Meta:
        model = Application
        fields = (
            'id',
            'reference_number',
            'applicant',
            'position',
            'employment_type',
            'preferred_hub',
            'preferred_start_date',
            'driver_info',
            'education',
            'skills',
            'employment_history',
            'rejection_notes',
            'status',
            'applied_at',
            'documents',
        )

    def create(self, validated_data):
        applicant_data = validated_data.pop('applicant')
        applicant = Applicant.objects.create(**applicant_data)
        application = Application.objects.create(applicant=applicant, **validated_data)
        return application
