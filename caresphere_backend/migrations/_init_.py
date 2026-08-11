"""
Initial database migrations for CareSphere UK
"""
from django.db import migrations, models
import django.db.models.deletion
import uuid
import django.utils.timezone
from django.conf import settings


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ('auth', '0012_alter_user_first_name_max_length'),
    ]

    operations = [
        # Create User model
        migrations.CreateModel(
            name='User',
            fields=[
                ('password', models.CharField(max_length=128, verbose_name='password')),
                ('last_login', models.DateTimeField(blank=True, null=True, verbose_name='last login')),
                ('is_superuser', models.BooleanField(default=False, help_text='Designates that this user has all permissions without explicitly assigning them.', verbose_name='superuser')),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('email', models.EmailField(max_length=254, unique=True, verbose_name='Email Address')),
                ('phone_number', models.CharField(blank=True, max_length=17)),
                ('first_name', models.CharField(max_length=150)),
                ('last_name', models.CharField(max_length=150)),
                ('date_of_birth', models.DateField(blank=True, null=True)),
                ('user_type', models.CharField(choices=[('service_user', 'Service User'), ('family_member', 'Family Member'), ('care_provider', 'Care Provider'), ('caregiver', 'Caregiver'), ('admin', 'Administrator'), ('system', 'System')], default='service_user', max_length=20)),
                ('is_active', models.BooleanField(default=True)),
                ('is_staff', models.BooleanField(default=False)),
                ('is_verified', models.BooleanField(default=False)),
                ('date_joined', models.DateTimeField(default=django.utils.timezone.now)),
                ('last_updated', models.DateTimeField(auto_now=True)),
                ('gdpr_consent_given', models.BooleanField(default=False)),
                ('gdpr_consent_date', models.DateTimeField(blank=True, null=True)),
                ('marketing_consent', models.BooleanField(default=False)),
                ('preferred_language', models.CharField(default='en', max_length=10)),
                ('accessibility_mode', models.CharField(choices=[('standard', 'Standard'), ('high_contrast', 'High Contrast'), ('large_text', 'Large Text'), ('screen_reader', 'Screen Reader Optimized')], default='standard', max_length=20)),
            ],
            options={
                'verbose_name': 'User',
                'verbose_name_plural': 'Users',
            },
        ),
        
        # Add permissions
        migrations.AddField(
            model_name='user',
            name='groups',
            field=models.ManyToManyField(blank=True, help_text='The groups this user belongs to. A user will get all permissions granted to each of their groups.', related_name='user_set', related_query_name='user', to='auth.Group', verbose_name='groups'),
        ),
        migrations.AddField(
            model_name='user',
            name='user_permissions',
            field=models.ManyToManyField(blank=True, help_text='Specific permissions for this user.', related_name='user_set', related_query_name='user', to='auth.Permission', verbose_name='user permissions'),
        ),
        
        # Create UserProfile
        migrations.CreateModel(
            name='UserProfile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('profile_picture', models.ImageField(blank=True, null=True, upload_to='profile_pictures/')),
                ('bio', models.TextField(blank=True)),
                ('address_line1', models.CharField(blank=True, max_length=255)),
                ('address_line2', models.CharField(blank=True, max_length=255)),
                ('city', models.CharField(blank=True, max_length=100)),
                ('postcode', models.CharField(blank=True, max_length=10)),
                ('county', models.CharField(blank=True, max_length=100)),
                ('country', models.CharField(default='United Kingdom', max_length=100)),
                ('latitude', models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ('longitude', models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ('emergency_contact_name', models.CharField(blank=True, max_length=255)),
                ('emergency_contact_phone', models.CharField(blank=True, max_length=17)),
                ('emergency_contact_relationship', models.CharField(blank=True, max_length=100)),
                ('preferred_contact_method', models.CharField(choices=[('email', 'Email'), ('phone', 'Phone'), ('sms', 'SMS'), ('app', 'In-App Notification')], default='email', max_length=20)),
                ('notification_frequency', models.CharField(choices=[('immediate', 'Immediate'), ('daily_digest', 'Daily Digest'), ('weekly_summary', 'Weekly Summary')], default='immediate', max_length=20)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='profile', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'User Profile',
                'verbose_name_plural': 'User Profiles',
            },
        ),
        
        # Create CareProvider
        migrations.CreateModel(
            name='CareProvider',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('company_name', models.CharField(max_length=255)),
                ('trading_name', models.CharField(blank=True, max_length=255)),
                ('cqc_location_id', models.CharField(blank=True, max_length=50, null=True, unique=True)),
                ('business_type', models.CharField(choices=[('individual', 'Individual Caregiver'), ('agency', 'Care Agency'), ('nursing_home', 'Nursing Home'), ('residential_home', 'Residential Home'), ('charity', 'Charity/Non-profit'), ('nhs', 'NHS Trust')], max_length=50)),
                ('company_number', models.CharField(blank=True, max_length=50)),
                ('vat_number', models.CharField(blank=True, max_length=50)),
                ('care_types', models.JSONField(default=list)),
                ('specializations', models.JSONField(default=list)),
                ('address_line1', models.CharField(max_length=255)),
                ('address_line2', models.CharField(blank=True, max_length=255)),
                ('city', models.CharField(max_length=100)),
                ('postcode', models.CharField(max_length=10)),
                ('county', models.CharField(max_length=100)),
                ('country', models.CharField(default='United Kingdom', max_length=100)),
                ('latitude', models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ('longitude', models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ('phone', models.CharField(max_length=17)),
                ('email', models.EmailField(max_length=254)),
                ('website', models.URLField(blank=True)),
                ('max_capacity', models.IntegerField(default=1)),
                ('current_clients', models.IntegerField(default=0)),
                ('staff_count', models.IntegerField(default=1)),
                ('years_operating', models.IntegerField(default=0)),
                ('registered_date', models.DateField(auto_now_add=True)),
                ('is_accepting_clients', models.BooleanField(default=True)),
                ('emergency_care_available', models.BooleanField(default=False)),
                ('hourly_rate_min', models.DecimalField(blank=True, decimal_places=2, max_digits=8, null=True)),
                ('hourly_rate_max', models.DecimalField(blank=True, decimal_places=2, max_digits=8, null=True)),
                ('live_in_rate_min', models.DecimalField(blank=True, decimal_places=2, max_digits=8, null=True)),
                ('live_in_rate_max', models.DecimalField(blank=True, decimal_places=2, max_digits=8, null=True)),
                ('accepts_local_authority_funding', models.BooleanField(default=False)),
                ('accepts_nhs_funding', models.BooleanField(default=False)),
                ('accepts_private_pay', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='care_provider', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Care Provider',
                'verbose_name_plural': 'Care Providers',
                'ordering': ['company_name'],
            },
        ),
        
        # Create TrustVerification
        migrations.CreateModel(
            name='TrustVerification',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('cqc_rating', models.CharField(choices=[('Outstanding', 'Outstanding'), ('Good', 'Good'), ('Requires Improvement', 'Requires Improvement'), ('Inadequate', 'Inadequate'), ('Not Rated', 'Not Rated')], default='Not Rated', max_length=20)),
                ('cqc_last_inspection', models.DateField(blank=True, null=True)),
                ('cqc_report_url', models.URLField(blank=True)),
                ('dbs_verified', models.BooleanField(default=False)),
                ('dbs_certificate_number', models.CharField(blank=True, max_length=100)),
                ('dbs_issue_date', models.DateField(blank=True, null=True)),
                ('dbs_expiry_date', models.DateField(blank=True, null=True)),
                ('dbs_enhanced', models.BooleanField(default=False)),
                ('insurance_verified', models.BooleanField(default=False)),
                ('insurance_provider', models.CharField(blank=True, max_length=200)),
                ('insurance_policy_number', models.CharField(blank=True, max_length=100)),
                ('insurance_expiry_date', models.DateField(blank=True, null=True)),
                ('insurance_coverage_amount', models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ('training_certifications', models.JSONField(default=list)),
                ('last_training_refresh', models.DateField(blank=True, null=True)),
                ('gdpr_compliant', models.BooleanField(default=False)),
                ('health_safety_certified', models.BooleanField(default=False)),
                ('iso_certified', models.BooleanField(default=False)),
                ('average_rating', models.DecimalField(decimal_places=2, default=0, max_digits=3)),
                ('total_reviews', models.IntegerField(default=0)),
                ('recommendation_rate', models.DecimalField(decimal_places=2, default=0, max_digits=5)),
                ('staff_turnover_rate', models.DecimalField(decimal_places=2, default=0, max_digits=5)),
                ('staff_training_hours', models.DecimalField(decimal_places=2, default=0, max_digits=6)),
                ('overall_trust_score', models.IntegerField(default=0)),
                ('verification_status', models.CharField(choices=[('pending', 'Pending'), ('verified', 'Verified'), ('expired', 'Expired'), ('revoked', 'Revoked'), ('failed', 'Failed')], default='pending', max_length=20)),
                ('last_verified', models.DateTimeField(blank=True, null=True)),
                ('verification_notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('provider', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='trust_verifications', to='care_providers.careprovider')),
                ('verified_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='verified_providers', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Trust Verification',
                'verbose_name_plural': 'Trust Verifications',
            },
        ),
    ]