# apps/care_providers/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # Care Provider URLs - using ListView and DetailView
    path("providers/", views.CareProviderListView.as_view(), name="provider-list"),
    path(
        "providers/<uuid:pk>/",
        views.CareProviderDetailView.as_view(),
        name="provider-detail",
    ),
    # Staff Member URLs
    path("staff/", views.StaffMemberListView.as_view(), name="staff-list"),
    path(
        "staff/<uuid:pk>/", views.StaffMemberDetailView.as_view(), name="staff-detail"
    ),
    # Availability Slot URLs
    path(
        "availability/",
        views.AvailabilitySlotListView.as_view(),
        name="availability-list",
    ),
    path(
        "availability/<uuid:pk>/",
        views.AvailabilitySlotDetailView.as_view(),
        name="availability-detail",
    ),
]
