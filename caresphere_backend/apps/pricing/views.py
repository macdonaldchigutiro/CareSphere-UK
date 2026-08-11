# apps/pricing/views.py
from rest_framework import viewsets, permissions
from .models import PricingTier
from .serializers import PricingTierSerializer


class PricingTierViewSet(viewsets.ModelViewSet):
    queryset = PricingTier.objects.all()
    serializer_class = PricingTierSerializer
    permission_classes = [permissions.IsAuthenticated]
