import csv
from html import escape
from io import BytesIO, StringIO
from zipfile import ZipFile

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.users.models import User

from .models import CareProvider, ExternalProviderLocation
from .services.cqc_directory import import_cqc_directory, parse_cqc_directory
from .services.cqc_ratings import import_cqc_ratings, parse_cqc_ratings

HEADER = [
    "Name",
    "Also known as",
    "Address",
    "Postcode",
    "Phone number",
    "Service's website (if available)",
    "Service types",
    "Date of latest check",
    "Specialisms/services",
    "Provider name",
    "Local authority",
    "Region",
    "Location URL",
    "CQC Location ID (for office use only)",
    "CQC Provider ID (for office use only)",
]


def cqc_row(
    name,
    location_id,
    service_types,
    specialisms="Caring for adults over 65 yrs",
    *,
    postcode="WD17 1AA",
    location_url=None,
):
    return [
        name,
        "",
        "1 High Street, Watford",
        postcode,
        "01923 000000",
        "example.org",
        service_types,
        "09/Jan/2026 - 00:00",
        specialisms,
        f"{name} Ltd",
        "Hertfordshire",
        "East of England",
        location_url or f"https://www.cqc.org.uk/location/{location_id}",
        location_id,
        "1-PROVIDER",
    ]


def make_csv(rows):
    stream = StringIO(newline="")
    writer = csv.writer(stream)
    writer.writerow(["CQC Locations data"])
    writer.writerow([])
    writer.writerow(["This data was produced on 26 August 2026"])
    writer.writerow([])
    writer.writerow(HEADER)
    writer.writerows(rows)
    stream.seek(0)
    return stream


RATINGS_HEADER = [
    "Location ID",
    "Service / Population Group",
    "Domain",
    "Latest Rating",
    "Publication Date",
    "Inherited Rating (Y/N)",
]


def make_ratings_ods(rows):
    def ods_row(values):
        cells = "".join(
            "<table:table-cell office:value-type=\"string\">"
            f"<text:p>{escape(str(value))}</text:p>"
            "</table:table-cell>"
            for value in values
        )
        return f"<table:table-row>{cells}</table:table-row>"

    content = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<office:document-content '
        'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" '
        'xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" '
        'xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0">'
        "<office:body><office:spreadsheet>"
        '<table:table table:name="Locations">'
        f"{ods_row(RATINGS_HEADER)}"
        f"{''.join(ods_row(row) for row in rows)}"
        "</table:table>"
        "</office:spreadsheet></office:body>"
        "</office:document-content>"
    )
    stream = BytesIO()
    with ZipFile(stream, "w") as archive:
        archive.writestr(
            "mimetype",
            "application/vnd.oasis.opendocument.spreadsheet",
        )
        archive.writestr("content.xml", content)
    stream.seek(0)
    return stream


class CQCDirectoryParserTests(TestCase):
    def test_parser_filters_normalises_and_deduplicates_real_schema(self):
        stream = make_csv(
            [
                cqc_row(
                    "Alpha Home Care",
                    "1-100",
                    "Homecare agencies|Supported living",
                    "Dementia|Caring for adults over 65 yrs",
                    postcode="wd17 1aa",
                ),
                cqc_row("Dental Place", "1-200", "Dentist", "Services for everyone"),
                cqc_row(
                    "Children First",
                    "1-300",
                    "Homecare agencies",
                    "Caring for children (0 - 18yrs)",
                ),
                cqc_row("No Age Nursing", "1-400", "Nursing homes", "Dementia"),
                cqc_row(
                    "Alpha Home Care Updated",
                    "1-100",
                    "Homecare agencies",
                    "Caring for adults under 65 yrs",
                    location_url="https://malicious.example/location/1-100",
                ),
                cqc_row("Missing ID", "", "Residential homes"),
            ]
        )

        snapshot = parse_cqc_directory(stream)

        self.assertEqual(snapshot.source_published_on.isoformat(), "2026-08-26")
        self.assertEqual(snapshot.stats["rows_seen"], 6)
        self.assertEqual(snapshot.stats["unique_locations"], 2)
        self.assertEqual(snapshot.stats["irrelevant_service_type"], 1)
        self.assertEqual(snapshot.stats["child_only"], 1)
        self.assertEqual(snapshot.stats["invalid"], 1)
        self.assertEqual(snapshot.stats["duplicates"], 1)

        alpha = snapshot.records["1-100"]
        self.assertEqual(alpha["name"], "Alpha Home Care Updated")
        self.assertEqual(alpha["postcode"], "WD17 1AA")
        self.assertEqual(alpha["care_types"], ["domiciliary"])
        self.assertEqual(
            alpha["location_url"],
            "https://www.cqc.org.uk/location/1-100",
        )
        self.assertIn("alpha home care updated", alpha["search_document"])
        self.assertEqual(len(alpha["content_hash"]), 64)


class CQCDirectoryImportTests(TestCase):
    def test_import_is_idempotent_and_updates_by_location_id(self):
        initial = make_csv(
            [
                cqc_row("Alpha Home Care", "1-100", "Homecare agencies"),
                cqc_row("Bravo Nursing", "1-200", "Nursing homes"),
            ]
        )
        first = import_cqc_directory(initial, batch_size=1)

        self.assertEqual(first.created, 2)
        self.assertEqual(ExternalProviderLocation.objects.count(), 2)

        repeated = import_cqc_directory(
            make_csv(
                [
                    cqc_row("Alpha Home Care", "1-100", "Homecare agencies"),
                    cqc_row("Bravo Nursing", "1-200", "Nursing homes"),
                ]
            )
        )
        self.assertEqual(repeated.created, 0)
        self.assertEqual(repeated.updated, 0)
        self.assertEqual(repeated.unchanged, 2)

        changed = import_cqc_directory(
            make_csv(
                [
                    cqc_row("Alpha Care Renamed", "1-100", "Homecare agencies"),
                ]
            )
        )
        self.assertEqual(changed.updated, 1)
        self.assertEqual(
            ExternalProviderLocation.objects.get(cqc_location_id="1-100").name,
            "Alpha Care Renamed",
        )

    def test_dry_run_does_not_write(self):
        result = import_cqc_directory(
            make_csv([cqc_row("Alpha Home Care", "1-100", "Homecare agencies")]),
            dry_run=True,
        )

        self.assertEqual(result.created, 1)
        self.assertFalse(ExternalProviderLocation.objects.exists())

    def test_complete_snapshot_can_deactivate_missing_locations(self):
        import_cqc_directory(
            make_csv(
                [
                    cqc_row("Alpha Home Care", "1-100", "Homecare agencies"),
                    cqc_row("Bravo Nursing", "1-200", "Nursing homes"),
                ]
            )
        )

        result = import_cqc_directory(
            make_csv([cqc_row("Alpha Home Care", "1-100", "Homecare agencies")]),
            deactivate_missing=True,
        )

        self.assertEqual(result.deactivated, 1)
        self.assertTrue(
            ExternalProviderLocation.objects.get(cqc_location_id="1-100").is_active
        )
        self.assertFalse(
            ExternalProviderLocation.objects.get(cqc_location_id="1-200").is_active
        )


class CQCRatingsImportTests(TestCase):
    def test_parser_keeps_latest_location_level_overall_rating(self):
        parsed = parse_cqc_ratings(
            make_ratings_ods(
                [
                    ["1-100", "Overall", "Safe", "Good", "2024-05-01", "N"],
                    ["1-100", "Overall", "Overall", "Good", "2024-05-01", "N"],
                    [
                        "1-100",
                        "Overall",
                        "Overall",
                        "Outstanding",
                        "2023-05-01",
                        "Y",
                    ],
                    [
                        "1-200",
                        "Homecare services",
                        "Overall",
                        "Outstanding",
                        "2024-05-01",
                        "N",
                    ],
                ]
            )
        )

        self.assertEqual(parsed.stats["rows_seen"], 4)
        self.assertEqual(parsed.stats["unique_location_ratings"], 1)
        self.assertEqual(parsed.stats["non_location_overall_rows"], 2)
        self.assertEqual(parsed.stats["duplicate_location_ratings"], 1)
        rating = parsed.records["1-100"]
        self.assertEqual(rating.rating, "Good")
        self.assertEqual(rating.publication_date.isoformat(), "2024-05-01")
        self.assertFalse(rating.inherited)

    def test_import_matches_directory_rows_by_cqc_location_id(self):
        import_cqc_directory(
            make_csv([cqc_row("Alpha Home Care", "1-100", "Homecare agencies")])
        )
        ratings_file = make_ratings_ods(
            [
                ["1-100", "Overall", "Overall", "Good", "2024-05-01", "N"],
                ["1-999", "Overall", "Overall", "Outstanding", "2024-05-02", "N"],
            ]
        )

        dry_run = import_cqc_ratings(ratings_file, dry_run=True)
        self.assertEqual(dry_run.matched, 1)
        self.assertEqual(dry_run.unmatched, 1)
        self.assertEqual(dry_run.updated, 1)
        location = ExternalProviderLocation.objects.get(cqc_location_id="1-100")
        self.assertEqual(location.cqc_rating, "")

        ratings_file.seek(0)
        imported = import_cqc_ratings(ratings_file)
        self.assertEqual(imported.updated, 1)
        location.refresh_from_db()
        self.assertEqual(location.cqc_rating, "Good")
        self.assertEqual(location.cqc_rating_date.isoformat(), "2024-05-01")
        self.assertFalse(location.cqc_rating_inherited)

    def test_weekly_directory_refresh_preserves_imported_rating(self):
        import_cqc_directory(
            make_csv([cqc_row("Alpha Home Care", "1-100", "Homecare agencies")])
        )
        import_cqc_ratings(
            make_ratings_ods(
                [["1-100", "Overall", "Overall", "Good", "2024-05-01", "N"]]
            )
        )

        import_cqc_directory(
            make_csv(
                [cqc_row("Alpha Home Care Renamed", "1-100", "Homecare agencies")]
            )
        )

        location = ExternalProviderLocation.objects.get(cqc_location_id="1-100")
        self.assertEqual(location.name, "Alpha Home Care Renamed")
        self.assertEqual(location.cqc_rating, "Good")
        self.assertEqual(location.cqc_rating_date.isoformat(), "2024-05-01")


class ProviderDiscoveryTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        user = User.objects.create_user(
            username="provider",
            password="test-password",
            user_type="provider",
        )
        self.internal = CareProvider.objects.create(
            user=user,
            company_name="CareSphere Watford Care",
            business_type=CareProvider.BusinessType.AGENCY,
            care_types=[CareProvider.CareType.DOMICILIARY],
            specializations=["dementia"],
            address_line1="2 High Street",
            city="Watford",
            postcode="WD17 2BB",
            county="Hertfordshire",
            phone="01923 111111",
            email="care@example.com",
            is_verified=True,
            cqc_verified=True,
            cqc_location_id="1-INTERNAL",
            cqc_rating="Good",
            accepts_private_pay=True,
        )
        self.external = ExternalProviderLocation.objects.create(
            cqc_location_id="1-EXT",
            cqc_provider_id="1-PROVIDER",
            name="Independent Watford Support",
            provider_name="Independent Support Ltd",
            address="3 High Street, Watford",
            postcode="WD17 3CC",
            phone="01923 222222",
            service_types=["Supported living"],
            specialisms=["Caring for adults under 65 yrs", "Dementia"],
            care_types=["specialist"],
            local_authority="Hertfordshire",
            region="East of England",
            location_url="https://www.cqc.org.uk/location/1-EXT",
            cqc_rating="Outstanding",
            cqc_rating_date=timezone.now().date(),
            cqc_rating_inherited=False,
            content_hash="a" * 64,
            search_document=(
                "independent watford support supported living specialist "
                "dementia wd17 3cc"
            ),
            last_seen_at=timezone.now(),
        )

    def test_discovery_combines_internal_and_cqc_results(self):
        response = self.client.get(
            "/api/care-providers/discovery/",
            {"q": "Watford", "page_size": 10},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 2)
        self.assertEqual(response.data["source_counts"]["caresphere"], 1)
        self.assertEqual(response.data["source_counts"]["cqc_directory"], 1)
        self.assertEqual(
            {item["source"] for item in response.data["results"]},
            {"caresphere", "cqc_directory"},
        )

        external = next(
            item
            for item in response.data["results"]
            if item["source"] == "cqc_directory"
        )
        self.assertFalse(external["can_book"])
        self.assertFalse(external["can_save"])
        self.assertTrue(external["cqc_registered"])

    def test_funding_filter_excludes_directory_rows_with_unknown_funding(self):
        response = self.client.get(
            "/api/care-providers/discovery/",
            {"funding": "private"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["source"], "caresphere")

    def test_care_type_filter_uses_the_shared_discovery_taxonomy(self):
        response = self.client.get(
            "/api/care-providers/discovery/",
            {"care_type": "domiciliary"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["source"], "caresphere")

    def test_discovery_ignores_generic_words_in_a_natural_language_search(self):
        response = self.client.get(
            "/api/care-providers/discovery/",
            {"q": "dementia care", "page_size": 10},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 2)
        self.assertEqual(response.data["interpreted_query"], "dementia")
        self.assertEqual(
            {item["source"] for item in response.data["results"]},
            {"caresphere", "cqc_directory"},
        )

    def test_discovery_corrects_a_common_dementia_misspelling(self):
        response = self.client.get(
            "/api/care-providers/discovery/",
            {"q": "dimentia care", "page_size": 10},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 2)
        self.assertEqual(response.data["interpreted_query"], "dementia")
        self.assertEqual(
            response.data["query_corrections"],
            [{"from": "dimentia", "to": "dementia"}],
        )
        self.assertEqual(
            {item["source"] for item in response.data["results"]},
            {"caresphere", "cqc_directory"},
        )

    def test_best_match_ranks_care_location_before_quality_tiebreaker(self):
        response = self.client.get(
            "/api/care-providers/discovery/",
            {
                "q": "dimentia care",
                "location": "Watford",
                "page_size": 10,
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 2)
        first = response.data["results"][0]
        self.assertEqual(first["source"], "caresphere")
        self.assertGreater(
            first["match_score"],
            response.data["results"][1]["match_score"],
        )
        self.assertIn("Matches dementia care", first["match_reasons"])
        self.assertIn("Matches location: Watford", first["match_reasons"])
        self.assertIn("CQC rated Good", first["match_reasons"])

    def test_cqc_rating_sort_and_filter_include_directory_quality(self):
        sorted_response = self.client.get(
            "/api/care-providers/discovery/",
            {"q": "dementia", "sort": "cqc_rating", "page_size": 10},
        )

        self.assertEqual(sorted_response.status_code, 200)
        self.assertEqual(
            sorted_response.data["results"][0]["source"],
            "cqc_directory",
        )
        self.assertEqual(
            sorted_response.data["results"][0]["cqc_rating"],
            "Outstanding",
        )

        filtered_response = self.client.get(
            "/api/care-providers/discovery/",
            {"cqc_rating": "outstanding", "page_size": 10},
        )
        self.assertEqual(filtered_response.status_code, 200)
        self.assertEqual(filtered_response.data["count"], 1)
        self.assertEqual(
            filtered_response.data["results"][0]["source"],
            "cqc_directory",
        )

    def test_inactive_directory_rows_are_not_discoverable(self):
        self.external.is_active = False
        self.external.save(update_fields=["is_active"])

        response = self.client.get(
            "/api/care-providers/discovery/",
            {"source": "cqc_directory"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 0)
