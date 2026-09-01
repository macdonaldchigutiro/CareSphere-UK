"""Explainable, database-backed ranking for combined provider discovery."""

from __future__ import annotations

from collections.abc import Iterable

from django.db.models import Case, IntegerField, Q, Value, When


QUALITY_SCORES = {
    "outstanding": 15,
    "good": 10,
    "requires improvement": 3,
    "inadequate": 0,
}


def _score_case(rules: Iterable[tuple[Q, int]]):
    return Case(
        *(When(condition, then=Value(points)) for condition, points in rules),
        default=Value(0),
        output_field=IntegerField(),
    )


def quality_score_expression(field_name: str = "cqc_rating"):
    return Case(
        When(**{f"{field_name}__iexact": "Outstanding"}, then=Value(15)),
        When(**{f"{field_name}__iexact": "Good"}, then=Value(10)),
        When(
            **{f"{field_name}__iexact": "Requires improvement"},
            then=Value(3),
        ),
        default=Value(0),
        output_field=IntegerField(),
    )


def internal_match_score(query_terms, *, care_type: str, location: str):
    score = quality_score_expression() + _score_case(
        [(Q(is_verified=True) | Q(cqc_verified=True), 5)]
    )

    for term in query_terms:
        score += _score_case(
            [
                (Q(specializations__icontains=term), 45),
                (Q(care_types__icontains=term), 40),
                (Q(postcode__iexact=term), 35),
                (Q(postcode__istartswith=term), 30),
                (Q(city__iexact=term), 35),
                (Q(county__iexact=term), 30),
                (Q(city__icontains=term), 25),
                (Q(county__icontains=term), 20),
                (Q(address_line1__icontains=term), 18),
                (Q(company_name__icontains=term), 18),
                (Q(trading_name__icontains=term), 15),
                (Q(cqc_location_id__icontains=term), 12),
            ]
        )

    if care_type:
        score += Value(45, output_field=IntegerField())
    if location:
        score += _score_case(
            [
                (Q(postcode__iexact=location), 40),
                (Q(postcode__istartswith=location), 35),
                (Q(city__iexact=location), 40),
                (Q(county__iexact=location), 35),
                (Q(city__icontains=location), 28),
                (Q(county__icontains=location), 24),
                (Q(address_line1__icontains=location), 18),
            ]
        )
    return score


def external_match_score(query_terms, *, care_type: str, location: str):
    # Every external row is a CQC-registered location, so it receives the same
    # small trust signal as a verified internal provider.
    score = quality_score_expression() + Value(5, output_field=IntegerField())

    for term in query_terms:
        score += _score_case(
            [
                (Q(specialisms__icontains=term), 45),
                (Q(service_types__icontains=term), 40),
                (Q(care_types__icontains=term), 38),
                (Q(postcode__iexact=term), 35),
                (Q(postcode__istartswith=term), 30),
                (Q(local_authority__iexact=term), 35),
                (Q(region__iexact=term), 25),
                (Q(local_authority__icontains=term), 25),
                (Q(region__icontains=term), 20),
                (Q(address__icontains=term), 18),
                (Q(name__icontains=term), 18),
                (Q(provider_name__icontains=term), 15),
                (Q(cqc_location_id__icontains=term), 12),
                (Q(search_document__icontains=term), 5),
            ]
        )

    if care_type:
        score += Value(45, output_field=IntegerField())
    if location:
        score += _score_case(
            [
                (Q(postcode__iexact=location), 40),
                (Q(postcode__istartswith=location), 35),
                (Q(local_authority__iexact=location), 35),
                (Q(region__iexact=location), 30),
                (Q(local_authority__icontains=location), 28),
                (Q(region__icontains=location), 24),
                (Q(address__icontains=location), 18),
            ]
        )
    return score


def _text_haystack(*values) -> str:
    flattened = []
    for value in values:
        if isinstance(value, (list, tuple, set)):
            flattened.extend(str(item) for item in value)
        elif value:
            flattened.append(str(value))
    return " ".join(flattened).casefold()


def add_match_explanation(
    data: dict,
    *,
    query_terms,
    care_type: str,
    location: str,
) -> dict:
    """Attach concise reasons without presenting the score as a percentage."""

    care_haystack = _text_haystack(
        data.get("care_types"),
        data.get("service_types"),
        data.get("specializations"),
    )
    location_haystack = _text_haystack(
        data.get("address_line1"),
        data.get("city"),
        data.get("county"),
        data.get("region"),
        data.get("postcode"),
    )
    name_haystack = _text_haystack(
        data.get("company_name"),
        data.get("trading_name"),
        data.get("provider_name"),
    )

    care_terms = [term for term in query_terms if term in care_haystack]
    location_terms = [term for term in query_terms if term in location_haystack]
    name_terms = [term for term in query_terms if term in name_haystack]
    reasons = []

    if care_terms:
        reasons.append(f"Matches {', '.join(dict.fromkeys(care_terms))} care")
    elif care_type:
        reasons.append(f"Offers {care_type.replace('_', ' ')} care")

    if location:
        reasons.append(f"Matches location: {location}")
    elif location_terms:
        reasons.append(
            f"Matches location: {', '.join(dict.fromkeys(location_terms))}"
        )

    if name_terms and not care_terms and not location_terms:
        reasons.append(f"Provider name matches {', '.join(dict.fromkeys(name_terms))}")

    rating = str(data.get("cqc_rating") or "")
    if rating.casefold() in QUALITY_SCORES:
        reasons.append(f"CQC rated {rating}")

    if data.get("is_verified"):
        reasons.append("CareSphere verified")
    elif data.get("cqc_registered"):
        reasons.append("CQC registered")

    data["match_score"] = int(data.get("match_score") or 0)
    data["match_reasons"] = reasons
    data["match_breakdown"] = {
        "care_match": bool(care_terms or care_type),
        "location_match": bool(location or location_terms),
        "quality_rating": rating or None,
        "trusted_source": bool(
            data.get("is_verified") or data.get("cqc_registered")
        ),
    }
    return data


def result_ordering_key(item: dict, sort: str):
    name = str(item.get("company_name", "")).casefold()
    source_order = 0 if item.get("source") == "caresphere" else 1
    identifier = str(item.get("id", ""))
    if sort == "name":
        return name, source_order, identifier
    if sort == "cqc_rating":
        return (
            -int(item.get("quality_score") or 0),
            -int(item.get("match_score") or 0),
            name,
            source_order,
            identifier,
        )
    return (
        -int(item.get("match_score") or 0),
        name,
        source_order,
        identifier,
    )
