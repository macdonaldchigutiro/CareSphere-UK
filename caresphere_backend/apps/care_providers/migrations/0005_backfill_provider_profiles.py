from django.db import migrations


def create_missing_provider_profiles(apps, schema_editor):
    User = apps.get_model("users", "User")
    CareProvider = apps.get_model("care_providers", "CareProvider")

    linked_user_ids = CareProvider.objects.values_list("user_id", flat=True)

    for user in User.objects.filter(user_type="provider").exclude(
        id__in=linked_user_ids
    ):
        display_name = f"{user.first_name} {user.last_name}".strip() or user.email
        CareProvider.objects.create(
            user=user,
            company_name=display_name,
            business_type="individual",
            care_types=[],
            specializations=[],
            address_line1="",
            city="",
            postcode="",
            county="",
            phone="",
            email=user.email,
            is_accepting_clients=False,
        )


class Migration(migrations.Migration):
    dependencies = [
        ("care_providers", "0004_externalproviderlocation_coordinates"),
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(
            create_missing_provider_profiles,
            migrations.RunPython.noop,
        ),
    ]
