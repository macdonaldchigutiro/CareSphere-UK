from django.urls import path

from .views import (
    RegisterView,
    LoginView,
    UserProfileView,
    AdminDashboardView,
    AdminOperationsView,
    AdminGovernanceView,

)

from .admin_actions import (
    ProviderVerificationActionView,
    TrustVerificationActionView,
    ReviewModerationActionView,
    PricingTierStatusActionView,
    CommunicationThreadActionView,
    AdminNotificationActionView,
    AdminUserStatusActionView,
    AdminMatchStatusActionView,
)

urlpatterns = [
    path(
        "register/",
        RegisterView.as_view(),
        name="register",
    ),
    path(
        "login/",
        LoginView.as_view(),
        name="login",
    ),
    path(
        "profile/",
        UserProfileView.as_view(),
        name="profile",
    ),
    # =========================================================
    # ADMIN READ APIs
    # =========================================================
    path(
        "admin/dashboard/",
        AdminDashboardView.as_view(),
        name="admin-dashboard",
    ),
    path(
        "admin/actions/matching/<uuid:match_id>/",
        AdminMatchStatusActionView.as_view(),
        name="admin-match-status-action",
    ),
    path(
        "admin/operations/",
        AdminOperationsView.as_view(),
        name="admin-operations",
    ),
    path(
        "admin/governance/",
        AdminGovernanceView.as_view(),
        name="admin-governance",
    ),
    # =========================================================
    # ADMIN ACTION APIs
    # =========================================================
    path(
        "admin/actions/providers/" "<uuid:provider_id>/verification/",
        ProviderVerificationActionView.as_view(),
        name="admin-provider-verification-action",
    ),
    path(
        "admin/actions/trust/" "<int:verification_id>/",
        TrustVerificationActionView.as_view(),
        name="admin-trust-action",
    ),
    path(
        "admin/actions/reviews/" "<uuid:review_id>/",
        ReviewModerationActionView.as_view(),
        name="admin-review-action",
    ),
    path(
        "admin/actions/pricing/" "<uuid:tier_id>/",
        PricingTierStatusActionView.as_view(),
        name="admin-pricing-action",
    ),
    path(
        "admin/actions/communications/" "<uuid:thread_id>/",
        CommunicationThreadActionView.as_view(),
        name="admin-communication-action",
    ),
    path(
        "admin/actions/notifications/" "<uuid:notification_id>/",
        AdminNotificationActionView.as_view(),
        name="admin-notification-action",
    ),
    path(
        "admin/actions/users/" "<int:user_id>/status/",
        AdminUserStatusActionView.as_view(),
        name="admin-user-status-action",
    ),
]
