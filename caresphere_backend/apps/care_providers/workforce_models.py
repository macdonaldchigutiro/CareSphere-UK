"""Provider-owned shift blocks. Publication is separate from care delivery."""
import uuid
from django.db import models
from django.core.validators import MinValueValidator
from .models import CareProvider, StaffMember


class ShiftBlock(models.Model):
    class Kind(models.TextChoices):
        CARE = 'care', 'Care'
        TRAINING = 'training', 'Training'
        SUPERVISION = 'supervision', 'Supervision'
        HR = 'hr', 'HR'
        TIME_OFF = 'time_off', 'Time off'
    class PayMode(models.TextChoices):
        HOURLY = 'hourly', 'Hourly'
        FIXED = 'fixed', 'Fixed block'
        INCENTIVE = 'incentive', 'Incentive block'
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    provider = models.ForeignKey(CareProvider, on_delete=models.CASCADE, related_name='shift_blocks')
    title = models.CharField(max_length=120)
    area = models.CharField(max_length=100)
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.CARE)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    pay_mode = models.CharField(max_length=20, choices=PayMode.choices, default=PayMode.HOURLY)
    rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0)])
    staff = models.ManyToManyField(StaffMember, related_name='shift_blocks', blank=True)
    notes = models.TextField(blank=True, max_length=2000)
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        ordering = ['start_time', 'title']
        indexes = [models.Index(fields=['provider', 'start_time'])]
        constraints = [models.CheckConstraint(check=models.Q(end_time__gt=models.F('start_time')), name='shift_block_positive_duration')]
