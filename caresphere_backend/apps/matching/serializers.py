# apps/matching/serializers.py
from rest_framework import serializers
from .models import Match
from apps.users.serializers import UserSerializer
from apps.care_providers.serializers import CareProviderSerializer


class MatchSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source="user", read_only=True)
    provider_details = CareProviderSerializer(source="provider", read_only=True)

    class Meta:
        model = Match
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at")
