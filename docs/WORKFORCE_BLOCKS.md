# Workforce blocks — first release

Provider → Blocks & rotas (`/provider-rota`) creates and edits drafts, assigns active staff, and publishes/unpublishes schedules. Blocks include area/county, care/training/supervision/HR/time-off type, start/end, and optional hourly/fixed-block/incentive amount. Fixed and incentive amounts are per block; these are planning settings, not payroll calculations.

Owners and linked active manager/admin/coordinator staff can manage their provider's blocks. Workers cannot change blocks. Staff linked to an existing User can read only their assigned published blocks at `/worker-rota`. This release does not create worker accounts or link them automatically. Management notes, rates and other staff names are not returned by the worker rota endpoint.

Published blocks cannot be edited until unpublished. Publishing rejects overlapping assignments, including time off, inactive staff, foreign-provider staff, ended blocks and empty assignments. Publication operations lock the provider record in a database transaction. Adjacent blocks are permitted. Drafts may overlap while planning. Unpublishing removes the block from worker schedules.

The planner loads a seven-day period. Date filtering uses blocks overlapping the period and allows at most 31 days per request. Times use the browser's local timezone on entry; API times include timezone offsets and Django uses Europe/London. Provider rates are nonnegative.

This model does not replace booking assignment. Multiple staff assigned to a block do not constitute a double-carer visit. Individual visit scheduling, singles/doubles, login windows, GPS checks, leave approval, change requests, hours worked and payroll remain subsequent slices. Area labels do not enforce county/client access yet. Time-off blocks are management planning entries, not annual-leave requests.

Database migrations are 0006 (ShiftBlock) and 0007 (coordinator role). Render's existing start command runs `python manage.py migrate --noinput` before Gunicorn. Deploy the backend as well as the frontend before using the page. No existing booking or staff record is altered by the new block table.

Verification: `python manage.py test apps.care_providers.test_workforce apps.bookings apps.users`, migration drift check, targeted frontend lint, frontend production build. Tests run with isolated SQLite, not the staging database. PostgreSQL concurrency was not exercised by these tests.

Staging acceptance: create a tomorrow-morning care block, assign existing staff, save draft, publish, and verify its published state. Attempt an overlapping second block to confirm rejection. Unpublish before editing. Inspect worker view only with an explicitly linked test staff account.
