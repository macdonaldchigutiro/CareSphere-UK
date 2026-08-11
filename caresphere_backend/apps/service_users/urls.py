# apps/service_users/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ServiceUserProfileViewSet

router = DefaultRouter()
router.register("profiles", ServiceUserProfileViewSet)

urlpatterns = [
    path("", include(router.urls)),
]
