# apps/family/serializers.py
from rest_framework import serializers
from .models import CareCircle, CareCircleMember, FamilyDecision, DecisionVote, FamilyNote

class CareCircleSerializer(serializers.ModelSerializer):
    class Meta:
        model = CareCircle
        fields = '__all__'

class CareCircleMemberSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = CareCircleMember
        fields = '__all__'

class FamilyDecisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = FamilyDecision
        fields = '__all__'

class FamilyNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = FamilyNote
        fields = '__all__'