from apps.care_providers.models import CareProvider
from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import (
    CareCircle,
    CareCircleMember,
    CommunicationThread,
    DecisionVote,
    FamilyDecision,
    FamilyNote,
    MessageReadReceipt,
    SavedProvider,
    ThreadMessage,
    ThreadParticipation,
)

User = get_user_model()


# ======================================================
# CARE CIRCLE
# ======================================================


class CareCircleSerializer(serializers.ModelSerializer):
    service_user_name = serializers.CharField(
        source="service_user.full_name",
        read_only=True,
    )

    member_count = serializers.SerializerMethodField()

    primary_contact_name = serializers.SerializerMethodField()

    class Meta:
        model = CareCircle

        fields = (
            "id",
            "service_user",
            "service_user_name",
            "name",
            "description",
            "is_active",
            "requires_consensus",
            "consensus_threshold",
            "allow_external_invites",
            "auto_share_updates",
            "member_count",
            "primary_contact_name",
            "created_at",
            "updated_at",
        )

        read_only_fields = (
            "id",
            "service_user_name",
            "member_count",
            "primary_contact_name",
            "created_at",
            "updated_at",
        )

    def get_member_count(self, obj):
        return obj.members.filter(
            is_active=True,
        ).count()

    def get_primary_contact_name(self, obj):
        member = (
            obj.members.filter(
                role=CareCircleMember.MemberRole.PRIMARY,
                is_active=True,
            )
            .select_related("user")
            .first()
        )

        if not member:
            return ""

        name = member.user.get_full_name().strip()

        return name or member.user.email or member.user.username

    def validate_service_user(
        self,
        service_user,
    ):
        request = self.context.get("request")

        if not request:
            return service_user

        user = request.user

        if user.is_staff or user.is_superuser:
            return service_user

        if service_user.managed_by_id != user.id:
            raise serializers.ValidationError(
                "You can only create a Family Circle " "for someone you manage."
            )

        return service_user


# ======================================================
# CARE CIRCLE MEMBER
# ======================================================


class CareCircleMemberSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(
        read_only=True,
    )

    user_email = serializers.EmailField(
        write_only=True,
        required=True,
    )

    user_name = serializers.SerializerMethodField()

    email = serializers.EmailField(
        source="user.email",
        read_only=True,
    )

    role_display = serializers.CharField(
        source="get_role_display",
        read_only=True,
    )

    relationship_display = serializers.CharField(
        source="get_relationship_display",
        read_only=True,
    )

    care_circle_name = serializers.CharField(
        source="care_circle.name",
        read_only=True,
    )

    class Meta:
        model = CareCircleMember

        fields = (
            "id",
            "care_circle",
            "care_circle_name",
            "user",
            "user_email",
            "user_name",
            "email",
            "role",
            "role_display",
            "relationship",
            "relationship_display",
            "nickname",
            "can_invite_members",
            "can_manage_bookings",
            "can_view_financials",
            "can_make_decisions",
            "can_edit_profiles",
            "is_active",
            "is_verified",
            "notification_preferences",
            "joined_at",
            "last_active",
        )

        read_only_fields = (
            "id",
            "user",
            "user_name",
            "email",
            "care_circle_name",
            "role_display",
            "relationship_display",
            "is_verified",
            "joined_at",
            "last_active",
        )

    def get_user_name(self, obj):
        name = obj.user.get_full_name().strip()

        return name or obj.user.email or obj.user.username

    def validate_user_email(
        self,
        value,
    ):
        email = value.lower().strip()

        try:
            user = User.objects.get(email__iexact=email)

        except User.DoesNotExist:
            raise serializers.ValidationError(
                "No CareSphere account exists " "with this email address."
            )

        self.context["resolved_member_user"] = user

        return email

    def validate(
        self,
        attrs,
    ):
        care_circle = attrs.get("care_circle")

        user = self.context.get("resolved_member_user")

        if (
            care_circle
            and user
            and CareCircleMember.objects.filter(
                care_circle=care_circle,
                user=user,
            ).exists()
        ):
            raise serializers.ValidationError(
                {
                    "user_email": (
                        "This person is already " "a member of the Family Circle."
                    )
                }
            )

        return attrs

    def create(
        self,
        validated_data,
    ):
        validated_data.pop(
            "user_email",
            None,
        )

        user = self.context.get("resolved_member_user")

        return CareCircleMember.objects.create(
            user=user,
            **validated_data,
        )


# ======================================================
# FAMILY DECISION
# ======================================================


class FamilyDecisionSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()

    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )

    decision_type_display = serializers.CharField(
        source="get_decision_type_display",
        read_only=True,
    )

    total_votes = serializers.SerializerMethodField()

    has_voted = serializers.SerializerMethodField()

    current_user_vote = serializers.SerializerMethodField()

    class Meta:
        model = FamilyDecision

        fields = (
            "id",
            "care_circle",
            "created_by",
            "created_by_name",
            "title",
            "description",
            "decision_type",
            "decision_type_display",
            "options",
            "status",
            "status_display",
            "voting_deadline",
            "minimum_votes",
            "allow_abstain",
            "is_anonymous",
            "chosen_option",
            "approval_rate",
            "total_votes",
            "has_voted",
            "current_user_vote",
            "created_at",
            "voting_started_at",
            "voting_ended_at",
            "decided_at",
        )

        read_only_fields = (
            "id",
            "created_by",
            "created_by_name",
            "status",
            "status_display",
            "decision_type_display",
            "chosen_option",
            "approval_rate",
            "total_votes",
            "has_voted",
            "current_user_vote",
            "created_at",
            "voting_started_at",
            "voting_ended_at",
            "decided_at",
        )

    def get_created_by_name(
        self,
        obj,
    ):
        if not obj.created_by:
            return ""

        name = obj.created_by.get_full_name().strip()

        return name or obj.created_by.email or obj.created_by.username

    def get_current_user_vote_object(
        self,
        obj,
    ):
        request = self.context.get("request")

        if not request or not request.user or not request.user.is_authenticated:
            return None

        return (
            obj.votes.filter(
                voter__user=request.user,
                voter__is_active=True,
            )
            .select_related(
                "voter",
                "voter__user",
            )
            .first()
        )

    def get_total_votes(
        self,
        obj,
    ):
        """
        Return the live number of votes stored for this decision.

        This keeps the API vote count in sync with DecisionVote records
        even if the cached FamilyDecision.total_votes field is stale.
        """
        return obj.votes.count()

    def get_has_voted(
        self,
        obj,
    ):
        return self.get_current_user_vote_object(obj) is not None

    def get_current_user_vote(
        self,
        obj,
    ):
        vote = self.get_current_user_vote_object(obj)

        if not vote:
            return None

        return {
            "id": vote.id,
            "chosen_option": vote.chosen_option,
            "is_abstained": vote.is_abstained,
            "comments": vote.comments,
            "voted_at": vote.voted_at,
        }


# ======================================================
# DECISION VOTE
# ======================================================


class DecisionVoteSerializer(serializers.ModelSerializer):
    voter_name = serializers.SerializerMethodField()

    class Meta:
        model = DecisionVote

        fields = (
            "id",
            "decision",
            "voter",
            "voter_name",
            "chosen_option",
            "vote_weight",
            "is_abstained",
            "comments",
            "voted_at",
            "updated_at",
        )

        read_only_fields = (
            "id",
            "voter",
            "voter_name",
            "voted_at",
            "updated_at",
        )

    def get_voter_name(
        self,
        obj,
    ):
        name = obj.voter.user.get_full_name().strip()

        return name or obj.voter.user.email or obj.voter.user.username


# ======================================================
# FAMILY NOTE
# ======================================================


class FamilyNoteSerializer(serializers.ModelSerializer):
    author = serializers.PrimaryKeyRelatedField(
        read_only=True,
    )

    author_user_id = serializers.IntegerField(
        source="author.user_id",
        read_only=True,
    )

    author_name = serializers.SerializerMethodField()

    note_type_display = serializers.CharField(
        source="get_note_type_display",
        read_only=True,
    )

    privacy_level_display = serializers.CharField(
        source="get_privacy_level_display",
        read_only=True,
    )

    class Meta:
        model = FamilyNote

        fields = (
            "id",
            "care_circle",
            "author",
            "author_user_id",
            "author_name",
            "title",
            "content",
            "note_type",
            "note_type_display",
            "privacy_level",
            "privacy_level_display",
            "tags",
            "attachments",
            "visible_to",
            "is_pinned",
            "created_at",
            "updated_at",
            "last_viewed",
        )

        read_only_fields = (
            "id",
            "author",
            "author_user_id",
            "author_name",
            "note_type_display",
            "privacy_level_display",
            "created_at",
            "updated_at",
            "last_viewed",
        )

    def get_author_name(
        self,
        obj,
    ):
        name = obj.author.user.get_full_name().strip()

        return name or obj.author.user.email or obj.author.user.username

# ======================================================
# FAMILY DISCUSSIONS
# ======================================================


class ThreadMessageSerializer(serializers.ModelSerializer):
    sender = serializers.PrimaryKeyRelatedField(
        read_only=True,
    )

    sender_name = serializers.SerializerMethodField()

    sender_user_id = serializers.IntegerField(
        source="sender.user_id",
        read_only=True,
    )

    is_read_by_current_user = serializers.SerializerMethodField()

    read_count = serializers.SerializerMethodField()

    class Meta:
        model = ThreadMessage

        fields = (
            "id",
            "thread",
            "sender",
            "sender_user_id",
            "sender_name",
            "content",
            "attachments",
            "is_edited",
            "edit_history",
            "is_read_by_current_user",
            "read_count",
            "created_at",
            "updated_at",
        )

        read_only_fields = (
            "id",
            "sender",
            "sender_user_id",
            "sender_name",
            "is_edited",
            "edit_history",
            "is_read_by_current_user",
            "read_count",
            "created_at",
            "updated_at",
        )

    def get_sender_name(
        self,
        obj,
    ):
        name = obj.sender.user.get_full_name().strip()

        return name or obj.sender.user.email or obj.sender.user.username

    def get_is_read_by_current_user(
        self,
        obj,
    ):
        request = self.context.get("request")

        if not request or not request.user or not request.user.is_authenticated:
            return False

        return obj.read_receipts.filter(
            reader__user=request.user,
            reader__is_active=True,
        ).exists()

    def get_read_count(
        self,
        obj,
    ):
        return obj.read_receipts.count()


class ThreadParticipationSerializer(serializers.ModelSerializer):
    participant_name = serializers.SerializerMethodField()

    participant_email = serializers.EmailField(
        source="participant.user.email",
        read_only=True,
    )

    class Meta:
        model = ThreadParticipation

        fields = (
            "id",
            "thread",
            "participant",
            "participant_name",
            "participant_email",
            "joined_at",
        )

        read_only_fields = (
            "id",
            "participant_name",
            "participant_email",
            "joined_at",
        )

    def get_participant_name(
        self,
        obj,
    ):
        name = obj.participant.user.get_full_name().strip()

        return name or obj.participant.user.email or obj.participant.user.username


class MessageReadReceiptSerializer(serializers.ModelSerializer):
    reader_name = serializers.SerializerMethodField()

    class Meta:
        model = MessageReadReceipt

        fields = (
            "id",
            "message",
            "reader",
            "reader_name",
            "read_at",
        )

        read_only_fields = (
            "id",
            "reader",
            "reader_name",
            "read_at",
        )

    def get_reader_name(
        self,
        obj,
    ):
        name = obj.reader.user.get_full_name().strip()

        return name or obj.reader.user.email or obj.reader.user.username


class CommunicationThreadSerializer(serializers.ModelSerializer):
    started_by = serializers.PrimaryKeyRelatedField(
        read_only=True,
    )

    started_by_name = serializers.SerializerMethodField()

    service_user_id = serializers.UUIDField(
        source="care_circle.service_user_id",
        read_only=True,
    )

    service_user_name = serializers.CharField(
        source="care_circle.service_user.full_name",
        read_only=True,
    )

    participant_count = serializers.SerializerMethodField()

    participant_details = serializers.SerializerMethodField()

    message_count = serializers.SerializerMethodField()

    latest_message = serializers.SerializerMethodField()

    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = CommunicationThread

        fields = (
            "id",
            "care_circle",
            "service_user_id",
            "service_user_name",
            "started_by",
            "started_by_name",
            "subject",
            "is_locked",
            "is_archived",
            "participants",
            "participant_count",
            "participant_details",
            "message_count",
            "latest_message",
            "unread_count",
            "last_message_at",
            "created_at",
            "updated_at",
        )

        read_only_fields = (
            "id",
            "service_user_id",
            "service_user_name",
            "started_by",
            "started_by_name",
            "participant_count",
            "participant_details",
            "message_count",
            "latest_message",
            "unread_count",
            "last_message_at",
            "created_at",
            "updated_at",
        )

    def get_started_by_name(
        self,
        obj,
    ):
        if not obj.started_by:
            return ""

        name = obj.started_by.user.get_full_name().strip()

        return name or obj.started_by.user.email or obj.started_by.user.username

    def get_participant_count(
        self,
        obj,
    ):
        return obj.participants.filter(
            is_active=True,
        ).count()

    def get_message_count(
    self,
    obj,
):
      return obj.messages.count()


    def get_participant_details(
        self,
        obj,
    ):
        participants = obj.participants.filter(
            is_active=True,
        ).select_related(
            "user",
        )

        return [
            {
                "id": member.id,
                "user_id": member.user_id,
                "name": (
                    member.user.get_full_name().strip()
                    or member.user.email
                    or member.user.username
                ),
                "email": member.user.email,
                "role": member.role,
                "role_display": (member.get_role_display()),
            }
            for member in participants
        ]

    def get_latest_message(
        self,
        obj,
    ):
        message = (
            obj.messages.select_related(
                "sender",
                "sender__user",
            )
            .order_by(
                "-created_at",
            )
            .first()
        )

        if not message:
            return None

        return ThreadMessageSerializer(
            message,
            context=self.context,
        ).data

    def get_unread_count(
        self,
        obj,
    ):
        request = self.context.get("request")

        if not request or not request.user or not request.user.is_authenticated:
            return 0

        membership = obj.participants.filter(
            user=request.user,
            is_active=True,
        ).first()

        if not membership:
            return 0

        return (
            obj.messages.exclude(
                sender=membership,
            )
            .exclude(
                read_receipts__reader=membership,
            )
            .distinct()
            .count()
        )


# ======================================================
# SAVED PROVIDER DETAIL
# ======================================================


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


# ======================================================
# SAVED PROVIDER
# ======================================================


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

    def validate(
        self,
        attrs,
    ):
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
                {"provider_id": ("You have already saved " "this care provider.")}
            )

        return attrs
