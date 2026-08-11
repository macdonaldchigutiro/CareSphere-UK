# apps/matching/views.py
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Match
from .serializers import MatchSerializer
from .engine import matching_engine
from apps.users.models import User


class MatchViewSet(viewsets.ModelViewSet):
    queryset = Match.objects.all()
    serializer_class = MatchSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Filter matches to show only relevant ones"""
        user = self.request.user
        if user.user_type == "admin":
            return Match.objects.all()
        # Show matches where user is involved
        return Match.objects.filter(user=user)

    @action(detail=False, methods=["post"])
    def find_matches(self, request):
        """Find matches for a service user"""
        user_id = request.data.get("user_id")
        strategy = request.data.get("strategy", "quality")

        try:
            user = User.objects.get(id=user_id)
            matches = matching_engine.match_service_user(
                service_user=user, primary_strategy=strategy
            )
            return Response({"matches": matches, "count": len(matches)})
        except User.DoesNotExist:
            return Response(
                {"error": "User not found"}, status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=["post"])
    def emergency(self, request):
        """Emergency matching"""
        latitude = request.data.get("latitude")
        longitude = request.data.get("longitude")
        care_type = request.data.get("care_type", "emergency")

        matches = matching_engine.emergency_match(
            latitude=latitude, longitude=longitude, care_type=care_type
        )

        return Response({"matches": matches, "count": len(matches)})
