"""Parse and import the public CQC care directory CSV."""

from __future__ import annotations

import csv
import hashlib
import json
import re
import unicodedata
from collections import Counter
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import IO, Any
from urllib.parse import urlparse

from django.db import transaction
from django.utils import timezone

from ..models import ExternalProviderLocation


class CQCDirectoryFormatError(ValueError):
    """Raised when a file is not a supported CQC directory CSV."""


# These are the current CQC labels that map cleanly to CareSphere's adult
# social-care discovery scope. Health-only services are intentionally absent.
SERVICE_TYPE_TO_CARE_TYPES = {
    "homecare agencies": ("domiciliary",),
    "residential homes": ("residential",),
    "nursing homes": ("nursing",),
    "supported living": ("specialist",),
    "supported housing": ("specialist",),
    "shared lives": ("specialist",),
    "hospice": ("specialist",),
    "home hospice care": ("specialist",),
}

ADULT_SPECIALISMS = {
    "caring for adults under 65 yrs",
    "caring for adults over 65 yrs",
}
CHILD_SPECIALISM = "caring for children (0 - 18yrs)"

REQUIRED_HEADERS = {"name", "service_types", "cqc_location_id"}
MAX_PREAMBLE_ROWS = 25

HEADER_ALIASES = {
    "name": {"name"},
    "also_known_as": {"also known as"},
    "address": {"address"},
    "postcode": {"postcode", "postal code"},
    "phone": {"phone number", "telephone number"},
    "website": {
        "service's website (if available)",
        "services website (if available)",
        "website",
    },
    "service_types": {"service types", "service type"},
    "latest_check": {"date of latest check", "latest check date"},
    "specialisms": {"specialisms/services", "specialisms", "services"},
    "provider_name": {"provider name"},
    "local_authority": {"local authority"},
    "region": {"region"},
    "location_url": {"location url", "cqc location url"},
    "cqc_location_id": {
        "cqc location id",
        "cqc location id (for office use only)",
    },
    "cqc_provider_id": {
        "cqc provider id",
        "cqc provider id (for office use only)",
    },
}

UPDATE_FIELDS = [
    "cqc_provider_id",
    "name",
    "also_known_as",
    "provider_name",
    "address",
    "postcode",
    "phone",
    "website",
    "service_types",
    "specialisms",
    "care_types",
    "local_authority",
    "region",
    "location_url",
    "latest_check_date",
    "latitude",
    "longitude",
    "coordinates_updated_at",
    "source_published_on",
    "content_hash",
    "search_document",
    "is_active",
    "last_seen_at",
    "updated_at",
]


@dataclass
class ParsedCQCSnapshot:
    records: dict[str, dict[str, Any]]
    source_published_on: date | None
    stats: Counter = field(default_factory=Counter)
    invalid_reasons: Counter = field(default_factory=Counter)


@dataclass
class CQCImportResult:
    parsed: ParsedCQCSnapshot
    created: int = 0
    updated: int = 0
    unchanged: int = 0
    reactivated: int = 0
    deactivated: int = 0


def _normalise_text(value: Any, max_length: int | None = None) -> str:
    text = unicodedata.normalize("NFKC", str(value or ""))
    text = re.sub(r"\s+", " ", text).strip()
    if max_length is not None:
        text = text[:max_length]
    return text


def _normalise_header(value: Any) -> str:
    text = _normalise_text(value).casefold()
    return text.removeprefix("\ufeff")


def _canonical_header(value: Any) -> str | None:
    normalised = _normalise_header(value)

    for canonical, aliases in HEADER_ALIASES.items():
        if normalised in aliases:
            return canonical

    # The explanatory suffix on the two ID columns has changed before. Keep
    # these prefix matches narrow so unrelated columns cannot be misread.
    if normalised.startswith("cqc location id"):
        return "cqc_location_id"
    if normalised.startswith("cqc provider id"):
        return "cqc_provider_id"
    return None


def _split_pipe_list(value: Any) -> list[str]:
    items = []
    seen = set()

    for raw_item in str(value or "").split("|"):
        item = _normalise_text(raw_item, 255)
        key = item.casefold()
        if item and key not in seen:
            items.append(item)
            seen.add(key)

    return items


def _normalise_postcode(value: Any) -> str:
    return _normalise_text(value, 12).upper()


def _normalise_url(value: Any) -> str:
    candidate = _normalise_text(value, 500)
    if not candidate:
        return ""

    parsed = urlparse(candidate)
    if not parsed.scheme:
        candidate = f"https://{candidate}"
        parsed = urlparse(candidate)

    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        return ""
    return candidate


def _normalise_cqc_url(value: Any, cqc_location_id: str) -> str:
    candidate = _normalise_url(value)
    hostname = (urlparse(candidate).hostname or "").casefold()

    if hostname == "cqc.org.uk" or hostname.endswith(".cqc.org.uk"):
        return candidate
    return f"https://www.cqc.org.uk/location/{cqc_location_id}"


def _parse_check_date(value: Any) -> date | None:
    text = _normalise_text(value)
    if not text:
        return None

    date_part = text.split(" - ", 1)[0]
    for pattern in ("%d/%b/%Y", "%d/%m/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(date_part, pattern).date()
        except ValueError:
            continue
    return None


def _parse_source_date(row: list[str]) -> date | None:
    text = " ".join(_normalise_text(value) for value in row if value)
    match = re.search(
        r"data\s+was\s+produced\s+on\s+(\d{1,2}\s+[A-Za-z]+\s+\d{4})",
        text,
        flags=re.IGNORECASE,
    )
    if not match:
        return None

    try:
        return datetime.strptime(match.group(1), "%d %B %Y").date()
    except ValueError:
        return None


def _find_header(
    reader: csv.reader,
) -> tuple[dict[str, int], date | None]:
    source_published_on = None

    for row_number, row in enumerate(reader, start=1):
        if row_number > MAX_PREAMBLE_ROWS:
            break

        source_published_on = _parse_source_date(row) or source_published_on
        mapped = {}

        for index, heading in enumerate(row):
            canonical = _canonical_header(heading)
            if canonical and canonical not in mapped:
                mapped[canonical] = index

        if REQUIRED_HEADERS.issubset(mapped):
            return mapped, source_published_on

    required = ", ".join(sorted(REQUIRED_HEADERS))
    raise CQCDirectoryFormatError(
        f"Could not find the CQC directory header row. Required columns: {required}."
    )


def _value(row: list[str], header: dict[str, int], field_name: str) -> str:
    index = header.get(field_name)
    if index is None or index >= len(row):
        return ""
    return row[index]


def _derive_care_types(service_types: list[str]) -> list[str]:
    derived = []

    for service_type in service_types:
        for care_type in SERVICE_TYPE_TO_CARE_TYPES.get(service_type.casefold(), ()):
            if care_type not in derived:
                derived.append(care_type)
    return derived


def _relevance_reason(service_types: list[str], specialisms: list[str]) -> str | None:
    relevant_service_types = {
        service_type.casefold()
        for service_type in service_types
        if service_type.casefold() in SERVICE_TYPE_TO_CARE_TYPES
    }
    if not relevant_service_types:
        return "irrelevant_service_type"

    specialism_keys = {item.casefold() for item in specialisms}
    has_adult_band = bool(specialism_keys & ADULT_SPECIALISMS)

    # Explicitly child-only locations are outside this prototype. Locations
    # with no age band remain eligible because CQC rows can omit that metadata.
    if CHILD_SPECIALISM in specialism_keys and not has_adult_band:
        return "child_only"
    return None


def _build_search_document(values: dict[str, Any]) -> str:
    parts = [
        values["name"],
        values["also_known_as"],
        values["provider_name"],
        values["address"],
        values["postcode"],
        values["postcode"].replace(" ", ""),
        values["local_authority"],
        values["region"],
        values["cqc_location_id"],
        values["cqc_provider_id"],
        *values["service_types"],
        *values["specialisms"],
        *values["care_types"],
    ]
    return " ".join(part for part in parts if part).casefold()


def _content_hash(values: dict[str, Any]) -> str:
    fingerprint_values = {
        key: value
        for key, value in values.items()
        if key not in {"source_published_on", "search_document"}
    }
    payload = json.dumps(
        fingerprint_values,
        sort_keys=True,
        separators=(",", ":"),
        default=str,
    ).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def _parse_row(
    row: list[str],
    header: dict[str, int],
    source_published_on: date | None,
) -> tuple[dict[str, Any] | None, str | None]:
    name = _normalise_text(_value(row, header, "name"), 255)
    cqc_location_id = _normalise_text(_value(row, header, "cqc_location_id"), 50)

    if not name:
        return None, "missing_name"
    if not cqc_location_id:
        return None, "missing_cqc_location_id"
    if not re.fullmatch(r"[A-Za-z0-9-]+", cqc_location_id):
        return None, "invalid_cqc_location_id"

    service_types = _split_pipe_list(_value(row, header, "service_types"))
    specialisms = _split_pipe_list(_value(row, header, "specialisms"))
    relevance_reason = _relevance_reason(service_types, specialisms)
    if relevance_reason:
        return None, relevance_reason

    values = {
        "cqc_location_id": cqc_location_id,
        "cqc_provider_id": _normalise_text(_value(row, header, "cqc_provider_id"), 50),
        "name": name,
        "also_known_as": _normalise_text(_value(row, header, "also_known_as"), 255),
        "provider_name": _normalise_text(_value(row, header, "provider_name"), 255),
        "address": _normalise_text(_value(row, header, "address")),
        "postcode": _normalise_postcode(_value(row, header, "postcode")),
        "phone": _normalise_text(_value(row, header, "phone"), 50),
        "website": _normalise_url(_value(row, header, "website")),
        "service_types": service_types,
        "specialisms": specialisms,
        "care_types": _derive_care_types(service_types),
        "local_authority": _normalise_text(_value(row, header, "local_authority"), 150),
        "region": _normalise_text(_value(row, header, "region"), 150),
        "location_url": _normalise_cqc_url(
            _value(row, header, "location_url"), cqc_location_id
        ),
        "latest_check_date": _parse_check_date(_value(row, header, "latest_check")),
        "source_published_on": source_published_on,
    }
    values["search_document"] = _build_search_document(values)
    values["content_hash"] = _content_hash(values)
    return values, None


def parse_cqc_directory(
    stream: IO[str], *, limit: int | None = None
) -> ParsedCQCSnapshot:
    """Parse, validate, filter, normalise and deduplicate a CQC CSV stream."""

    reader = csv.reader(stream)
    header, source_published_on = _find_header(reader)
    records = {}
    stats = Counter()
    invalid_reasons = Counter()

    for row in reader:
        if not row or not any(_normalise_text(value) for value in row):
            continue
        stats["rows_seen"] += 1

        values, reason = _parse_row(row, header, source_published_on)
        if reason:
            stats[reason] += 1
            if reason.startswith(("missing_", "invalid_")):
                stats["invalid"] += 1
                invalid_reasons[reason] += 1
            else:
                stats["filtered"] += 1
            continue

        cqc_location_id = values["cqc_location_id"]
        if cqc_location_id in records:
            stats["duplicates"] += 1
        records[cqc_location_id] = values
        stats["eligible_rows"] += 1

        if limit is not None and len(records) >= limit:
            break

    stats["unique_locations"] = len(records)
    return ParsedCQCSnapshot(
        records=records,
        source_published_on=source_published_on,
        stats=stats,
        invalid_reasons=invalid_reasons,
    )


def import_cqc_directory(
    stream: IO[str],
    *,
    dry_run: bool = False,
    batch_size: int = 1000,
    limit: int | None = None,
    deactivate_missing: bool = False,
) -> CQCImportResult:
    """Upsert a parsed CQC snapshot by CQC Location ID."""

    snapshot = parse_cqc_directory(stream, limit=limit)
    result = CQCImportResult(parsed=snapshot)
    location_ids = list(snapshot.records)

    if deactivate_missing and not location_ids:
        raise CQCDirectoryFormatError(
            "Refusing to deactivate locations from an empty relevant snapshot."
        )

    existing = ExternalProviderLocation.objects.in_bulk(
        location_ids,
        field_name="cqc_location_id",
    )
    seen_at = timezone.now()
    to_create = []
    to_update = []
    to_touch = []

    for cqc_location_id, values in snapshot.records.items():
        current = existing.get(cqc_location_id)
        if current is None:
            to_create.append(
                ExternalProviderLocation(
                    **values,
                    is_active=True,
                    last_seen_at=seen_at,
                )
            )
            result.created += 1
            continue

        was_inactive = not current.is_active
        postcode_changed = current.postcode != values["postcode"]
        has_changed = current.content_hash != values["content_hash"]

        if was_inactive:
            result.reactivated += 1
        if has_changed or was_inactive:
            result.updated += 1
        else:
            result.unchanged += 1

        for field_name, value in values.items():
            setattr(current, field_name, value)
        if postcode_changed:
            # A postcode change invalidates coordinates from the previous
            # address. The enrichment command will safely repopulate them.
            current.latitude = None
            current.longitude = None
            current.coordinates_updated_at = None
        current.is_active = True
        current.last_seen_at = seen_at

        if has_changed or was_inactive:
            current.updated_at = seen_at
            to_update.append(current)
        else:
            to_touch.append(current)

    if dry_run:
        return result

    with transaction.atomic():
        if to_create:
            ExternalProviderLocation.objects.bulk_create(
                to_create,
                batch_size=batch_size,
            )
        if to_update:
            ExternalProviderLocation.objects.bulk_update(
                to_update,
                UPDATE_FIELDS,
                batch_size=batch_size,
            )
        if to_touch:
            ExternalProviderLocation.objects.bulk_update(
                to_touch,
                ["source_published_on", "last_seen_at", "is_active"],
                batch_size=batch_size,
            )
        if deactivate_missing:
            result.deactivated = (
                ExternalProviderLocation.objects.filter(is_active=True)
                .exclude(cqc_location_id__in=location_ids)
                .update(is_active=False, updated_at=seen_at)
            )

    return result
