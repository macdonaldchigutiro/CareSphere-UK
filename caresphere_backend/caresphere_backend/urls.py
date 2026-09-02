from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from django.urls import include, path


def health_check(_request):
    return JsonResponse({"status": "ok"})

urlpatterns = [
    path("api/health/", health_check, name="health-check"),
    path("admin/", admin.site.urls),
    path("api/users/", include("apps.users.urls")),
    path("api/service-users/", include("apps.service_users.urls")),
    path("api/care-providers/", include("apps.care_providers.urls")),
    path("api/trust/", include("apps.trust_layer.urls")),
    path("api/family/", include("apps.family.urls")),
    path("api/bookings/", include("apps.bookings.urls")),
    path("api/matching/", include("apps.matching.urls")),
    path("api/notifications/", include("apps.notifications.urls")),
    path("api/pricing/", include("apps.pricing.urls")),
]

if settings.DEBUG:
    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT,
    )
