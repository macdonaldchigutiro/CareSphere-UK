from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from django.core import mail
from django.test import override_settings

from apps.care_providers.models import CareProvider, StaffMember
from apps.users.models import User


class RoleBoundaryAPITests(TestCase):
    """Protect the API boundaries behind the three CareSphere workspaces."""

    def setUp(self):
        self.client = APIClient()
        self.admin = self._create_user(
            "admin-boundary@example.com",
            user_type="admin",
            is_staff=True,
        )
        self.family = self._create_user(
            "family-boundary@example.com",
            user_type="family",
        )
        self.provider_user = self._create_user(
            "provider-boundary@example.com",
            user_type="provider",
        )
        self.other_provider_user = self._create_user(
            "other-provider-boundary@example.com",
            user_type="provider",
        )
        self.provider = self._create_provider(
            self.provider_user,
            "Boundary Care Ltd",
        )
        self.other_provider = self._create_provider(
            self.other_provider_user,
            "Other Boundary Care Ltd",
        )
        self.staff = StaffMember.objects.create(
            provider=self.provider,
            first_name="Priya",
            last_name="Carer",
            role=StaffMember.Role.CAREGIVER,
        )
        self.other_staff = StaffMember.objects.create(
            provider=self.other_provider,
            first_name="Other",
            last_name="Carer",
            role=StaffMember.Role.CAREGIVER,
        )

    def _create_user(self, email, *, user_type, is_staff=False):
        return User.objects.create_user(
            username=email,
            email=email,
            password="test-password",
            user_type=user_type,
            is_staff=is_staff,
        )

    def _create_provider(self, user, company_name):
        return CareProvider.objects.create(
            user=user,
            company_name=company_name,
            business_type=CareProvider.BusinessType.AGENCY,
            care_types=[CareProvider.CareType.DOMICILIARY],
            address_line1="1 Test Street",
            city="Watford",
            postcode="WD17 1NA",
            county="Hertfordshire",
            phone="01923000000",
            email=user.email,
        )

    def authenticate(self, user):
        self.client.force_authenticate(user)

    def test_anonymous_users_cannot_open_private_workspaces(self):
        private_urls = [
            "/api/users/profile/",
            "/api/users/admin/dashboard/",
            "/api/care-providers/my-profile/",
            "/api/care-providers/my-staff/",
            "/api/care-providers/my-availability/",
            "/api/bookings/",
        ]

        for url in private_urls:
            with self.subTest(url=url):
                response = self.client.get(url)
                self.assertIn(
                    response.status_code,
                    {status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN},
                )

    def test_only_platform_administrators_can_open_admin_apis(self):
        admin_urls = [
            "/api/users/admin/dashboard/",
            "/api/users/admin/operations/",
            "/api/users/admin/governance/",
        ]

        for user in (self.family, self.provider_user):
            self.authenticate(user)
            for url in admin_urls:
                with self.subTest(user=user.email, url=url):
                    response = self.client.get(url)
                    self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self.authenticate(self.admin)
        for url in admin_urls:
            with self.subTest(url=url):
                response = self.client.get(url)
                self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_family_accounts_cannot_open_provider_self_service_apis(self):
        self.authenticate(self.family)

        for url in (
            "/api/care-providers/my-profile/",
            "/api/care-providers/my-staff/",
            "/api/care-providers/my-availability/",
        ):
            with self.subTest(url=url):
                response = self.client.get(url)
                self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_provider_self_service_data_is_isolated_by_company(self):
        self.authenticate(self.provider_user)

        profile_response = self.client.get("/api/care-providers/my-profile/")
        self.assertEqual(profile_response.status_code, status.HTTP_200_OK)
        self.assertEqual(profile_response.data["id"], str(self.provider.id))

        staff_response = self.client.get("/api/care-providers/my-staff/")
        self.assertEqual(staff_response.status_code, status.HTTP_200_OK)
        staff_results = staff_response.data.get("results", staff_response.data)
        self.assertEqual(len(staff_results), 1)
        self.assertEqual(staff_results[0]["id"], str(self.staff.id))

        other_staff_response = self.client.get(
            f"/api/care-providers/my-staff/{self.other_staff.id}/"
        )
        self.assertEqual(other_staff_response.status_code, status.HTTP_404_NOT_FOUND)


class RegistrationAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_provider_registration_creates_linked_draft_profile(self):
        response = self.client.post(
            "/api/users/register/",
            {
                "email": "new-provider@example.com",
                "first_name": "Sarah",
                "last_name": "Thompson",
                "password": "safe-test-password",
                "user_type": "provider",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(email="new-provider@example.com")
        provider = CareProvider.objects.get(user=user)
        self.assertEqual(provider.company_name, "Sarah Thompson")
        self.assertEqual(provider.email, user.email)
        self.assertFalse(provider.is_accepting_clients)

    def test_family_registration_does_not_create_provider_profile(self):
        response = self.client.post(
            "/api/users/register/",
            {
                "email": "new-family@example.com",
                "first_name": "Freddie",
                "last_name": "Family",
                "password": "safe-test-password",
                "user_type": "family",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(email="new-family@example.com")
        self.assertFalse(CareProvider.objects.filter(user=user).exists())

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
    def test_registration_sends_email_and_token_verifies_account(self):
        response = self.client.post(
            "/api/users/register/",
            {
                "email": "verify-me@example.com",
                "first_name": "Verify",
                "last_name": "Me",
                "password": "safe-test-password",
                "user_type": "family",
            },
            format="json",
        )
        self.assertTrue(response.data["verification_email_sent"])
        self.assertEqual(len(mail.outbox), 1)
        token = mail.outbox[0].body.split("token=", 1)[1].splitlines()[0]

        verify_response = self.client.post(
            "/api/users/verify-email/", {"token": token}, format="json"
        )
        self.assertEqual(verify_response.status_code, status.HTTP_200_OK)
        self.assertTrue(User.objects.get(email="verify-me@example.com").is_verified)
