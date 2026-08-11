# apps/pricing/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PricingTierViewSet

router = DefaultRouter()
router.register("pricing", PricingTierViewSet)

urlpatterns = [
    path("", include(router.urls)),
]
