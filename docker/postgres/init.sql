-- CareSphere UK Database Initialization Script

-- Create additional users and permissions
CREATE USER caresphere_readonly WITH PASSWORD 'readonly_password';
GRANT CONNECT ON DATABASE caresphere TO caresphere_readonly;
GRANT USAGE ON SCHEMA public TO caresphere_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO caresphere_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO caresphere_readonly;

-- Create tablespace for better performance
CREATE TABLESPACE caresphere_data LOCATION '/var/lib/postgresql/data/tablespace';

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Create custom types if needed
CREATE TYPE care_type AS ENUM (
    'domiciliary',
    'live_in',
    'residential',
    'nursing',
    'respite',
    'day_care'
);

-- Create initial data
INSERT INTO auth_permission (name, codename) VALUES
    ('Can view care provider', 'view_careprovider'),
    ('Can add care provider', 'add_careprovider'),
    ('Can change care provider', 'change_careprovider'),
    ('Can delete care provider', 'delete_careprovider')
ON CONFLICT DO NOTHING;

-- Create admin user if not exists (password: admin123)
INSERT INTO users_user (id, email, first_name, last_name, password, is_staff, is_superuser, is_active, date_joined)
SELECT 
    '11111111-1111-1111-1111-111111111111',
    'admin@caresphere.uk',
    'Admin',
    'User',
    'pbkdf2_sha256$600000$abc123$hashedpasswordhere',
    true,
    true,
    true,
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM users_user WHERE email = 'admin@caresphere.uk'
);