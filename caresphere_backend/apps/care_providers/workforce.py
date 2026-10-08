from django.db import transaction
from django.utils import timezone
from datetime import timedelta
from django.utils.dateparse import parse_datetime
from rest_framework import serializers, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from .models import CareProvider, StaffMember, ShiftBlock


def managed_provider(user):
    # Ownership, rather than a broad staff/admin flag, defines management access.
    provider = CareProvider.objects.filter(user=user).first()
    if provider:
        return provider
    links = StaffMember.objects.filter(user=user, is_active=True, role__in=['manager', 'admin', 'coordinator']).select_related('provider')
    if links.count() == 1:
        return links.first().provider
    raise PermissionDenied('A provider owner or linked management account is required.')


class ShiftBlockSerializer(serializers.ModelSerializer):
    staff_names = serializers.SerializerMethodField()
    planned_hours = serializers.SerializerMethodField()
    class Meta:
        model = ShiftBlock
        fields = ['id', 'title', 'area', 'kind', 'start_time', 'end_time', 'pay_mode', 'rate', 'staff', 'staff_names', 'notes', 'published_at', 'planned_hours']
        read_only_fields = ['id', 'published_at']
    def get_fields(self):
        fields = super().get_fields()
        fields['staff'].child_relation.queryset = StaffMember.objects.filter(provider=self.context['provider'], is_active=True)
        return fields
    def get_staff_names(self, obj):
        return [{'id': str(s.id), 'name': s.full_name} for s in obj.staff.all()]
    def get_planned_hours(self, obj):
        return round((obj.end_time - obj.start_time).total_seconds() / 3600, 2)
    def validate(self, attrs):
        instance = self.instance
        start = attrs.get('start_time', instance.start_time if instance else None)
        end = attrs.get('end_time', instance.end_time if instance else None)
        if end <= start:
            raise ValidationError({'end_time': 'End time must be after start time.'})
        if instance and instance.published_at:
            raise ValidationError('Unpublish the block before editing it.')
        return attrs


def validate_publication(block):
    staff = list(block.staff.all())
    if not staff:
        raise ValidationError('Assign at least one staff member before publishing.')
    if any(not s.is_active or s.provider_id != block.provider_id for s in staff):
        raise ValidationError('Every assignee must be active and belong to this provider.')
    if block.end_time <= timezone.now():
        raise ValidationError('A block that has ended cannot be published.')
    conflicts = ShiftBlock.objects.filter(published_at__isnull=False, staff__in=staff, start_time__lt=block.end_time, end_time__gt=block.start_time).exclude(pk=block.pk)
    if conflicts.exists():
        raise ValidationError('An assigned staff member already has an overlapping published block, including time off.')


class ShiftBlockViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ShiftBlockSerializer
    pagination_class = None
    http_method_names = ['get', 'post', 'patch', 'head', 'options']
    def get_queryset(self):
        blocks = ShiftBlock.objects.filter(provider=managed_provider(self.request.user)).prefetch_related('staff')
        if self.action == 'list':
            now = timezone.now()
            start = parse_datetime(self.request.query_params.get('start', now.isoformat()))
            end = parse_datetime(self.request.query_params.get('end', (now + timedelta(days=7)).isoformat()))
            if not start or not end or timezone.is_naive(start) or timezone.is_naive(end) or end <= start or end-start > timedelta(days=31):
                raise ValidationError('Choose an aware date range of up to 31 days.')
            blocks = blocks.filter(start_time__lt=end, end_time__gt=start)
        return blocks
    def get_serializer_context(self):
        return {**super().get_serializer_context(), 'provider': managed_provider(self.request.user)}
    def perform_create(self, serializer):
        serializer.save(provider=managed_provider(self.request.user))
    def update(self, request, *args, **kwargs):
        with transaction.atomic():
            provider = managed_provider(request.user)
            CareProvider.objects.select_for_update().get(pk=provider.pk)
            return super().update(request, *args, **kwargs)
    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        with transaction.atomic():
            provider = managed_provider(request.user)
            CareProvider.objects.select_for_update().get(pk=provider.pk)
            block = self.get_object()
            validate_publication(block)
            if not block.published_at:
                block.published_at = timezone.now()
                block.save(update_fields=['published_at', 'updated_at'])
            return Response(self.get_serializer(block).data)
    @action(detail=True, methods=['post'])
    def unpublish(self, request, pk=None):
        with transaction.atomic():
            provider = managed_provider(request.user)
            CareProvider.objects.select_for_update().get(pk=provider.pk)
            block = self.get_object()
            block.published_at = None
            block.save(update_fields=['published_at', 'updated_at'])
            return Response(self.get_serializer(block).data)
    @action(detail=False, methods=['get'])
    def my_rota(self, request):
        # Workers only receive blocks assigned to their own linked staff record.
        blocks = ShiftBlock.objects.filter(published_at__isnull=False, staff__user=request.user, staff__is_active=True).distinct().order_by('start_time')
        data = [{'id': str(b.id), 'title': b.title, 'area': b.area, 'kind': b.kind, 'start_time': b.start_time, 'end_time': b.end_time, 'planned_hours': round((b.end_time-b.start_time).total_seconds()/3600, 2)} for b in blocks]
        return Response(data)
