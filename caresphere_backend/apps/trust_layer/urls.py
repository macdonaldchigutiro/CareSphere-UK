# apps/trust_layer/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TrustVerificationViewSet, ReviewViewSet

router = DefaultRouter()
router.register("verifications", TrustVerificationViewSet)
router.register("reviews", ReviewViewSet)

urlpatterns = [
    path("", include(router.urls)),
]
