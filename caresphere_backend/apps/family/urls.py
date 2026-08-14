from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CareCircleViewSet,
    CareCircleMemberViewSet,
    FamilyDecisionViewSet,
    FamilyNoteViewSet,
    SavedProviderViewSet,
)

router = DefaultRouter()

router.register(
    "circles",
    CareCircleViewSet,
)

router.register(
    "members",
    CareCircleMemberViewSet,
)

router.register(
    "decisions",
    FamilyDecisionViewSet,
)

router.register(
    "notes",
    FamilyNoteViewSet,
)

router.register(
    "saved-providers",
    SavedProviderViewSet,
    basename="saved-provider",
)


urlpatterns = [
    path("", include(router.urls)),
]
