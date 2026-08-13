import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault(
    "DJANGO_SETTINGS_MODULE", "caresphere_backend.settings"
)  # Remove '.development'

application = get_wsgi_application()
