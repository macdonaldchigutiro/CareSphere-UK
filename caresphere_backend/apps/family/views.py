from django.db.models import Q
from django.utils import timezone

from rest_framework import (
    permissions,
    status,
    viewsets,
)

from rest_framework.decorators import action
from rest_framework.exceptions import (
    PermissionDenied,
    ValidationError,
)
from rest_framework.response import Response

from .models import (
    CareCircle,
    CareCircleMember,
    FamilyDecision,
    DecisionVote,
    FamilyNote,
    SavedProvider,
)

from .serializers import (
    CareCircleSerializer,
    CareCircleMemberSerializer,
    FamilyDecisionSerializer,
    DecisionVoteSerializer,
    FamilyNoteSerializer,
    SavedProviderSerializer,
)

# ======================================================
# SHARED HELPERS
# ======================================================


def accessible_circle_ids(user):
    """
    Returns IDs of Family Circles the logged-in user
    is allowed to access.
    """

    if user.is_staff or user.is_superuser:
        return CareCircle.objects.values_list(
            "id",
            flat=True,
        )

    return (
        CareCircle.objects.filter(
            Q(service_user__managed_by=user)
            | Q(
                members__user=user,
                members__is_active=True,
            )
        )
        .distinct()
        .values_list(
            "id",
            flat=True,
        )
    )


def get_circle_membership(
    user,
    care_circle,
):
    return CareCircleMember.objects.filter(
        care_circle=care_circle,
        user=user,
        is_active=True,
    ).first()


def can_manage_decisions(
    user,
    care_circle,
):
    """
    Returns True if the user can create, start,
    or calculate Family Circle decisions.
    """

    if user.is_staff or user.is_superuser:
        return True

    if care_circle.service_user.managed_by_id == user.id:
        return True

    membership = get_circle_membership(
        user,
        care_circle,
    )

    if not membership:
        return False

    return membership.can_make_decisions or membership.role in [
        CareCircleMember.MemberRole.PRIMARY,
        CareCircleMember.MemberRole.ADMIN,
        CareCircleMember.MemberRole.DECISION_MAKER,
    ]


def can_vote_on_decision(
    user,
    care_circle,
):
    """
    Determines whether a Family Circle member may vote.
    """

    if user.is_staff or user.is_superuser:
        return False

    membership = get_circle_membership(
        user,
        care_circle,
    )

    if not membership:
        return False

    return membership.can_make_decisions or membership.role in [
        CareCircleMember.MemberRole.PRIMARY,
        CareCircleMember.MemberRole.ADMIN,
        CareCircleMember.MemberRole.DECISION_MAKER,
    ]


def update_live_vote_totals(decision):
    """
    Updates current vote statistics without closing
    the decision.
    """

    votes = decision.votes.all()

    decision.total_votes = votes.count()

    normal_votes = votes.filter(is_abstained=False)

    option_counts = {}

    for vote in normal_votes:
        option = vote.chosen_option

        option_counts[option] = (
            option_counts.get(
                option,
                0,
            )
            + vote.vote_weight
        )

    winning_option = None
    winning_votes = 0

    for option, count in option_counts.items():
        if count > winning_votes:
            winning_votes = count
            winning_option = option

    weighted_votes = sum(option_counts.values())

    if weighted_votes > 0:
        decision.approval_rate = (winning_votes / weighted_votes) * 100
    else:
        decision.approval_rate = 0

    decision.chosen_option = winning_option

    decision.save(
        update_fields=[
            "total_votes",
            "approval_rate",
            "chosen_option",
        ]
    )


# ======================================================
# CARE CIRCLE
# ======================================================


class CareCircleViewSet(viewsets.ModelViewSet):
    serializer_class = CareCircleSerializer

    permission_classes = [
        permissions.IsAuthenticated,
    ]

    def get_queryset(self):
        user = self.request.user

        queryset = (
            CareCircle.objects.select_related(
                "service_user",
                "service_user__managed_by",
            )
            .prefetch_related(
                "members",
                "members__user",
            )
            .order_by("-created_at")
        )

        if user.is_staff or user.is_superuser:
            return queryset

        return queryset.filter(id__in=accessible_circle_ids(user)).distinct()

    def perform_create(
        self,
        serializer,
    ):
        service_user = serializer.validated_data["service_user"]

        user = self.request.user

        if not (user.is_staff or user.is_superuser):
            if service_user.managed_by_id != user.id:
                raise PermissionDenied(
                    "You can only create " "a Family Circle for " "someone you manage."
                )

        if CareCircle.objects.filter(service_user=service_user).exists():
            raise ValidationError(
                {"service_user": ("This person already " "has a Family Circle.")}
            )

        circle = serializer.save()

        CareCircleMember.objects.get_or_create(
            care_circle=circle,
            user=user,
            defaults={
                "role": CareCircleMember.MemberRole.PRIMARY,
                "relationship": CareCircleMember.Relationship.OTHER,
                "nickname": "",
                "can_invite_members": True,
                "can_manage_bookings": True,
                "can_view_financials": True,
                "can_make_decisions": True,
                "can_edit_profiles": True,
                "is_active": True,
                "is_verified": True,
                "notification_preferences": {},
            },
        )


# ======================================================
# CARE CIRCLE MEMBER
# ======================================================


class CareCircleMemberViewSet(viewsets.ModelViewSet):
    serializer_class = CareCircleMemberSerializer

    permission_classes = [
        permissions.IsAuthenticated,
    ]

    def get_queryset(self):
        user = self.request.user

        queryset = CareCircleMember.objects.select_related(
            "care_circle",
            "care_circle__service_user",
            "user",
        ).order_by(
            "role",
            "joined_at",
        )

        if user.is_staff or user.is_superuser:
            return queryset

        return queryset.filter(care_circle_id__in=accessible_circle_ids(user))

    def perform_create(
        self,
        serializer,
    ):
        circle = serializer.validated_data["care_circle"]

        user = self.request.user

        if not (user.is_staff or user.is_superuser):
            membership = get_circle_membership(
                user,
                circle,
            )

            manages_recipient = circle.service_user.managed_by_id == user.id

            allowed = manages_recipient or (
                membership
                and (
                    membership.can_invite_members
                    or membership.role
                    in [
                        CareCircleMember.MemberRole.PRIMARY,
                        CareCircleMember.MemberRole.ADMIN,
                    ]
                )
            )

            if not allowed:
                raise PermissionDenied(
                    "You do not have permission "
                    "to add members to this "
                    "Family Circle."
                )

        serializer.save()


# ======================================================
# FAMILY DECISION
# ======================================================


class FamilyDecisionViewSet(viewsets.ModelViewSet):
    serializer_class = FamilyDecisionSerializer

    permission_classes = [
        permissions.IsAuthenticated,
    ]

    def get_queryset(self):
        user = self.request.user

        queryset = (
            FamilyDecision.objects.select_related(
                "care_circle",
                "care_circle__service_user",
                "care_circle__service_user__managed_by",
                "created_by",
            )
            .prefetch_related(
                "votes",
                "votes__voter",
                "votes__voter__user",
            )
            .order_by("-created_at")
        )

        if user.is_staff or user.is_superuser:
            return queryset

        return queryset.filter(care_circle_id__in=accessible_circle_ids(user))

    def perform_create(
        self,
        serializer,
    ):
        circle = serializer.validated_data["care_circle"]

        user = self.request.user

        if not can_manage_decisions(
            user,
            circle,
        ):
            raise PermissionDenied(
                "You do not have permission "
                "to create decisions in "
                "this Family Circle."
            )

        serializer.save(created_by=user)

    # ==================================================
    # START VOTING
    # ==================================================

    @action(
        detail=True,
        methods=["post"],
        url_path="start-voting",
    )
    def start_voting(
        self,
        request,
        pk=None,
    ):
        decision = self.get_object()

        if not can_manage_decisions(
            request.user,
            decision.care_circle,
        ):
            return Response(
                {
                    "detail": (
                        "You do not have permission "
                        "to start voting on this decision."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if decision.status != FamilyDecision.DecisionStatus.DRAFT:
            return Response(
                {"detail": ("Only draft decisions " "can be opened for voting.")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (
            not isinstance(
                decision.options,
                list,
            )
            or len(decision.options) < 2
        ):
            return Response(
                {
                    "detail": (
                        "A decision must have "
                        "at least two options "
                        "before voting can start."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        decision.status = FamilyDecision.DecisionStatus.VOTING

        decision.voting_started_at = timezone.now()

        decision.save(
            update_fields=[
                "status",
                "voting_started_at",
            ]
        )

        serializer = self.get_serializer(decision)

        return Response(
            {
                "message": ("Voting started successfully."),
                "decision": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    # ==================================================
    # CAST VOTE
    # ==================================================

    @action(
        detail=True,
        methods=["post"],
        url_path="vote",
    )
    def vote(
        self,
        request,
        pk=None,
    ):
        decision = self.get_object()

        if decision.status != FamilyDecision.DecisionStatus.VOTING:
            return Response(
                {"detail": ("Voting is not currently " "open for this decision.")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if decision.voting_deadline and timezone.now() > decision.voting_deadline:
            return Response(
                {"detail": ("The voting deadline " "has passed.")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        membership = get_circle_membership(
            request.user,
            decision.care_circle,
        )

        if not membership:
            return Response(
                {
                    "detail": (
                        "You must be an active "
                        "member of this Family Circle "
                        "to vote."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if not can_vote_on_decision(
            request.user,
            decision.care_circle,
        ):
            return Response(
                {
                    "detail": (
                        "Your Family Circle role "
                        "does not allow voting "
                        "on care decisions."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        chosen_option = request.data.get(
            "chosen_option",
            "",
        ).strip()

        is_abstained = bool(
            request.data.get(
                "is_abstained",
                False,
            )
        )

        comments = request.data.get(
            "comments",
            "",
        ).strip()

        if is_abstained:
            if not decision.allow_abstain:
                return Response(
                    {"detail": ("Abstaining is not allowed " "for this decision.")},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            chosen_option = "__abstain__"

        else:
            if chosen_option not in decision.options:
                return Response(
                    {
                        "detail": (
                            "Please select one " "of the available " "decision options."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if DecisionVote.objects.filter(
            decision=decision,
            voter=membership,
        ).exists():
            return Response(
                {"detail": ("You have already voted " "on this decision.")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        vote = DecisionVote.objects.create(
            decision=decision,
            voter=membership,
            chosen_option=chosen_option,
            vote_weight=1,
            is_abstained=is_abstained,
            comments=comments,
        )

        update_live_vote_totals(decision)

        vote_serializer = DecisionVoteSerializer(vote)

        decision.refresh_from_db()

        decision_serializer = self.get_serializer(decision)

        return Response(
            {
                "message": ("Your vote has been recorded."),
                "vote": vote_serializer.data,
                "decision": decision_serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )

    # ==================================================
    # CALCULATE / CLOSE RESULT
    # ==================================================

    @action(
        detail=True,
        methods=["post"],
        url_path="calculate-result",
    )
    def calculate_result(
        self,
        request,
        pk=None,
    ):
        decision = self.get_object()

        if not can_manage_decisions(
            request.user,
            decision.care_circle,
        ):
            return Response(
                {
                    "detail": (
                        "You do not have permission " "to calculate this decision."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if decision.status != FamilyDecision.DecisionStatus.VOTING:
            return Response(
                {
                    "detail": (
                        "Only decisions currently " "in voting can be calculated."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        votes = decision.votes.all()

        decision.total_votes = votes.count()

        if decision.total_votes < decision.minimum_votes:
            if decision.voting_deadline and timezone.now() > decision.voting_deadline:
                decision.status = FamilyDecision.DecisionStatus.EXPIRED

                decision.voting_ended_at = timezone.now()

                decision.save(
                    update_fields=[
                        "total_votes",
                        "status",
                        "voting_ended_at",
                    ]
                )

                serializer = self.get_serializer(decision)

                return Response(
                    {
                        "message": (
                            "Voting expired because "
                            "the minimum number of "
                            "votes was not reached."
                        ),
                        "decision": serializer.data,
                    },
                    status=status.HTTP_200_OK,
                )

            return Response(
                {
                    "detail": (
                        f"At least "
                        f"{decision.minimum_votes} "
                        f"vote(s) are required "
                        f"before calculating "
                        f"the result."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        normal_votes = votes.filter(is_abstained=False)

        option_counts = {}

        for vote in normal_votes:
            option = vote.chosen_option

            option_counts[option] = (
                option_counts.get(
                    option,
                    0,
                )
                + vote.vote_weight
            )

        if not option_counts:
            decision.chosen_option = None
            decision.approval_rate = 0
            decision.status = FamilyDecision.DecisionStatus.REJECTED

        else:
            winning_option = max(
                option_counts,
                key=option_counts.get,
            )

            winning_votes = option_counts[winning_option]

            total_weighted_votes = sum(option_counts.values())

            approval_rate = (winning_votes / total_weighted_votes) * 100

            decision.chosen_option = winning_option

            decision.approval_rate = approval_rate

            consensus_threshold = decision.care_circle.consensus_threshold

            if approval_rate >= consensus_threshold:
                decision.status = FamilyDecision.DecisionStatus.APPROVED
            else:
                decision.status = FamilyDecision.DecisionStatus.REJECTED

        decision.voting_ended_at = timezone.now()

        decision.decided_at = timezone.now()

        decision.save(
            update_fields=[
                "total_votes",
                "chosen_option",
                "approval_rate",
                "status",
                "voting_ended_at",
                "decided_at",
            ]
        )

        serializer = self.get_serializer(decision)

        return Response(
            {
                "message": ("Voting result calculated."),
                "decision": serializer.data,
            },
            status=status.HTTP_200_OK,
        )
# ======================================================
# FAMILY NOTES
# ======================================================


class FamilyNoteViewSet(viewsets.ModelViewSet):
    serializer_class = FamilyNoteSerializer

    permission_classes = [
        permissions.IsAuthenticated,
    ]

    # ==================================================
    # QUERYSET / NOTE PRIVACY
    # ==================================================

    def get_queryset(self):
        user = self.request.user

        queryset = (
            FamilyNote.objects.select_related(
                "care_circle",
                "care_circle__service_user",
                "author",
                "author__user",
            )
            .prefetch_related(
                "visible_to",
                "visible_to__user",
            )
            .order_by(
                "-is_pinned",
                "-created_at",
            )
        )

        # Django administrators can see all notes.
        if user.is_staff or user.is_superuser:
            return queryset

        circle_ids = accessible_circle_ids(user)

        # Find the logged-in user's active Family Circle
        # memberships.

        membership_ids = CareCircleMember.objects.filter(
            user=user,
            is_active=True,
            care_circle_id__in=circle_ids,
        ).values_list(
            "id",
            flat=True,
        )

        # A user may see a note when:
        #
        # 1. It belongs to an accessible Family Circle AND
        # 2. It is public, OR
        # 3. They authored it, OR
        # 4. It is restricted and they are explicitly
        #    included in visible_to.
        #
        # Private notes therefore remain visible only
        # to their author.

        return (
            queryset.filter(
                care_circle_id__in=circle_ids,
            )
            .filter(
                Q(
                    privacy_level=(FamilyNote.PrivacyLevel.PUBLIC),
                )
                | Q(
                    author_id__in=membership_ids,
                )
                | Q(
                    privacy_level=(FamilyNote.PrivacyLevel.RESTRICTED),
                    visible_to__id__in=membership_ids,
                )
            )
            .distinct()
        )

    # ==================================================
    # CREATE NOTE
    # ==================================================

    def perform_create(
        self,
        serializer,
    ):
        circle = serializer.validated_data["care_circle"]

        user = self.request.user

        membership = get_circle_membership(
            user,
            circle,
        )

        if not membership:
            if user.is_staff or user.is_superuser:
                raise ValidationError(
                    {
                        "care_circle": (
                            "Admin users must also "
                            "have a circle membership "
                            "before creating notes."
                        )
                    }
                )

            raise PermissionDenied(
                "You must be a member of " "this Family Circle to " "create notes."
            )

        # ----------------------------------------------
        # VIEWER = READ ONLY
        # ----------------------------------------------

        if membership.role == CareCircleMember.MemberRole.VIEWER:
            raise PermissionDenied(
                "Your Family Circle role is read-only. "
                "Viewers cannot create shared notes."
            )

        privacy_level = serializer.validated_data.get(
            "privacy_level",
            FamilyNote.PrivacyLevel.PUBLIC,
        )

        visible_members = serializer.validated_data.get(
            "visible_to",
            [],
        )

        # ----------------------------------------------
        # VALIDATE RESTRICTED VISIBILITY
        # ----------------------------------------------

        if privacy_level == FamilyNote.PrivacyLevel.RESTRICTED:
            if not visible_members:
                raise ValidationError(
                    {
                        "visible_to": (
                            "Select at least one "
                            "Family Circle member "
                            "for a restricted note."
                        )
                    }
                )

            for visible_member in visible_members:
                if visible_member.care_circle_id != circle.id:
                    raise ValidationError(
                        {
                            "visible_to": (
                                "You can only share "
                                "this note with members "
                                "of the same Family Circle."
                            )
                        }
                    )

                if not visible_member.is_active:
                    raise ValidationError(
                        {
                            "visible_to": (
                                "Restricted notes can "
                                "only be shared with "
                                "active Family Circle "
                                "members."
                            )
                        }
                    )

        # Public/private notes should not retain
        # restricted-member visibility selections.

        if privacy_level != FamilyNote.PrivacyLevel.RESTRICTED:
            serializer.validated_data["visible_to"] = []

        serializer.save(
            author=membership,
        )

    # ==================================================
    # UPDATE NOTE
    # ==================================================

    def perform_update(
        self,
        serializer,
    ):
        note = self.get_object()

        user = self.request.user

        membership = get_circle_membership(
            user,
            note.care_circle,
        )

        # ----------------------------------------------
        # VIEWER = READ ONLY
        # ----------------------------------------------

        if (
            membership
            and membership.role == CareCircleMember.MemberRole.VIEWER
            and not (user.is_staff or user.is_superuser)
        ):
            raise PermissionDenied(
                "Your Family Circle role is read-only. "
                "Viewers cannot edit shared notes."
            )

        # Only the author or Django administrator
        # can edit a note.

        if not (user.is_staff or user.is_superuser or note.author.user_id == user.id):
            raise PermissionDenied("Only the author of this note " "can edit it.")

        circle = note.care_circle

        privacy_level = serializer.validated_data.get(
            "privacy_level",
            note.privacy_level,
        )

        visible_members = serializer.validated_data.get(
            "visible_to",
            None,
        )

        if privacy_level == FamilyNote.PrivacyLevel.RESTRICTED:
            # PATCH without visible_to keeps current selections.

            if visible_members is None:
                visible_members = list(note.visible_to.all())

            if not visible_members:
                raise ValidationError(
                    {
                        "visible_to": (
                            "Select at least one "
                            "Family Circle member "
                            "for a restricted note."
                        )
                    }
                )

            for visible_member in visible_members:
                if visible_member.care_circle_id != circle.id:
                    raise ValidationError(
                        {
                            "visible_to": (
                                "You can only share "
                                "this note with members "
                                "of the same Family Circle."
                            )
                        }
                    )

                if not visible_member.is_active:
                    raise ValidationError(
                        {
                            "visible_to": (
                                "Restricted notes can "
                                "only be shared with "
                                "active Family Circle "
                                "members."
                            )
                        }
                    )

        else:
            # Switching from restricted to public/private
            # clears old restricted visibility.

            serializer.validated_data["visible_to"] = []

        serializer.save()

    # ==================================================
    # DELETE NOTE
    # ==================================================

    def perform_destroy(
        self,
        instance,
    ):
        user = self.request.user

        membership = get_circle_membership(
            user,
            instance.care_circle,
        )

        # ----------------------------------------------
        # VIEWER = READ ONLY
        # ----------------------------------------------

        if (
            membership
            and membership.role == CareCircleMember.MemberRole.VIEWER
            and not (user.is_staff or user.is_superuser)
        ):
            raise PermissionDenied(
                "Your Family Circle role is read-only. "
                "Viewers cannot delete shared notes."
            )

        if not (
            user.is_staff or user.is_superuser or instance.author.user_id == user.id
        ):
            raise PermissionDenied("Only the author of this note " "can delete it.")

        instance.delete()

    # ==================================================
    # PIN / UNPIN NOTE
    # ==================================================

    @action(
        detail=True,
        methods=["post"],
        url_path="toggle-pin",
    )
    def toggle_pin(
        self,
        request,
        pk=None,
    ):
        note = self.get_object()

        user = request.user

        membership = get_circle_membership(
            user,
            note.care_circle,
        )

        # ----------------------------------------------
        # VIEWER = READ ONLY
        # ----------------------------------------------

        if (
            membership
            and membership.role == CareCircleMember.MemberRole.VIEWER
            and not (user.is_staff or user.is_superuser)
        ):
            return Response(
                {
                    "detail": (
                        "Your Family Circle role is read-only. "
                        "Viewers cannot change the pinned "
                        "status of shared notes."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if not (user.is_staff or user.is_superuser or note.author.user_id == user.id):
            return Response(
                {
                    "detail": (
                        "Only the author of this note " "can change its pinned status."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        note.is_pinned = not note.is_pinned

        note.save(
            update_fields=[
                "is_pinned",
                "updated_at",
            ]
        )

        serializer = self.get_serializer(note)

        return Response(
            {
                "message": (
                    "Note pinned successfully."
                    if note.is_pinned
                    else "Note unpinned successfully."
                ),
                "note": serializer.data,
            },
            status=status.HTTP_200_OK,
        )


# ======================================================
# SAVED PROVIDERS
# ======================================================


class SavedProviderViewSet(viewsets.ModelViewSet):
    serializer_class = SavedProviderSerializer

    permission_classes = [
        permissions.IsAuthenticated,
    ]

    def get_queryset(self):
        return (
            SavedProvider.objects.filter(user=self.request.user)
            .select_related("provider")
            .order_by("-saved_at")
        )

    def perform_create(
        self,
        serializer,
    ):
        serializer.save(user=self.request.user)
