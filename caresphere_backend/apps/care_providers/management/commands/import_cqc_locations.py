from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from ...services.cqc_directory import (
    CQCDirectoryFormatError,
    import_cqc_directory,
    parse_cqc_directory,
)


class Command(BaseCommand):
    help = (
        "Import adult social-care locations from the public CQC care "
        "directory CSV. Existing rows are updated by CQC Location ID."
    )

    def add_arguments(self, parser):
        parser.add_argument("csv_path", help="Path to the CQC care directory CSV")
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Validate and report changes without writing to the database",
        )
        parser.add_argument(
            "--batch-size",
            type=int,
            default=1000,
            help="Database bulk-operation batch size (default: 1000)",
        )
        parser.add_argument(
            "--limit",
            type=int,
            help="Stop after this many eligible unique locations (development only)",
        )
        parser.add_argument(
            "--deactivate-missing",
            action="store_true",
            help=(
                "Mark previously imported locations inactive when they are absent "
                "from this complete snapshot"
            ),
        )
        parser.add_argument(
            "--minimum-relevant-rows",
            type=int,
            default=1000,
            help=("Safety threshold used with --deactivate-missing (default: 1000)"),
        )

    def handle(self, *args, **options):
        csv_path = Path(options["csv_path"]).expanduser().resolve()
        batch_size = options["batch_size"]
        limit = options["limit"]
        deactivate_missing = options["deactivate_missing"]
        minimum_relevant_rows = options["minimum_relevant_rows"]

        if not csv_path.is_file():
            raise CommandError(f"CSV file does not exist: {csv_path}")
        if batch_size < 1:
            raise CommandError("--batch-size must be at least 1.")
        if limit is not None and limit < 1:
            raise CommandError("--limit must be at least 1.")
        if minimum_relevant_rows < 1:
            raise CommandError("--minimum-relevant-rows must be at least 1.")
        if deactivate_missing and limit is not None:
            raise CommandError(
                "--deactivate-missing cannot be combined with --limit because "
                "a partial snapshot must not deactivate existing locations."
            )

        try:
            with csv_path.open(encoding="utf-8-sig", newline="") as stream:
                # Parse once before a deactivation-enabled import so a small or
                # damaged file cannot silently deactivate the production index.
                if deactivate_missing:
                    snapshot = parse_cqc_directory(stream)
                    eligible = snapshot.stats["unique_locations"]
                    if eligible < minimum_relevant_rows:
                        raise CommandError(
                            "Refusing to deactivate locations: the snapshot has "
                            f"only {eligible} relevant rows; expected at least "
                            f"{minimum_relevant_rows}."
                        )
                    stream.seek(0)

                result = import_cqc_directory(
                    stream,
                    dry_run=options["dry_run"],
                    batch_size=batch_size,
                    limit=limit,
                    deactivate_missing=deactivate_missing,
                )
        except (OSError, UnicodeDecodeError, CQCDirectoryFormatError) as exc:
            raise CommandError(str(exc)) from exc

        stats = result.parsed.stats
        mode = "DRY RUN" if options["dry_run"] else "IMPORT COMPLETE"
        self.stdout.write(self.style.SUCCESS(mode))

        if result.parsed.source_published_on:
            self.stdout.write(
                f"CQC snapshot date: {result.parsed.source_published_on.isoformat()}"
            )
        self.stdout.write(f"Rows read: {stats['rows_seen']}")
        self.stdout.write(f"Relevant unique locations: {stats['unique_locations']}")
        self.stdout.write(f"Filtered unrelated locations: {stats['filtered']}")
        self.stdout.write(
            f"  Unrelated service type: {stats['irrelevant_service_type']}"
        )
        self.stdout.write(f"  Child-only service: {stats['child_only']}")
        self.stdout.write(f"Invalid rows: {stats['invalid']}")
        self.stdout.write(f"Duplicate CQC Location IDs: {stats['duplicates']}")
        self.stdout.write(f"Would create / created: {result.created}")
        self.stdout.write(f"Would update / updated: {result.updated}")
        self.stdout.write(f"Unchanged: {result.unchanged}")
        self.stdout.write(f"Reactivated: {result.reactivated}")
        self.stdout.write(f"Deactivated: {result.deactivated}")
