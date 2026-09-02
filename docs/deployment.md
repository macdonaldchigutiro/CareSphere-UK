# CareSphere production deployment

This checklist covers the repository's Docker-based production deployment. It does not copy development secrets or data into production.

## Before deployment

1. Install Docker Engine with Docker Compose.
2. Point the domain's DNS records at the deployment server.
3. Put the TLS certificate and key expected by the Nginx configuration in `docker/ssl/`.
4. Copy `docker/.env.example` to `docker/.env` and replace every placeholder.
5. Back up the production database before applying new migrations.

`SECRET_KEY`, database credentials, email credentials and API keys must never be committed to Git. `ALLOWED_HOSTS` contains host names; CORS and CSRF entries contain full HTTPS origins.

## Validate the release

Run these commands from the repository root before deployment:

```bash
cd caresphere_backend
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py test apps.care_providers.test_cqc_directory apps.care_providers.test_postcode_geo

cd ../caresphere_frontend
npm ci
npm run lint
npm run typecheck
npm run build
```

GitHub Actions runs the same checks on every pull request and push to `main`.

## Deploy

From the repository root:

```bash
docker compose --env-file docker/.env -f docker/docker-compose.production.yml up --build -d
```

The backend applies migrations as it starts. Verify the deployment immediately:

```bash
curl --fail https://caresphere.example.com/api/health/
docker compose --env-file docker/.env -f docker/docker-compose.production.yml ps
docker compose --env-file docker/.env -f docker/docker-compose.production.yml logs --tail=100 backend frontend nginx
```

The health response must be `{"status":"ok"}`. Then verify a dementia search with a real postcode, confirm results are ordered correctly, and open one CQC profile link.

## CQC data updates

CQC directory, ratings and coordinate imports are database operations, not Git operations. Follow `docs/cqc-directory-import.md` after taking a database backup. Always run each import with `--dry-run` first.

## Rollback

Keep the previous deployed Git commit and a pre-deployment database backup. If the release fails, redeploy the previous commit. Restore the database only when a migration or data import changed it and the rollback requires the earlier schema or data.
