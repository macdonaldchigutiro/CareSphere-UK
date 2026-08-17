from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ServiceUserProfileViewSet

router = DefaultRouter()

router.register(
    r"profiles",
    ServiceUserProfileViewSet,
    basename="service-user-profile",
)


urlpatterns = [
    path("", include(router.urls)),
]
