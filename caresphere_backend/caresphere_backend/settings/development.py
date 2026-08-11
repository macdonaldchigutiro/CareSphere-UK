from .base import *

DEBUG = True

# Add 'apps.users' to INSTALLED_APPS
INSTALLED_APPS += [
    'debug_toolbar', 
]

MIDDLEWARE.insert(0, 'debug_toolbar.middleware.DebugToolbarMiddleware')
INTERNAL_IPS = ['127.0.0.1', 'localhost']

EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
CORS_ALLOW_ALL_ORIGINS = True