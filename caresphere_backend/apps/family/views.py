# apps/family/views.py
from rest_framework import viewsets, permissions
from .models import CareCircle, CareCircleMember, FamilyDecision, FamilyNote
from .serializers import (
    CareCircleSerializer,
    CareCircleMemberSerializer,
    FamilyDecisionSerializer,
    FamilyNoteSerializer,
)


class CareCircleViewSet(viewsets.ModelViewSet):
    queryset = CareCircle.objects.all()
    serializer_class = CareCircleSerializer
    permission_classes = [permissions.IsAuthenticated]


class CareCircleMemberViewSet(viewsets.ModelViewSet):
    queryset = CareCircleMember.objects.all()
    serializer_class = CareCircleMemberSerializer
    permission_classes = [permissions.IsAuthenticated]


class FamilyDecisionViewSet(viewsets.ModelViewSet):
    queryset = FamilyDecision.objects.all()
    serializer_class = FamilyDecisionSerializer
    permission_classes = [permissions.IsAuthenticated]


class FamilyNoteViewSet(viewsets.ModelViewSet):
    queryset = FamilyNote.objects.all()
    serializer_class = FamilyNoteSerializer
    permission_classes = [permissions.IsAuthenticated]
