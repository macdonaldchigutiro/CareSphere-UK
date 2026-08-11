from django.contrib import admin
from .models import CareProvider

@admin.register(CareProvider)
class CareProviderAdmin(admin.ModelAdmin):
    list_display = ('company_name', 'city', 'is_verified', 'is_accepting_clients', 'created_at')
    list_filter = ('is_verified', 'is_accepting_clients', 'city')
    search_fields = ('company_name', 'city', 'postcode')
    readonly_fields = ('created_at', 'updated_at')

