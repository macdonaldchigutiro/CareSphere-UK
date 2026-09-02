from __future__ import annotations

from collections import defaultdict

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from ...models import CareProvider, ExternalProviderLocation
from ...services.postcode_geo import (
    MAX_BULK_POSTCODES,
    PostcodeServiceError,
    build_retrying_session,
    bulk_lookup_postcodes,
    is_full_uk_postcode,
    normalise_postcode,
)


class Command(BaseCommand):
    help = (
        "Enrich CareSphere and imported CQC provider postcodes with approximate "
        "coordinates from Postcodes.io for radius discovery."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--source",
            choices=("all", "caresphere", "cqc_directory"),
            default="all",
            help="Provider source to enrich (default: all)",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Look up and report coordinates without writing to the database",
        )
        parser.add_argument(
            "--refresh",
            action="store_true",
            help="Refresh records that already have coordinates",
        )
        parser.add_argument(
            "--limit",
            type=int,
            help="Limit unique postcodes for a small test run",
        )
        parser.add_argument(
            "--batch-size",
            type=int,
            default=MAX_BULK_POSTCODES,
            help=f"Postcodes per API request (maximum {MAX_BULK_POSTCODES})",
        )
        parser.add_argument(
            "--timeout",
            type=float,
            default=15,
            help="Seconds allowed for each Postcodes.io request (default: 15)",
        )

    def handle(self, *args, **options):
        source = options["source"]
        batch_size = options["batch_size"]
        limit = options["limit"]
        timeout = options["timeout"]

        if batch_size < 1 or batch_size > MAX_BULK_POSTCODES:
            raise CommandError(
                f"--batch-size must be between 1 and {MAX_BULK_POSTCODES}."
            )
        if limit is not None and limit < 1:
            raise CommandError("--limit must be at least 1.")
        if timeout <= 0:
            raise CommandError("--timeout must be greater than zero.")

        external = ExternalProviderLocation.objects.filter(is_active=True)
        internal = CareProvider.objects.all()
        if not options["refresh"]:
            missing = Q(latitude__isnull=True) | Q(longitude__isnull=True)
            external = external.filter(missing)
            internal = internal.filter(missing)

        targets = defaultdict(lambda: {"external": [], "internal": []})
        invalid_records = 0

        if source in {"all", "cqc_directory"}:
            for location in external.only("id", "postcode", "latitude", "longitude"):
                postcode = normalise_postcode(location.postcode)
                if not is_full_uk_postcode(postcode) or postcode.startswith("BT"):
                    invalid_records += 1
                    continue
                targets[postcode]["external"].append(location)

        if source in {"all", "caresphere"}:
            for provider in internal.only("id", "postcode", "latitude", "longitude"):
                postcode = normalise_postcode(provider.postcode)
                if not is_full_uk_postcode(postcode) or postcode.startswith("BT"):
                    invalid_records += 1
                    continue
                targets[postcode]["internal"].append(provider)

        postcodes = sorted(targets)
        if limit is not None:
            postcodes = postcodes[:limit]

        self.stdout.write(f"Unique postcodes to look up: {len(postcodes)}")
        self.stdout.write(f"Records with invalid/unsupported postcodes: {invalid_records}")
        if not postcodes:
            self.stdout.write(self.style.SUCCESS("No coordinates need enrichment."))
            return

        resolved = {}
        client = build_retrying_session()
        total_batches = (len(postcodes) + batch_size - 1) // batch_size
        try:
            for start in range(0, len(postcodes), batch_size):
                batch = postcodes[start : start + batch_size]
                resolved.update(
                    bulk_lookup_postcodes(
                        batch,
                        timeout=timeout,
                        session=client,
                    )
                )
                batch_number = start // batch_size + 1
                if (
                    batch_number == 1
                    or batch_number % 25 == 0
                    or batch_number == total_batches
                ):
                    self.stdout.write(
                        f"Looked up batch {batch_number} of {total_batches}..."
                    )
        except PostcodeServiceError as exc:
            raise CommandError(
                f"No database changes were made. {exc}"
            ) from exc

        now = timezone.now()
        external_updates = []
        internal_updates = []
        for postcode in postcodes:
            coordinates = resolved.get(postcode)
            if coordinates is None:
                continue
            for location in targets[postcode]["external"]:
                location.latitude = coordinates.latitude
                location.longitude = coordinates.longitude
                location.coordinates_updated_at = now
                external_updates.append(location)
            for provider in targets[postcode]["internal"]:
                provider.latitude = coordinates.latitude
                provider.longitude = coordinates.longitude
                internal_updates.append(provider)

        if not options["dry_run"]:
            with transaction.atomic():
                ExternalProviderLocation.objects.bulk_update(
                    external_updates,
                    ["latitude", "longitude", "coordinates_updated_at"],
                    batch_size=1000,
                )
                CareProvider.objects.bulk_update(
                    internal_updates,
                    ["latitude", "longitude"],
                    batch_size=1000,
                )

        mode = "DRY RUN" if options["dry_run"] else "COORDINATE ENRICHMENT COMPLETE"
        self.stdout.write(self.style.SUCCESS(mode))
        self.stdout.write(f"Postcodes found: {len(resolved)}")
        self.stdout.write(f"Postcodes not found: {len(postcodes) - len(resolved)}")
        self.stdout.write(
            f"CareSphere providers would update / updated: {len(internal_updates)}"
        )
        self.stdout.write(
            f"CQC directory locations would update / updated: {len(external_updates)}"
        )
