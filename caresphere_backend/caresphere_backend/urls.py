from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    # User authentication and profile API
    path("api/users/", include("apps.users.urls")),
]
