from django.db import models
from apps.users.models import User

class ServiceUserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='service_profile')
    # Add basic fields
    care_requirements = models.JSONField(default=dict)
    medical_conditions = models.JSONField(default=list)
    emergency_contact = models.CharField(max_length=255, blank=True)
    emergency_phone = models.CharField(max_length=17, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Service User: {self.user.username}"