# apps/pricing/models.py
from django.db import models

# from apps.care_providers.models import CareProvider  ← REMOVE THIS LINE
import uuid


class PricingTier(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    provider = models.ForeignKey(
        "care_providers.CareProvider",
        on_delete=models.CASCADE,
        related_name="pricing_tiers",  # ← FIXED
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    hourly_rate = models.DecimalField(max_digits=8, decimal_places=2)
    daily_rate = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True
    )
    weekly_rate = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} - {self.provider.company_name}"
