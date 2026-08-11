# apps/service_users/serializers.py
from rest_framework import serializers
from .models import ServiceUserProfile


class ServiceUserProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = ServiceUserProfile
        fields = "__all__"
