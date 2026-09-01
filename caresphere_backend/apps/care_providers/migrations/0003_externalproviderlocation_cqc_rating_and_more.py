from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("care_providers", "0002_externalproviderlocation"),
    ]

    operations = [
        migrations.AddField(
            model_name="externalproviderlocation",
            name="cqc_rating",
            field=models.CharField(blank=True, db_index=True, max_length=50),
        ),
        migrations.AddField(
            model_name="externalproviderlocation",
            name="cqc_rating_date",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="externalproviderlocation",
            name="cqc_rating_inherited",
            field=models.BooleanField(blank=True, null=True),
        ),
    ]
