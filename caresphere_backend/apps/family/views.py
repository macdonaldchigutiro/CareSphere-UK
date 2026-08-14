from rest_framework import permissions, viewsets

from .models import (
    CareCircle,
    CareCircleMember,
    FamilyDecision,
    FamilyNote,
    SavedProvider,
)

from .serializers import (
    CareCircleSerializer,
    CareCircleMemberSerializer,
    FamilyDecisionSerializer,
    FamilyNoteSerializer,
    SavedProviderSerializer,
)


class CareCircleViewSet(viewsets.ModelViewSet):
    queryset = CareCircle.objects.all()
    serializer_class = CareCircleSerializer
    permission_classes = [
        permissions.IsAuthenticated,
    ]


class CareCircleMemberViewSet(viewsets.ModelViewSet):
    queryset = CareCircleMember.objects.all()
    serializer_class = CareCircleMemberSerializer
    permission_classes = [
        permissions.IsAuthenticated,
    ]


class FamilyDecisionViewSet(viewsets.ModelViewSet):
    queryset = FamilyDecision.objects.all()
    serializer_class = FamilyDecisionSerializer
    permission_classes = [
        permissions.IsAuthenticated,
    ]


class FamilyNoteViewSet(viewsets.ModelViewSet):
    queryset = FamilyNote.objects.all()
    serializer_class = FamilyNoteSerializer
    permission_classes = [
        permissions.IsAuthenticated,
    ]


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

    def perform_create(self, serializer):
        serializer.save(
            user=self.request.user,
        )
