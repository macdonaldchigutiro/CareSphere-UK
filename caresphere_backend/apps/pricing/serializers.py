# apps/pricing/serializers.py
from rest_framework import serializers
from .models import PricingTier


class PricingTierSerializer(serializers.ModelSerializer):
    class Meta:
        model = PricingTier
        fields = "__all__"
