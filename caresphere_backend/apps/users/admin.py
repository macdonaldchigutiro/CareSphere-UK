from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User

class UserAdmin(BaseUserAdmin):
    # Display fields in list view
    list_display = ('email', 'first_name', 'last_name', 'user_type', 'is_verified', 'is_staff', 'date_joined')
    
    # Add filters
    list_filter = ('user_type', 'is_verified', 'is_staff', 'is_active')
    
    # Search fields
    search_fields = ('email', 'first_name', 'last_name', 'username')
    
    # Default ordering
    ordering = ('-date_joined',)
    
    # Keep your clean fieldsets but add custom fields
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'username', 'phone_number', 'date_of_birth')}),
        ('User Type', {'fields': ('user_type', 'is_verified', 'profile_picture')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    
    # Add fields for creating new user
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 'user_type', 'password1', 'password2'),
        }),
    )

admin.site.register(User, UserAdmin)