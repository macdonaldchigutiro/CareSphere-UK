# apps/matching/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MatchViewSet

router = DefaultRouter()
router.register("matches", MatchViewSet)

urlpatterns = [
    path("", include(router.urls)),
]
