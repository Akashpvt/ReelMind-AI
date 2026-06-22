# ReelMind AI Production Backup Strategy

## Recovery objectives

- Database RPO: 24 hours minimum; target 15 minutes with point-in-time recovery.
- Database RTO: 4 hours.
- Object storage RPO: 24 hours.
- Configuration and secrets RTO: 2 hours.

## Database

1. Enable managed daily Supabase backups and point-in-time recovery for production.
2. Run a nightly encrypted `pg_dump` to an access-controlled off-site bucket with 30 daily, 12 monthly, and 3 annual restore points.
3. Record backup job completion in the external infrastructure monitor; never store database credentials in the repository.
4. Test a restore into an isolated Supabase project every month and record row counts, migration level, RLS state, and application smoke-test results.

## Object storage

1. Inventory `project-files` and `workspace-branding` objects nightly.
2. Replicate production buckets to a second region or provider with object versioning and server-side encryption.
3. Keep deletion protection and a 30-day recovery window where the storage provider supports it.

## Secrets and application configuration

1. Keep environment variables in the deployment platform and an encrypted break-glass vault.
2. Back up DNS, OAuth application configuration, webhook URLs, cron schedules, and provider account identifiers; never export raw access tokens into ordinary documents.
3. Rotate service-role, cron, webhook, and encryption secrets after any suspected exposure.

## Incident restore sequence

1. Declare the incident and freeze writes where integrity is uncertain.
2. Select the newest verified restore point before the incident.
3. Restore database and storage into isolation, apply pending migrations, and run tenant-isolation verification.
4. Validate authentication, billing, projects, client portal, queues, and cron jobs.
5. Redirect production traffic, monitor error and queue metrics, and document actual RPO/RTO.
