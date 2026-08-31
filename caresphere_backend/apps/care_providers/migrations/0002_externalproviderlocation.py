import uuid

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("care_providers", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="ExternalProviderLocation",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("cqc_location_id", models.CharField(max_length=50, unique=True)),
                ("cqc_provider_id", models.CharField(blank=True, max_length=50)),
                ("name", models.CharField(max_length=255)),
                ("also_known_as", models.CharField(blank=True, max_length=255)),
                ("provider_name", models.CharField(blank=True, max_length=255)),
                ("address", models.TextField(blank=True)),
                ("postcode", models.CharField(blank=True, max_length=12)),
                ("phone", models.CharField(blank=True, max_length=50)),
                ("website", models.URLField(blank=True, max_length=500)),
                ("service_types", models.JSONField(default=list)),
                ("specialisms", models.JSONField(default=list)),
                ("care_types", models.JSONField(default=list)),
                ("local_authority", models.CharField(blank=True, max_length=150)),
                ("region", models.CharField(blank=True, max_length=150)),
                ("location_url", models.URLField(max_length=500)),
                ("latest_check_date", models.DateField(blank=True, null=True)),
                ("source_published_on", models.DateField(blank=True, null=True)),
                ("content_hash", models.CharField(max_length=64)),
                ("search_document", models.TextField(blank=True)),
                ("is_active", models.BooleanField(default=True)),
                ("first_imported_at", models.DateTimeField(auto_now_add=True)),
                ("last_seen_at", models.DateTimeField()),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "External Provider Location",
                "verbose_name_plural": "External Provider Locations",
                "ordering": ["name", "postcode"],
                "indexes": [
                    models.Index(fields=["postcode"], name="ext_provider_postcode_idx"),
                    models.Index(
                        fields=["local_authority"],
                        name="ext_provider_authority_idx",
                    ),
                    models.Index(fields=["region"], name="ext_provider_region_idx"),
                    models.Index(
                        fields=["is_active", "postcode"],
                        name="ext_provider_active_post_idx",
                    ),
                    models.Index(
                        fields=["is_active", "name"],
                        name="ext_provider_active_name_idx",
                    ),
                ],
            },
        ),
    ]
