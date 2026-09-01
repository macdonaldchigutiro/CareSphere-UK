from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from ...services.cqc_ratings import (
    CQCRatingsFormatError,
    import_cqc_ratings,
)


class Command(BaseCommand):
    help = (
        "Enrich imported CQC directory locations with location-level ratings "
        "from the monthly CQC Latest ratings ODS workbook."
    )

    def add_arguments(self, parser):
        parser.add_argument("ods_path", help="Path to the CQC Latest ratings ODS file")
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Validate and report changes without writing to the database",
        )
        parser.add_argument(
            "--batch-size",
            type=int,
            default=1000,
            help="Database bulk-update batch size (default: 1000)",
        )

    def handle(self, *args, **options):
        ods_path = Path(options["ods_path"]).expanduser().resolve()
        batch_size = options["batch_size"]

        if not ods_path.is_file():
            raise CommandError(f"ODS file does not exist: {ods_path}")
        if ods_path.suffix.casefold() != ".ods":
            raise CommandError("The CQC ratings file must be an .ods workbook.")
        if batch_size < 1:
            raise CommandError("--batch-size must be at least 1.")

        try:
            result = import_cqc_ratings(
                ods_path,
                dry_run=options["dry_run"],
                batch_size=batch_size,
            )
        except (OSError, CQCRatingsFormatError, ValueError) as exc:
            raise CommandError(str(exc)) from exc

        stats = result.parsed.stats
        mode = "DRY RUN" if options["dry_run"] else "RATINGS IMPORT COMPLETE"
        self.stdout.write(self.style.SUCCESS(mode))
        self.stdout.write(f"Rows read: {stats['rows_seen']}")
        self.stdout.write(
            f"Location-level overall ratings: {stats['unique_location_ratings']}"
        )
        self.stdout.write(
            "Ignored domain/service rows: "
            f"{stats['non_location_overall_rows']}"
        )
        self.stdout.write(f"Invalid rows: {stats['invalid_rows']}")
        self.stdout.write(
            "Duplicate location ratings: "
            f"{stats['duplicate_location_ratings']}"
        )
        self.stdout.write(f"Matched imported locations: {result.matched}")
        self.stdout.write(f"Ratings not in CareSphere scope: {result.unmatched}")
        self.stdout.write(f"Would update / updated: {result.updated}")
        self.stdout.write(f"Unchanged: {result.unchanged}")
