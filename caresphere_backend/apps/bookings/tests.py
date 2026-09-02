from datetime import time, timedelta
from io import StringIO

from django.core.management import call_command
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.bookings.models import Booking
from apps.care_providers.models import (
    AvailabilitySlot,
    CareProvider,
    StaffMember,
)
from apps.notifications.models import Notification
from apps.service_users.models import ServiceUserProfile
from apps.users.models import User


@override_settings(DEBUG=True)
class DemoJourneyCommandTests(TestCase):
    def test_command_is_repeatable_and_creates_three_roles(self):
        output = StringIO()

        for _ in range(2):
            call_command(
                "seed_demo_journey",
                password="DemoPassword!123",
                stdout=output,
            )

        self.assertEqual(
            User.objects.filter(email__endswith="@caresphere.local").count(),
            3,
        )
        self.assertEqual(Booking.objects.count(), 1)
        self.assertEqual(Booking.objects.get().status, Booking.Status.PENDING)
        self.assertIn("CARESPHERE DEMO READY", output.getvalue())


class ThreeRoleCareJourneyTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            username="admin-journey@example.com",
            email="admin-journey@example.com",
            password="test-password",
            user_type="admin",
        )
        self.provider_user = User.objects.create_user(
            username="provider-journey@example.com",
            email="provider-journey@example.com",
            password="test-password",
            user_type="provider",
        )
        self.family_user = User.objects.create_user(
            username="family-journey@example.com",
            email="family-journey@example.com",
            password="test-password",
            user_type="family",
        )
        self.provider = CareProvider.objects.create(
            user=self.provider_user,
            company_name="Journey Care Ltd",
            business_type=CareProvider.BusinessType.AGENCY,
            care_types=[CareProvider.CareType.DOMICILIARY],
            specializations=["dementia"],
            address_line1="1 Test Street",
            city="Watford",
            postcode="WD17 1NA",
            county="Hertfordshire",
            phone="01923000000",
            email=self.provider_user.email,
            is_verified=True,
        )
        self.staff = StaffMember.objects.create(
            provider=self.provider,
            first_name="Sam",
            last_name="Carer",
            role=StaffMember.Role.CAREGIVER,
            is_available=True,
            is_active=True,
        )
        self.care_recipient = ServiceUserProfile.objects.create(
            managed_by=self.family_user,
            first_name="Mary",
            last_name="Example",
            medical_conditions=["Dementia"],
        )
        self.start_date = timezone.localdate() + timedelta(days=1)
        self.start_at = timezone.make_aware(
            timezone.datetime.combine(self.start_date, time(10, 0))
        )
        self.end_at = timezone.make_aware(
            timezone.datetime.combine(self.start_date, time(12, 0))
        )
        AvailabilitySlot.objects.create(
            provider=self.provider,
            staff_member=self.staff,
            slot_type=AvailabilitySlot.SlotType.HOURLY,
            start_date=self.start_date,
            end_date=self.start_date,
            start_time=time(8, 0),
            end_time=time(18, 0),
            is_available=True,
        )

    def test_family_provider_and_admin_complete_the_request_journey(self):
        self.client.force_authenticate(self.family_user)
        create_response = self.client.post(
            "/api/bookings/",
            {
                "provider": str(self.provider.id),
                "service_user": self.care_recipient.id,
                "care_type": "Dementia care",
                "frequency": Booking.Frequency.WEEKLY,
                "start_time": self.start_at.isoformat(),
                "end_time": self.end_at.isoformat(),
                "requirements": "Morning personal care and companionship.",
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        booking_id = create_response.data["id"]
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.provider_user,
                title="New care request",
            ).exists()
        )

        forbidden = self.client.post(f"/api/bookings/{booking_id}/accept/")
        self.assertEqual(forbidden.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(self.provider_user)
        provider_list = self.client.get("/api/bookings/")
        self.assertEqual(provider_list.status_code, status.HTTP_200_OK)
        self.assertEqual(provider_list.data["count"], 1)

        accepted = self.client.post(f"/api/bookings/{booking_id}/accept/")
        self.assertEqual(accepted.status_code, status.HTTP_200_OK)
        assigned = self.client.post(
            f"/api/bookings/{booking_id}/assign-staff/",
            {"staff_member": str(self.staff.id)},
            format="json",
        )
        self.assertEqual(assigned.status_code, status.HTTP_200_OK)
        confirmed = self.client.post(f"/api/bookings/{booking_id}/confirm/")
        self.assertEqual(confirmed.status_code, status.HTTP_200_OK)

        self.client.force_authenticate(self.admin)
        admin_list = self.client.get("/api/bookings/")
        self.assertEqual(admin_list.status_code, status.HTTP_200_OK)
        self.assertEqual(admin_list.data["count"], 1)
        admin_dashboard = self.client.get("/api/users/admin/dashboard/")
        self.assertEqual(admin_dashboard.status_code, status.HTTP_200_OK)
        self.assertEqual(admin_dashboard.data["summary"]["total_bookings"], 1)

        booking = Booking.objects.get(pk=booking_id)
        self.assertEqual(booking.status, Booking.Status.CONFIRMED)
        self.assertEqual(booking.assigned_staff, self.staff)
