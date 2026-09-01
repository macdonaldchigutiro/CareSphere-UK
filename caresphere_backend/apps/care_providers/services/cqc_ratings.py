"""Import location-level ratings from CQC's monthly ODS data sheet."""

from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass, field
from datetime import date, datetime
from pathlib import Path
from typing import BinaryIO
from xml.etree.ElementTree import ParseError, iterparse
from zipfile import BadZipFile, ZipFile

from django.db import transaction

from ..models import ExternalProviderLocation


class CQCRatingsFormatError(ValueError):
    """Raised when a file is not the supported CQC ratings ODS format."""


TABLE_NAMESPACE = "urn:oasis:names:tc:opendocument:xmlns:table:1.0"
TEXT_NAMESPACE = "urn:oasis:names:tc:opendocument:xmlns:text:1.0"
OFFICE_NAMESPACE = "urn:oasis:names:tc:opendocument:xmlns:office:1.0"

TABLE_TAG = f"{{{TABLE_NAMESPACE}}}table"
ROW_TAG = f"{{{TABLE_NAMESPACE}}}table-row"
CELL_TAG = f"{{{TABLE_NAMESPACE}}}table-cell"
COVERED_CELL_TAG = f"{{{TABLE_NAMESPACE}}}covered-table-cell"
TEXT_TAG = f"{{{TEXT_NAMESPACE}}}p"
TABLE_NAME = f"{{{TABLE_NAMESPACE}}}name"
COLUMNS_REPEATED = f"{{{TABLE_NAMESPACE}}}number-columns-repeated"
DATE_VALUE = f"{{{OFFICE_NAMESPACE}}}date-value"
STRING_VALUE = f"{{{OFFICE_NAMESPACE}}}string-value"
NUMERIC_VALUE = f"{{{OFFICE_NAMESPACE}}}value"

HEADER_ALIASES = {
    "cqc_location_id": {"location id", "cqc location id"},
    "service_group": {"service / population group", "service/population group"},
    "domain": {"domain", "key question"},
    "rating": {"latest rating", "rating"},
    "publication_date": {"publication date", "rating publication date"},
    "inherited": {"inherited rating (y/n)", "inherited rating"},
}

REQUIRED_HEADERS = {
    "cqc_location_id",
    "service_group",
    "domain",
    "rating",
    "publication_date",
}

RATING_LABELS = {
    "good": "Good",
    "inadequate": "Inadequate",
    "insufficient evidence to rate": "Insufficient evidence to rate",
    "no approved rating": "No Approved Rating",
    "not applicable": "Not applicable",
    "not rated": "Not Rated",
    "outstanding": "Outstanding",
    "requires improvement": "Requires improvement",
}

# When CQC publishes conflicting ratings on the same date, retaining the more
# cautious judgement is safer than presenting an overstated quality signal.
RATING_CAUTION_ORDER = {
    "Inadequate": 7,
    "Requires improvement": 6,
    "Insufficient evidence to rate": 5,
    "No Approved Rating": 4,
    "Not Rated": 3,
    "Not applicable": 2,
    "Good": 1,
    "Outstanding": 0,
}

RATING_UPDATE_FIELDS = [
    "cqc_rating",
    "cqc_rating_date",
    "cqc_rating_inherited",
]


@dataclass(frozen=True)
class CQCRatingRecord:
    cqc_location_id: str
    rating: str
    publication_date: date | None
    inherited: bool | None


@dataclass
class ParsedCQCRatings:
    records: dict[str, CQCRatingRecord]
    stats: Counter = field(default_factory=Counter)


@dataclass
class CQCRatingsImportResult:
    parsed: ParsedCQCRatings
    matched: int = 0
    unmatched: int = 0
    updated: int = 0
    unchanged: int = 0


def _normalise_text(value: object) -> str:
    return " ".join(str(value or "").split())


def _normalise_header(value: object) -> str:
    return _normalise_text(value).casefold()


def _cell_value(cell) -> str:
    if cell.get(DATE_VALUE):
        return _normalise_text(cell.get(DATE_VALUE))
    if cell.get(STRING_VALUE):
        return _normalise_text(cell.get(STRING_VALUE))

    paragraphs = [
        _normalise_text("".join(paragraph.itertext()))
        for paragraph in cell.iter(TEXT_TAG)
    ]
    text = " ".join(part for part in paragraphs if part)
    return text or _normalise_text(cell.get(NUMERIC_VALUE))


def _row_values(row, *, maximum_columns: int = 64) -> list[str]:
    values: list[str] = []
    for cell in row:
        if cell.tag not in {CELL_TAG, COVERED_CELL_TAG}:
            continue
        try:
            repeated = int(cell.get(COLUMNS_REPEATED, "1"))
        except ValueError:
            repeated = 1
        remaining = maximum_columns - len(values)
        if remaining <= 0:
            break
        values.extend([_cell_value(cell)] * min(repeated, remaining))
    return values


def _resolve_header(values: list[str]) -> dict[str, int] | None:
    normalised = [_normalise_header(value) for value in values]
    if "location id" not in normalised and "cqc location id" not in normalised:
        return None

    header: dict[str, int] = {}
    for key, aliases in HEADER_ALIASES.items():
        for index, value in enumerate(normalised):
            if value in aliases:
                header[key] = index
                break

    missing = REQUIRED_HEADERS - header.keys()
    if missing:
        raise CQCRatingsFormatError(
            "The CQC ratings Locations sheet is missing required columns: "
            f"{', '.join(sorted(missing))}."
        )
    return header


def _value(values: list[str], header: dict[str, int], key: str) -> str:
    index = header.get(key)
    if index is None or index >= len(values):
        return ""
    return _normalise_text(values[index])


def _parse_date(value: str) -> date | None:
    if not value:
        return None
    candidate = value[:10]
    try:
        return date.fromisoformat(candidate)
    except ValueError:
        pass
    for date_format in ("%d/%m/%Y", "%d %B %Y", "%d %b %Y"):
        try:
            return datetime.strptime(value, date_format).date()
        except ValueError:
            continue
    raise CQCRatingsFormatError(f"Invalid CQC rating publication date: {value}")


def _parse_inherited(value: str) -> bool | None:
    normalised = value.casefold()
    if normalised in {"y", "yes", "true"}:
        return True
    if normalised in {"n", "no", "false"}:
        return False
    return None


def _normalise_rating(value: str) -> str:
    normalised = value.casefold()
    if normalised in RATING_LABELS:
        return RATING_LABELS[normalised]
    return value[:50]


def _prefer_record(
    current: CQCRatingRecord,
    candidate: CQCRatingRecord,
) -> CQCRatingRecord:
    current_date = current.publication_date or date.min
    candidate_date = candidate.publication_date or date.min
    if candidate_date != current_date:
        return candidate if candidate_date > current_date else current
    if candidate.rating == current.rating:
        return candidate
    return max(
        (current, candidate),
        key=lambda record: RATING_CAUTION_ORDER.get(record.rating, 4),
    )


def parse_cqc_ratings(source: str | Path | BinaryIO) -> ParsedCQCRatings:
    """Stream location-level overall ratings from CQC's large ODS file."""

    records: dict[str, CQCRatingRecord] = {}
    stats: Counter = Counter()
    current_table = ""
    found_locations_sheet = False
    header: dict[str, int] | None = None

    try:
        with ZipFile(source) as archive:
            try:
                content = archive.open("content.xml")
            except KeyError as exc:
                raise CQCRatingsFormatError(
                    "The file is not a valid ODS workbook: content.xml is missing."
                ) from exc

            with content:
                for event, element in iterparse(content, events=("start", "end")):
                    if event == "start" and element.tag == TABLE_TAG:
                        current_table = element.get(TABLE_NAME, "")
                        if current_table == "Locations":
                            found_locations_sheet = True
                        continue

                    if (
                        event == "end"
                        and element.tag == ROW_TAG
                        and current_table == "Locations"
                    ):
                        values = _row_values(element)
                        element.clear()
                        if not any(values):
                            continue
                        if header is None:
                            header = _resolve_header(values)
                            continue

                        stats["rows_seen"] += 1
                        location_id = _value(values, header, "cqc_location_id")
                        service_group = _value(values, header, "service_group")
                        domain = _value(values, header, "domain")

                        if (
                            service_group.casefold() != "overall"
                            or domain.casefold() != "overall"
                        ):
                            stats["non_location_overall_rows"] += 1
                            continue
                        if not location_id or not re.fullmatch(
                            r"[A-Za-z0-9-]+", location_id
                        ):
                            stats["invalid_rows"] += 1
                            continue

                        rating = _normalise_rating(_value(values, header, "rating"))
                        if not rating:
                            stats["invalid_rows"] += 1
                            continue

                        try:
                            publication_date = _parse_date(
                                _value(values, header, "publication_date")
                            )
                        except CQCRatingsFormatError:
                            stats["invalid_rows"] += 1
                            continue

                        record = CQCRatingRecord(
                            cqc_location_id=location_id,
                            rating=rating,
                            publication_date=publication_date,
                            inherited=_parse_inherited(
                                _value(values, header, "inherited")
                            ),
                        )
                        current = records.get(location_id)
                        if current:
                            stats["duplicate_location_ratings"] += 1
                            if (
                                current.publication_date == record.publication_date
                                and current.rating != record.rating
                            ):
                                stats["ambiguous_same_date_ratings"] += 1
                            record = _prefer_record(current, record)
                        records[location_id] = record
                        stats["location_overall_rows"] += 1
                        continue

                    if event == "end" and element.tag == TABLE_TAG:
                        finished_table = current_table
                        element.clear()
                        current_table = ""
                        if finished_table == "Locations":
                            break
    except (BadZipFile, OSError, ParseError) as exc:
        raise CQCRatingsFormatError(
            "The file could not be read as a CQC ratings ODS workbook."
        ) from exc

    if not found_locations_sheet:
        raise CQCRatingsFormatError(
            "The CQC ratings workbook does not contain a Locations sheet."
        )
    if header is None:
        raise CQCRatingsFormatError(
            "The CQC ratings Locations sheet does not contain a supported header row."
        )

    stats["unique_location_ratings"] = len(records)
    return ParsedCQCRatings(records=records, stats=stats)


def import_cqc_ratings(
    source: str | Path | BinaryIO,
    *,
    dry_run: bool = False,
    batch_size: int = 1000,
) -> CQCRatingsImportResult:
    """Update imported directory locations by their stable CQC Location ID."""

    if batch_size < 1:
        raise ValueError("batch_size must be at least 1")

    parsed = parse_cqc_ratings(source)
    existing = ExternalProviderLocation.objects.in_bulk(
        parsed.records,
        field_name="cqc_location_id",
    )
    result = CQCRatingsImportResult(parsed=parsed)
    pending_updates = []

    for location_id, record in parsed.records.items():
        location = existing.get(location_id)
        if location is None:
            result.unmatched += 1
            continue

        result.matched += 1
        changed = (
            location.cqc_rating != record.rating
            or location.cqc_rating_date != record.publication_date
            or location.cqc_rating_inherited != record.inherited
        )
        if not changed:
            result.unchanged += 1
            continue

        location.cqc_rating = record.rating
        location.cqc_rating_date = record.publication_date
        location.cqc_rating_inherited = record.inherited
        pending_updates.append(location)
        result.updated += 1

    if pending_updates and not dry_run:
        with transaction.atomic():
            ExternalProviderLocation.objects.bulk_update(
                pending_updates,
                RATING_UPDATE_FIELDS,
                batch_size=batch_size,
            )

    return result
