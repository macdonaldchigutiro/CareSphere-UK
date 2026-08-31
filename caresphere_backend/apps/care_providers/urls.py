from django.urls import path

from . import views

urlpatterns = [
    # ==================================================
    # PROVIDER SELF-SERVICE
    # ==================================================
    path(
        "my-profile/",
        views.MyProviderProfileView.as_view(),
        name="provider-my-profile",
    ),
    # ==================================================
    # PROVIDER STAFF MANAGEMENT
    # ==================================================
    path(
        "my-staff/",
        views.MyStaffListCreateView.as_view(),
        name="provider-my-staff",
    ),
    path(
        "my-staff/<uuid:pk>/",
        views.MyStaffDetailView.as_view(),
        name="provider-my-staff-detail",
    ),
    # ==================================================
    # PROVIDER AVAILABILITY MANAGEMENT
    # ==================================================
    path(
        "my-availability/",
        views.MyAvailabilityListCreateView.as_view(),
        name="provider-my-availability",
    ),
    path(
        "my-availability/<int:pk>/",
        views.MyAvailabilityDetailView.as_view(),
        name="provider-my-availability-detail",
    ),
    # ==================================================
    # PUBLIC PROVIDERS
    # ==================================================
    path(
        "discovery/",
        views.ProviderDiscoveryView.as_view(),
        name="provider-discovery",
    ),
    path(
        "providers/",
        views.CareProviderListView.as_view(),
        name="provider-list",
    ),
    path(
        "providers/<uuid:pk>/",
        views.CareProviderDetailView.as_view(),
        name="provider-detail",
    ),
    # ==================================================
    # PUBLIC STAFF
    # ==================================================
    path(
        "staff/",
        views.StaffMemberListView.as_view(),
        name="staff-list",
    ),
    path(
        "staff/<uuid:pk>/",
        views.StaffMemberDetailView.as_view(),
        name="staff-detail",
    ),
    # ==================================================
    # PUBLIC AVAILABILITY
    # ==================================================
    path(
        "availability/",
        views.AvailabilitySlotListView.as_view(),
        name="availability-list",
    ),
    path(
        "availability/<int:pk>/",
        views.AvailabilitySlotDetailView.as_view(),
        name="availability-detail",
    ),
]
