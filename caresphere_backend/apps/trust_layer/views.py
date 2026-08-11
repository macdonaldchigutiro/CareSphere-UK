# apps/trust_layer/views.py
from rest_framework import viewsets, permissions
from .models import TrustVerification, Review
from .serializers import TrustVerificationSerializer, ReviewSerializer


class TrustVerificationViewSet(viewsets.ModelViewSet):
    queryset = TrustVerification.objects.all()
    serializer_class = TrustVerificationSerializer
    permission_classes = [permissions.IsAuthenticated]


class ReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.all()
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticated]
