# apps/service_users/views.py
from rest_framework import viewsets, permissions
from .models import ServiceUserProfile
from .serializers import ServiceUserProfileSerializer


class ServiceUserProfileViewSet(viewsets.ModelViewSet):
    queryset = ServiceUserProfile.objects.all()
    serializer_class = ServiceUserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
