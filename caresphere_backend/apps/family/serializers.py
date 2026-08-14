from rest_framework import serializers

from apps.care_providers.models import CareProvider

from .models import (
    CareCircle,
    CareCircleMember,
    FamilyDecision,
    DecisionVote,
    FamilyNote,
    SavedProvider,
)


class CareCircleSerializer(serializers.ModelSerializer):
    class Meta:
        model = CareCircle
        fields = "__all__"


class CareCircleMemberSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(
        source="user.get_full_name",
        read_only=True,
    )

    class Meta:
        model = CareCircleMember
        fields = "__all__"


class FamilyDecisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = FamilyDecision
        fields = "__all__"


class DecisionVoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = DecisionVote
        fields = "__all__"


class FamilyNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = FamilyNote
        fields = "__all__"


class SavedProviderDetailSerializer(serializers.ModelSerializer):
    availability_status = serializers.CharField(
        read_only=True,
    )

    verification_badge = serializers.CharField(
        read_only=True,
    )

    cqc_status = serializers.CharField(
        read_only=True,
    )

    class Meta:
        model = CareProvider
        fields = (
            "id",
            "company_name",
            "trading_name",
            "business_type",
            "care_types",
            "specializations",
            "city",
            "postcode",
            "county",
            "phone",
            "email",
            "website",
            "is_accepting_clients",
            "emergency_care_available",
            "is_verified",
            "verification_status",
            "cqc_verified",
            "cqc_rating",
            "hourly_rate_min",
            "hourly_rate_max",
            "accepts_local_authority_funding",
            "accepts_nhs_funding",
            "accepts_private_pay",
            "availability_status",
            "verification_badge",
            "cqc_status",
        )


class SavedProviderSerializer(serializers.ModelSerializer):
    provider = SavedProviderDetailSerializer(
        read_only=True,
    )

    provider_id = serializers.PrimaryKeyRelatedField(
        queryset=CareProvider.objects.all(),
        source="provider",
        write_only=True,
    )

    class Meta:
        model = SavedProvider
        fields = (
            "id",
            "provider",
            "provider_id",
            "notes",
            "saved_at",
        )

        read_only_fields = (
            "id",
            "saved_at",
        )

    def validate(self, attrs):
        request = self.context.get("request")
        provider = attrs.get("provider")

        if (
            request
            and request.user.is_authenticated
            and provider
            and SavedProvider.objects.filter(
                user=request.user,
                provider=provider,
            ).exists()
        ):
            raise serializers.ValidationError(
                {"provider_id": ("You have already saved this care provider.")}
            )

        return attrs
