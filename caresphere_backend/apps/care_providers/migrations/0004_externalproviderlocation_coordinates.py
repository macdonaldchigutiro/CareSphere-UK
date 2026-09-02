from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("care_providers", "0003_externalproviderlocation_cqc_rating_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="externalproviderlocation",
            name="latitude",
            field=models.DecimalField(
                blank=True,
                decimal_places=6,
                max_digits=9,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="externalproviderlocation",
            name="longitude",
            field=models.DecimalField(
                blank=True,
                decimal_places=6,
                max_digits=9,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="externalproviderlocation",
            name="coordinates_updated_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddIndex(
            model_name="externalproviderlocation",
            index=models.Index(
                fields=["latitude", "longitude"],
                name="ext_provider_coords_idx",
            ),
        ),
    ]
