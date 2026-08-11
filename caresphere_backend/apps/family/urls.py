# apps/family/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CareCircleViewSet,
    CareCircleMemberViewSet,
    FamilyDecisionViewSet,
    FamilyNoteViewSet,
)

router = DefaultRouter()
router.register("circles", CareCircleViewSet)
router.register("members", CareCircleMemberViewSet)
router.register("decisions", FamilyDecisionViewSet)
router.register("notes", FamilyNoteViewSet)

urlpatterns = [
    path("", include(router.urls)),
]
