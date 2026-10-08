from datetime import timedelta
from django.utils import timezone
from rest_framework.test import APITestCase
from apps.users.models import User
from .models import CareProvider, StaffMember, ShiftBlock


class WorkforceTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username='owner', user_type='provider')
        self.other = User.objects.create_user(username='other', user_type='provider')
        self.worker = User.objects.create_user(username='worker')
        self.outsider = User.objects.create_user(username='outsider')
        self.provider = CareProvider.objects.create(user=self.owner, company_name='Test care')
        self.other_provider = CareProvider.objects.create(user=self.other, company_name='Other care')
        self.staff = StaffMember.objects.create(provider=self.provider, user=self.worker, first_name='Test', last_name='Carer', role='caregiver')
        self.foreign_staff = StaffMember.objects.create(provider=self.other_provider, first_name='Other', last_name='Carer', role='caregiver')
        self.client.force_authenticate(self.owner)
        self.url = '/api/care-providers/workforce/shift-blocks/'
        start = timezone.now()+timedelta(days=2)
        self.payload = dict(title='Morning care', area='Watford', start_time=start.isoformat(), end_time=(start+timedelta(hours=4)).isoformat(), staff=[str(self.staff.pk)], pay_mode='fixed', rate='80.00')
    def create_block(self, **changes):
        response = self.client.post(self.url, {**self.payload, **changes}, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        return response.data['id']
    def test_draft_publish_worker_rota_and_edit_lock(self):
        pk = self.create_block()
        self.client.force_authenticate(self.worker)
        self.assertEqual(self.client.get(self.url+'my_rota/').data, [])
        self.assertEqual(self.client.get(self.url).status_code, 403)
        self.client.force_authenticate(self.owner)
        self.assertEqual(self.client.post(self.url+pk+'/publish/').status_code, 200)
        self.assertEqual(self.client.patch(self.url+pk+'/', {'area':'Elsewhere'}, format='json').status_code, 400)
        self.client.force_authenticate(self.worker)
        data = self.client.get(self.url+'my_rota/').data
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['planned_hours'], 4)
        self.assertNotIn('rate', data[0])
        self.client.force_authenticate(self.outsider)
        self.assertEqual(self.client.get(self.url+'my_rota/').data, [])
    def test_tenant_isolation_and_foreign_staff(self):
        pk=self.create_block()
        self.assertEqual(self.client.post(self.url, {**self.payload,'staff':[str(self.foreign_staff.pk)]},format='json').status_code,400)
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(self.url+pk+'/').status_code,404)
        self.assertEqual(self.client.post(self.url+pk+'/publish/').status_code,404)
    def test_time_validation_empty_and_inactive_assignment(self):
        self.assertEqual(self.client.post(self.url, {**self.payload,'end_time':self.payload['start_time']},format='json').status_code,400)
        pk=self.create_block(staff=[])
        self.assertEqual(self.client.post(self.url+pk+'/publish/').status_code,400)
        pk=self.create_block()
        self.staff.is_active=False; self.staff.save()
        self.assertEqual(self.client.post(self.url+pk+'/publish/').status_code,400)
    def test_overlap_time_off_and_adjacent_blocks(self):
        pk=self.create_block(kind='time_off')
        self.assertEqual(self.client.post(self.url+pk+'/publish/').status_code,200)
        second=self.create_block()
        self.assertEqual(self.client.post(self.url+second+'/publish/').status_code,400)
        start=timezone.datetime.fromisoformat(self.payload['end_time'])
        adjacent=self.create_block(start_time=start.isoformat(),end_time=(start+timedelta(hours=2)).isoformat())
        self.assertEqual(self.client.post(self.url+adjacent+'/publish/').status_code,200)
        self.assertEqual(self.client.post(self.url+pk+'/unpublish/').status_code,200)
        self.assertEqual(self.client.post(self.url+second+'/publish/').status_code,200)
    def test_worker_cannot_manage_and_manager_can(self):
        pk=self.create_block()
        self.client.force_authenticate(self.worker)
        self.assertEqual(self.client.post(self.url+pk+'/publish/').status_code,403)
        self.staff.role='manager';self.staff.save()
        self.assertEqual(self.client.post(self.url+pk+'/publish/').status_code,200)

    def test_date_window_and_invalid_range(self):
        self.create_block()
        self.create_block(start_time=(timezone.now()+timedelta(days=20)).isoformat(), end_time=(timezone.now()+timedelta(days=20,hours=3)).isoformat())
        response=self.client.get(self.url)
        self.assertEqual(len(response.data),1)
        self.assertEqual(self.client.get(self.url, {'start':'invalid'}).status_code,400)
    def test_coordinator_and_negative_rate(self):
        self.assertEqual(self.client.post(self.url,{**self.payload,'rate':'-1'},format='json').status_code,400)
        pk=self.create_block()
        self.staff.role='coordinator';self.staff.save()
        self.client.force_authenticate(self.worker)
        self.assertEqual(self.client.post(self.url+pk+'/publish/').status_code,200)
