# apps/trust_layer/serializers.py
from rest_framework import serializers

from .models import Review, TrustVerification


class TrustVerificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrustVerification
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at", "overall_trust_score")


class ReviewSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.get_full_name", read_only=True)

    class Meta:
        model = Review
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at")
