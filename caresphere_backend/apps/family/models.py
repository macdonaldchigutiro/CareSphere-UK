"""
Family Collaboration Models
"""

from django.db import models

# from django.contrib.auth.models import User  ← DELETE THIS LINE
from django.utils import timezone
import uuid


class CareCircle(models.Model):
    """
    A care circle is a group of family members and friends
    collaborating on care decisions for a service user
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    service_user = models.OneToOneField(
        "service_users.ServiceUserProfile",
        on_delete=models.CASCADE,
        related_name="care_circle",
    )
    name = models.CharField(max_length=200, default="Family Care Circle")
    description = models.TextField(blank=True)

    # Settings
    is_active = models.BooleanField(default=True)
    requires_consensus = models.BooleanField(default=True)
    consensus_threshold = models.IntegerField(
        default=75, help_text="Percentage of members required for consensus"
    )

    # Communication settings
    allow_external_invites = models.BooleanField(default=True)
    auto_share_updates = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Care Circle"
        verbose_name_plural = "Care Circles"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Care Circle for {self.service_user.user.get_full_name()}"

    @property
    def active_members(self):
        """Get active members of the care circle"""
        return self.members.filter(is_active=True)

    @property
    def primary_contact(self):
        """Get the primary contact for this care circle"""
        return self.members.filter(role="primary").first()


class CareCircleMember(models.Model):
    """
    A member of a care circle with specific role and permissions
    """

    class MemberRole(models.TextChoices):
        PRIMARY = "primary", "Primary Contact"
        DECISION_MAKER = "decision_maker", "Decision Maker"
        CONTRIBUTOR = "contributor", "Contributor"
        VIEWER = "viewer", "Viewer"
        ADMIN = "admin", "Administrator"

    class Relationship(models.TextChoices):
        SPOUSE = "spouse", "Spouse/Partner"
        CHILD = "child", "Child"
        PARENT = "parent", "Parent"
        SIBLING = "sibling", "Sibling"
        GRANDCHILD = "grandchild", "Grandchild"
        FRIEND = "friend", "Friend"
        NEIGHBOR = "neighbor", "Neighbor"
        PROFESSIONAL = "professional", "Professional"
        OTHER = "other", "Other"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    care_circle = models.ForeignKey(
        CareCircle, on_delete=models.CASCADE, related_name="members"
    )
    user = models.ForeignKey(  # ← FIXED
        "users.User", on_delete=models.CASCADE, related_name="care_circle_memberships"
    )

    # Member details
    role = models.CharField(max_length=20, choices=MemberRole.choices)
    relationship = models.CharField(max_length=20, choices=Relationship.choices)
    nickname = models.CharField(max_length=100, blank=True)

    # Permissions
    can_invite_members = models.BooleanField(default=False)
    can_manage_bookings = models.BooleanField(default=False)
    can_view_financials = models.BooleanField(default=False)
    can_make_decisions = models.BooleanField(default=False)
    can_edit_profiles = models.BooleanField(default=False)

    # Status
    is_active = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False)
    verification_token = models.CharField(max_length=100, blank=True)

    # Communication preferences
    notification_preferences = models.JSONField(default=dict)

    joined_at = models.DateTimeField(auto_now_add=True)
    last_active = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Care Circle Member"
        verbose_name_plural = "Care Circle Members"
        unique_together = ["care_circle", "user"]
        ordering = ["role", "joined_at"]

    def __str__(self):
        return f"{self.user.get_full_name()} in {self.care_circle}"


class FamilyDecision(models.Model):
    """
    A decision that requires family consensus
    """

    class DecisionType(models.TextChoices):
        PROVIDER_SELECTION = "provider_selection", "Provider Selection"
        CARE_PLAN = "care_plan", "Care Plan Approval"
        FINANCIAL = "financial", "Financial Decision"
        MEDICAL = "medical", "Medical Decision"
        EMERGENCY = "emergency", "Emergency Decision"
        OTHER = "other", "Other"

    class DecisionStatus(models.TextChoices):
        DRAFT = "draft", "Draft"
        VOTING = "voting", "Voting in Progress"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        EXPIRED = "expired", "Expired"
        CANCELLED = "cancelled", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    care_circle = models.ForeignKey(
        CareCircle, on_delete=models.CASCADE, related_name="decisions"
    )
    created_by = models.ForeignKey(  # ← FIXED
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_decisions",
    )

    # Decision details
    title = models.CharField(max_length=200)
    description = models.TextField()
    decision_type = models.CharField(max_length=50, choices=DecisionType.choices)
    options = models.JSONField(default=list)  # List of choice options

    # Voting settings
    status = models.CharField(
        max_length=20, choices=DecisionStatus.choices, default="draft"
    )
    voting_deadline = models.DateTimeField(null=True, blank=True)
    minimum_votes = models.IntegerField(default=1)
    allow_abstain = models.BooleanField(default=True)
    is_anonymous = models.BooleanField(default=False)

    # Results
    chosen_option = models.JSONField(null=True, blank=True)  # The selected option
    approval_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    total_votes = models.IntegerField(default=0)

    # Timeline
    created_at = models.DateTimeField(auto_now_add=True)
    voting_started_at = models.DateTimeField(null=True, blank=True)
    voting_ended_at = models.DateTimeField(null=True, blank=True)
    decided_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Family Decision"
        verbose_name_plural = "Family Decisions"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} - {self.get_status_display()}"

    def start_voting(self):
        """Start the voting process"""
        if self.status != "draft":
            return False

        self.status = "voting"
        self.voting_started_at = timezone.now()
        self.save()
        return True

    def calculate_results(self):
        """Calculate voting results"""
        if self.status != "voting":
            return False

        votes = self.votes.all()
        self.total_votes = votes.count()

        if self.total_votes == 0:
            return False

        # Count votes per option
        option_counts = {}
        for vote in votes:
            option = vote.chosen_option
            option_counts[option] = option_counts.get(option, 0) + 1

        # Find winning option
        max_votes = 0
        winning_option = None

        for option, count in option_counts.items():
            if count > max_votes:
                max_votes = count
                winning_option = option

        # Calculate approval rate
        if self.total_votes > 0:
            self.approval_rate = (max_votes / self.total_votes) * 100

        # Check if minimum votes reached
        if self.total_votes >= self.minimum_votes:
            self.chosen_option = winning_option
            self.status = "approved" if self.approval_rate >= 50 else "rejected"
            self.decided_at = timezone.now()
            self.voting_ended_at = timezone.now()
        else:
            # Not enough votes
            self.status = "expired"

        self.save()
        return True


class DecisionVote(models.Model):
    """
    A vote cast by a family member on a decision
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    decision = models.ForeignKey(
        FamilyDecision, on_delete=models.CASCADE, related_name="votes"
    )
    voter = models.ForeignKey(
        CareCircleMember, on_delete=models.CASCADE, related_name="votes"
    )

    # Vote details
    chosen_option = models.CharField(max_length=500)
    vote_weight = models.IntegerField(default=1)  # For weighted voting
    is_abstained = models.BooleanField(default=False)
    comments = models.TextField(blank=True)

    # Timestamps
    voted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Decision Vote"
        verbose_name_plural = "Decision Votes"
        unique_together = ["decision", "voter"]

    def __str__(self):
        return f"Vote by {self.voter.user.get_full_name()} on {self.decision.title}"


class FamilyNote(models.Model):
    """
    Notes shared among family members
    """

    class NoteType(models.TextChoices):
        GENERAL = "general", "General Note"
        MEDICAL = "medical", "Medical Note"
        FINANCIAL = "financial", "Financial Note"
        CARE_PLAN = "care_plan", "Care Plan Note"
        APPOINTMENT = "appointment", "Appointment Note"
        EMERGENCY = "emergency", "Emergency Note"

    class PrivacyLevel(models.TextChoices):
        PUBLIC = "public", "All Circle Members"
        RESTRICTED = "restricted", "Selected Members Only"
        PRIVATE = "private", "Creator Only"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    care_circle = models.ForeignKey(
        CareCircle, on_delete=models.CASCADE, related_name="notes"
    )
    author = models.ForeignKey(
        CareCircleMember, on_delete=models.CASCADE, related_name="authored_notes"
    )

    # Note content
    title = models.CharField(max_length=200)
    content = models.TextField()
    note_type = models.CharField(max_length=20, choices=NoteType.choices)
    privacy_level = models.CharField(max_length=20, choices=PrivacyLevel.choices)
    tags = models.JSONField(default=list)

    # Attachments
    attachments = models.JSONField(default=list)  # List of file URLs

    # Visibility
    visible_to = models.ManyToManyField(
        CareCircleMember, related_name="visible_notes", blank=True
    )
    is_pinned = models.BooleanField(default=False)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_viewed = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Family Note"
        verbose_name_plural = "Family Notes"
        ordering = ["-is_pinned", "-created_at"]

    def __str__(self):
        return f"{self.title} by {self.author.user.get_full_name()}"

    def can_view(self, member):
        """Check if a member can view this note"""
        if self.privacy_level == "public":
            return True
        elif self.privacy_level == "private":
            return member == self.author
        elif self.privacy_level == "restricted":
            return member in self.visible_to.all()
        return False


class CommunicationThread(models.Model):
    """
    Communication thread for family discussions
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    care_circle = models.ForeignKey(
        CareCircle, on_delete=models.CASCADE, related_name="threads"
    )
    started_by = models.ForeignKey(
        CareCircleMember,
        on_delete=models.SET_NULL,
        null=True,
        related_name="started_threads",
    )

    # Thread details
    subject = models.CharField(max_length=200)
    is_locked = models.BooleanField(default=False)
    is_archived = models.BooleanField(default=False)

    # Participants
    participants = models.ManyToManyField(
        CareCircleMember, related_name="threads", through="ThreadParticipation"
    )

    # Statistics
    message_count = models.IntegerField(default=0)
    last_message_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Communication Thread"
        verbose_name_plural = "Communication Threads"
        ordering = ["-last_message_at", "-created_at"]

    def __str__(self):
        return f"{self.subject} - {self.care_circle}"


class ThreadMessage(models.Model):
    """
    Message in a communication thread
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    thread = models.ForeignKey(
        CommunicationThread, on_delete=models.CASCADE, related_name="messages"
    )
    sender = models.ForeignKey(
        CareCircleMember, on_delete=models.CASCADE, related_name="sent_messages"
    )

    # Message content
    content = models.TextField()
    attachments = models.JSONField(default=list)

    # Status
    is_edited = models.BooleanField(default=False)
    edit_history = models.JSONField(default=list)

    # Read receipts (simplified)
    read_by = models.ManyToManyField(
        CareCircleMember,
        related_name="read_messages",
        through="MessageReadReceipt",
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Thread Message"
        verbose_name_plural = "Thread Messages"
        ordering = ["created_at"]

    def __str__(self):
        return f"Message by {self.sender.user.get_full_name()} in {self.thread.subject}"

    def mark_as_read(self, member):
        """Mark message as read by a member"""
        MessageReadReceipt.objects.get_or_create(
            message=self, reader=member, defaults={"read_at": timezone.now()}
        )


class MessageReadReceipt(models.Model):
    """
    Tracks when a message was read by a member
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.ForeignKey(
        ThreadMessage, on_delete=models.CASCADE, related_name="read_receipts"
    )
    reader = models.ForeignKey(
        CareCircleMember, on_delete=models.CASCADE, related_name="read_receipts"
    )
    read_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Message Read Receipt"
        verbose_name_plural = "Message Read Receipts"
        unique_together = ["message", "reader"]

    def __str__(self):
        return f"{self.reader.user.get_full_name()} read at {self.read_at}"


class ThreadParticipation(models.Model):
    """
    Tracks thread participation
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    thread = models.ForeignKey(CommunicationThread, on_delete=models.CASCADE)
    participant = models.ForeignKey(CareCircleMember, on_delete=models.CASCADE)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Thread Participation"
        verbose_name_plural = "Thread Participation"
        unique_together = ["thread", "participant"]

    def __str__(self):
        return f"{self.participant.user.get_full_name()} in {self.thread.subject}"
