from pathlib import Path
from datetime import timedelta
import environ

# ======================================================
# BASE DIRECTORY
# ======================================================

BASE_DIR = Path(__file__).resolve().parent.parent


# ======================================================
# ENVIRONMENT VARIABLES
# ======================================================

env = environ.Env(
    DEBUG=(bool, True),
)

# Load:
# CareSphere-UK/caresphere_backend/.env
environ.Env.read_env(BASE_DIR / ".env")


# ======================================================
# CORE SETTINGS
# ======================================================

SECRET_KEY = env(
    "SECRET_KEY",
    default="django-insecure-development-key",
)

DEBUG = env.bool(
    "DEBUG",
    default=True,
)

ALLOWED_HOSTS = env.list(
    "ALLOWED_HOSTS",
    default=[
        "localhost",
        "127.0.0.1",
    ],
)


# ======================================================
# INSTALLED APPS
# ======================================================

INSTALLED_APPS = [
    # Django
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party
    "rest_framework",
    "django_filters",
    "corsheaders",
    # CareSphere apps
    "apps.users",
    "apps.service_users",
    "apps.care_providers",
    "apps.trust_layer",
    "apps.family",
    "apps.bookings",
    "apps.matching",
    "apps.notifications",
    "apps.pricing",
]


# ======================================================
# MIDDLEWARE
# ======================================================

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    # CORS should be before CommonMiddleware
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]


# ======================================================
# URL CONFIGURATION
# ======================================================

ROOT_URLCONF = "caresphere_backend.urls"


# ======================================================
# TEMPLATES
# ======================================================

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]


# ======================================================
# WSGI
# ======================================================

WSGI_APPLICATION = "caresphere_backend.wsgi.application"


# ======================================================
# DATABASE
# Supabase PostgreSQL
# ======================================================

DATABASES = {"default": env.db("DATABASE_URL")}

DATABASES["default"]["OPTIONS"] = {
    "sslmode": "require",
}


# ======================================================
# CUSTOM USER MODEL
# ======================================================

AUTH_USER_MODEL = "users.User"


# ======================================================
# PASSWORD VALIDATION
# ======================================================

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "UserAttributeSimilarityValidator"
        ),
    },
    {
        "NAME": ("django.contrib.auth.password_validation." "MinimumLengthValidator"),
    },
    {
        "NAME": ("django.contrib.auth.password_validation." "CommonPasswordValidator"),
    },
    {
        "NAME": ("django.contrib.auth.password_validation." "NumericPasswordValidator"),
    },
]


# ======================================================
# INTERNATIONALISATION
# ======================================================

LANGUAGE_CODE = "en-gb"

TIME_ZONE = "Europe/London"

USE_I18N = True

USE_TZ = True


# ======================================================
# STATIC FILES
# ======================================================

STATIC_URL = "static/"


# ======================================================
# MEDIA FILES
# ======================================================

MEDIA_URL = "/media/"

MEDIA_ROOT = BASE_DIR / "media"


# ======================================================
# DEFAULT PRIMARY KEY
# ======================================================

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# ======================================================
# CORS
# ======================================================

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

CORS_ALLOW_ALL_ORIGINS = False


# ======================================================
# DJANGO REST FRAMEWORK
# ======================================================

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_FILTER_BACKENDS": ("django_filters.rest_framework.DjangoFilterBackend",),
    "DEFAULT_PAGINATION_CLASS": ("rest_framework.pagination.PageNumberPagination"),
    "PAGE_SIZE": 20,
}


# ======================================================
# SIMPLE JWT
# ======================================================

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=2),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": False,
}
