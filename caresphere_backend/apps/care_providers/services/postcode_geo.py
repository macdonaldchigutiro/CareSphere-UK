"""UK postcode lookup and database-backed radius search helpers."""

from __future__ import annotations

import math
import re
from dataclasses import dataclass
from decimal import Decimal

import requests
from django.core.cache import cache
from django.db.models import ExpressionWrapper, F, FloatField, Q, Value
from django.db.models.functions import ACos, Cast, Cos, Greatest, Least, Radians, Sin
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


POSTCODES_IO_URL = "https://api.postcodes.io"
EARTH_RADIUS_MILES = 3958.7613
POSTCODE_CACHE_SECONDS = 60 * 60 * 24 * 30
MAX_BULK_POSTCODES = 100

# This deliberately validates a full postcode, not an outward code such as WD17.
# Postcodes.io remains the authority for whether the postcode currently exists.
FULL_POSTCODE_RE = re.compile(
    r"^(?:GIR ?0AA|[A-PR-UWYZ][A-HK-Y]?[0-9][0-9A-HJKSTUW]? ?[0-9][ABD-HJLNP-UW-Z]{2})$",
    re.IGNORECASE,
)


class PostcodeFormatError(ValueError):
    """Raised when a value is not a supported full English postcode."""


class PostcodeNotFound(ValueError):
    """Raised when a valid-looking postcode cannot be located."""


class PostcodeServiceError(RuntimeError):
    """Raised when the postcode lookup service is unavailable or malformed."""


@dataclass(frozen=True)
class PostcodeCoordinates:
    postcode: str
    latitude: float
    longitude: float
    country: str = "England"


def normalise_postcode(value: object) -> str:
    """Return a canonical uppercase postcode with one inward-code space."""

    compact = re.sub(r"\s+", "", str(value or "").upper())
    if len(compact) < 5:
        return compact
    return f"{compact[:-3]} {compact[-3:]}"


def is_full_uk_postcode(value: object) -> bool:
    return bool(FULL_POSTCODE_RE.fullmatch(normalise_postcode(value)))


def validate_search_postcode(value: object) -> str:
    postcode = normalise_postcode(value)
    if not is_full_uk_postcode(postcode):
        raise PostcodeFormatError(
            "Enter a full postcode, for example WD17 1NA."
        )
    if postcode.startswith("BT"):
        raise PostcodeFormatError(
            "Radius search currently supports English postcodes only."
        )
    return postcode


def build_retrying_session() -> requests.Session:
    retry = Retry(
        total=3,
        connect=3,
        read=3,
        backoff_factor=0.4,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=frozenset({"GET", "POST"}),
    )
    session = requests.Session()
    session.mount("https://", HTTPAdapter(max_retries=retry))
    return session


def _coordinates_from_result(result: dict | None) -> PostcodeCoordinates | None:
    if not result:
        return None
    try:
        postcode = normalise_postcode(result["postcode"])
        latitude = float(result["latitude"])
        longitude = float(result["longitude"])
    except (KeyError, TypeError, ValueError) as exc:
        raise PostcodeServiceError(
            "The postcode service returned an incomplete response."
        ) from exc

    if (
        not math.isfinite(latitude)
        or not math.isfinite(longitude)
        or not -90 <= latitude <= 90
        or not -180 <= longitude <= 180
    ):
        raise PostcodeServiceError(
            "The postcode service returned invalid coordinates."
        )

    country = str(result.get("country") or "")
    if country.casefold() != "england":
        return None
    return PostcodeCoordinates(
        postcode=postcode,
        latitude=latitude,
        longitude=longitude,
        country=country,
    )


def lookup_postcode(
    postcode: object,
    *,
    timeout: float = 5,
    session: requests.Session | None = None,
) -> PostcodeCoordinates:
    """Resolve one full English postcode through Postcodes.io."""

    postcode = validate_search_postcode(postcode)
    client = session or build_retrying_session()
    try:
        response = client.get(
            f"{POSTCODES_IO_URL}/postcodes/{postcode.replace(' ', '')}",
            timeout=timeout,
        )
        if response.status_code == 404:
            raise PostcodeNotFound(
                "That postcode could not be found. Check it and try again."
            )
        response.raise_for_status()
        payload = response.json()
    except PostcodeNotFound:
        raise
    except (requests.RequestException, ValueError) as exc:
        raise PostcodeServiceError(
            "Postcode lookup is temporarily unavailable. Please try again."
        ) from exc

    if not isinstance(payload, dict):
        raise PostcodeServiceError(
            "The postcode service returned an incomplete response."
        )
    coordinates = _coordinates_from_result(payload.get("result"))
    if coordinates is None:
        raise PostcodeNotFound(
            "That postcode is outside the currently supported English search area."
        )
    return coordinates


def bulk_lookup_postcodes(
    postcodes,
    *,
    timeout: float = 15,
    session: requests.Session | None = None,
) -> dict[str, PostcodeCoordinates]:
    """Resolve at most 100 postcodes in one Postcodes.io request."""

    normalised = list(dict.fromkeys(normalise_postcode(value) for value in postcodes))
    if len(normalised) > MAX_BULK_POSTCODES:
        raise ValueError(
            f"Postcodes.io accepts at most {MAX_BULK_POSTCODES} postcodes per request."
        )
    valid = [postcode for postcode in normalised if is_full_uk_postcode(postcode)]
    valid = [postcode for postcode in valid if not postcode.startswith("BT")]
    if not valid:
        return {}

    client = session or build_retrying_session()
    try:
        response = client.post(
            f"{POSTCODES_IO_URL}/postcodes",
            params={"filter": "postcode,longitude,latitude,country"},
            json={"postcodes": valid},
            timeout=timeout,
        )
        response.raise_for_status()
        payload = response.json()
    except (requests.RequestException, ValueError) as exc:
        raise PostcodeServiceError(
            "Postcode enrichment is temporarily unavailable. Please try again."
        ) from exc

    if not isinstance(payload, dict):
        raise PostcodeServiceError(
            "The postcode service returned an incomplete bulk response."
        )
    results = payload.get("result")
    if not isinstance(results, list):
        raise PostcodeServiceError(
            "The postcode service returned an incomplete bulk response."
        )

    coordinates = {}
    for item in results:
        if not isinstance(item, dict):
            continue
        value = _coordinates_from_result(item.get("result"))
        if value is not None:
            coordinates[normalise_postcode(item.get("query"))] = value
    return coordinates


def resolve_search_postcode(
    postcode: object,
    *,
    timeout: float = 5,
) -> PostcodeCoordinates:
    """Use stored provider coordinates first, then a cached postcode lookup."""

    from ..models import CareProvider, ExternalProviderLocation

    postcode = validate_search_postcode(postcode)
    cache_key = f"discovery-postcode:{postcode.replace(' ', '')}"
    cached = cache.get(cache_key)
    if cached:
        return PostcodeCoordinates(**cached)

    stored = (
        ExternalProviderLocation.objects.filter(
            postcode__iexact=postcode,
            latitude__isnull=False,
            longitude__isnull=False,
        )
        .values("latitude", "longitude")
        .first()
    )
    if stored is None:
        stored = (
            CareProvider.objects.filter(
                postcode__iexact=postcode,
                latitude__isnull=False,
                longitude__isnull=False,
            )
            .values("latitude", "longitude")
            .first()
        )

    if stored is not None:
        coordinates = PostcodeCoordinates(
            postcode=postcode,
            latitude=float(stored["latitude"]),
            longitude=float(stored["longitude"]),
        )
    else:
        coordinates = lookup_postcode(postcode, timeout=timeout)

    cache.set(
        cache_key,
        {
            "postcode": coordinates.postcode,
            "latitude": coordinates.latitude,
            "longitude": coordinates.longitude,
            "country": coordinates.country,
        },
        POSTCODE_CACHE_SECONDS,
    )
    return coordinates


def distance_miles_expression(origin: PostcodeCoordinates):
    """Return a database expression for straight-line distance in miles."""

    latitude = Cast(F("latitude"), FloatField())
    longitude = Cast(F("longitude"), FloatField())
    origin_latitude = Radians(Value(float(origin.latitude)))
    origin_longitude = Radians(Value(float(origin.longitude)))
    cosine = (
        Sin(origin_latitude) * Sin(Radians(latitude))
        + Cos(origin_latitude)
        * Cos(Radians(latitude))
        * Cos(Radians(longitude) - origin_longitude)
    )
    clamped = Least(Greatest(cosine, Value(-1.0)), Value(1.0))
    return ExpressionWrapper(
        Value(EARTH_RADIUS_MILES) * ACos(clamped),
        output_field=FloatField(),
    )


def apply_radius_filter(queryset, origin: PostcodeCoordinates, radius_miles: float):
    """Exclude unknown coordinates and annotate exact in-radius distances."""

    latitude_delta = radius_miles / 69.0
    longitude_scale = max(abs(math.cos(math.radians(origin.latitude))), 0.01)
    longitude_delta = radius_miles / (69.0 * longitude_scale)

    return (
        queryset.filter(
            Q(latitude__isnull=False) & Q(longitude__isnull=False),
            latitude__gte=Decimal(str(origin.latitude - latitude_delta)),
            latitude__lte=Decimal(str(origin.latitude + latitude_delta)),
            longitude__gte=Decimal(str(origin.longitude - longitude_delta)),
            longitude__lte=Decimal(str(origin.longitude + longitude_delta)),
        )
        .annotate(distance_miles=distance_miles_expression(origin))
        .filter(distance_miles__lte=radius_miles)
    )
