from django.db import models

import uuid


class Match(models.Model):
    class MatchStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        REJECTED = "rejected", "Rejected"
        COMPLETED = "completed", "Completed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        "users.User", on_delete=models.CASCADE, related_name="matches"
    )  # ← FIXED
    provider = models.ForeignKey(
        "care_providers.CareProvider", on_delete=models.CASCADE, related_name="matches"
    )  # ← FIXED
    match_score = models.IntegerField(default=0)  # 0-100
    status = models.CharField(
        max_length=20, choices=MatchStatus.choices, default=MatchStatus.PENDING
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ["user", "provider"]

    def __str__(self):
        return (
            f"{self.user.username} - {self.provider.company_name} ({self.match_score}%)"
        )
