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
    basename="care-circle",
)

router.register(
    "members",
    CareCircleMemberViewSet,
    basename="care-circle-member",
)

router.register(
    "decisions",
    FamilyDecisionViewSet,
    basename="family-decision",
)

router.register(
    "notes",
    FamilyNoteViewSet,
    basename="family-note",
)

router.register(
    "saved-providers",
    SavedProviderViewSet,
    basename="saved-provider",
)


urlpatterns = [
    path(
        "",
        include(router.urls),
    ),
]
