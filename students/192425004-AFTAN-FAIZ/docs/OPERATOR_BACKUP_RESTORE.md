# NYAVERIS AI — private backup and restore prerequisites

Status: BLOCKED. The owner confirmed that no private database connection or disposable restore environment is configured. PostgreSQL client tools, Docker and a private connection were not available during this audit. No hosted migration is authorized to run while that remains true. An SQL export, a baseline manifest or a synthetic migration rehearsal is not a verified restorable backup.

Existing project only: `vkkjuopfidvfhzsqzius`. Do not create another Supabase project, reset any password, replay migrations, run seed/provision helpers, or enable SaaS to bypass this prerequisite.

## Private operator setup

1. Install official PostgreSQL client tools matching the source server's major version. Prepare a completely disposable **local** PostgreSQL environment with compatible Supabase extensions/roles; it must be separate from every production database. Docker or an equivalent existing local environment is acceptable. No cloud project is required. Compare `pg_dump --version`, `pg_restore --version` and source `server_version` before proceeding.
2. In the existing Supabase Dashboard choose **Connect** and obtain the direct database parameters. Use its Session pooler parameters if the network lacks IPv6; do not use transaction pooling for this export. Use the **existing** database password privately. If it is unknown, stop; do not reset it as an incidental task.
3. Create a private directory outside Git and OneDrive, for example `%LOCALAPPDATA%/NYAVERIS AI Private`. Restrict access to your Windows account and administrators, use encrypted local storage, and retain an encrypted off-device copy. Dumps include Auth identities/password hashes and anonymous credential hashes. They must never be uploaded to GitHub, chat, screenshots or public artifact services.
4. Configure two libpq service entries in a private `pg_service.conf`, and passwords in a private password file. Set `PGSERVICEFILE` and `PGPASSFILE` to those files in your own shell; never paste their contents here or pass passwords/URLs as command arguments. Download and verify the project's CA certificate using Supabase's SSL documentation and configure `sslmode=verify-full` plus `sslrootcert` for the source.

The service entries contain the following nonsecret structure; fill the source parameters privately from **Connect**:

```ini
[nyaveris_source]
host=<existing-project direct or Session-pooler host>
port=5432
dbname=postgres
user=<existing-project database user>
sslmode=verify-full
sslrootcert=<private path to the trusted database CA file>
options=-c default_transaction_read_only=on

[nyaveris_restore]
host=127.0.0.1
port=5488
dbname=nyaveris_restore_20261101
user=<local disposable restore administrator>
sslmode=disable
```

The second service MUST resolve to loopback and an empty disposable database, never the Supabase hostname or production port. TLS is disabled only for that loopback-only isolated test service. Do not reuse a database containing other work.

## Export and capture evidence

Run from the application directory after privately configuring both services and a private `$backupFolder` path outside every repository. Pause application mutation tests during the baseline/export interval; if source data changes, repeat the baseline/export instead of weakening comparison.

```powershell
psql -X -q -A -t --set ON_ERROR_STOP=1 --dbname 'service=nyaveris_source' --file scripts/backup-baseline.sql > "$backupFolder/source-before.json"
pg_dump --dbname 'service=nyaveris_source' --format=custom --file "$backupFolder/database.dump"
pg_dumpall --dbname 'service=nyaveris_source' --database postgres --roles-only --no-role-passwords --file "$backupFolder/roles.sql"
psql -X -q -A -t --set ON_ERROR_STOP=1 --dbname 'service=nyaveris_source' --file scripts/backup-baseline.sql > "$backupFolder/source-after.json"
Get-FileHash -Algorithm SHA256 -LiteralPath "$backupFolder/database.dump"
pg_restore --list "$backupFolder/database.dump" > "$backupFolder/archive-contents.txt"
```

Check every command's exit code immediately. Stop on any failure. Do not omit a failed schema or silently accept a partial archive. Verify that archive contents include `public`, `private`, `auth` users/identities and application audit/credential tables, plus migration history and required Storage metadata. The read-only manifest records counts, aggregate record digests, function-definition fingerprints, RLS, policies, grants and extensions; it was syntax/permission-checked against the existing hosted schema without exporting rows.

## Actually restore and validate

1. Provision the empty disposable local database with the matching extension capabilities. Review `roles.sql` and create **only missing required roles** locally; resolve conflicts with pre-existing local built-ins deliberately. Do not replay any role/password changes against Supabase. Keep existing source ownership/grants in the archive and establish the roles needed to restore them.
2. Confirm the restore service resolves to `127.0.0.1`/`::1`, port `5488`, database `nyaveris_restore_20261101`. Do not continue if any target detail differs or if the database contains other work.
3. Run `pg_restore --exit-on-error --single-transaction --dbname 'service=nyaveris_restore' "$backupFolder/database.dump"`. No production restore, `--clean`, reset, seed or hosted schema apply is part of this procedure. Resolve any incompatibility and repeat only in a fresh disposable local environment; do not suppress restore failures.
4. Run the same `psql` manifest command against `service=nyaveris_restore`, saving `restored.json` privately. Compare source-before/source-after required counts and record digests; compare the restored data, required function fingerprints, RLS, policies, grants and compatible extensions. Rate-limit buckets are volatile operational state and are excluded from baseline data comparison, but remain in a full dump. Independently verify Auth users/identities and private credential tables are present, and exercise preserved worker/admin RPC authorization in the disposable environment. Merely counting archive files is insufficient.
5. Record command versions, file checksum, required schema/table coverage, successful restore exit status, baseline comparisons, tested role/tenant denials, recovery instructions and storage location. Protect the archive and evidence. Migration remains BLOCKED until all required checks actually pass.

## Limits that must be recorded

Database dumps do not contain Storage object bytes or Google/SMTP/Vercel/provider configuration. Inventory these separately and privately back up any required Storage objects. Custom login-role passwords are intentionally excluded from `roles.sql`; manage their recovery privately. Supabase Vault/column encryption can require separately retained encryption keys. A plain PostgreSQL restore does not by itself recreate the hosted Auth service, OAuth consent, JWT configuration or delivery infrastructure. Document which services were exercised and which recovery capabilities remain unverified. Do not declare a backup complete if these omissions affect required recovery.

Only after a genuine successful restore and preservation/compatibility review may the earlier conditional approval for **only** `20261031042154_workforce_saas.sql` be reconsidered. Its required SHA256 is `5afff4672ce350fee26a7c88c27221da48ab92ddd6f3428d940510b70e5b846d`. The optional performance SQL remains outside that approval. No blanket migration push is safe because hosted/local foundation timestamps differ.

References: [Supabase backup guidance](https://supabase.com/docs/guides/platform/backups), [supported logical export/recovery and managed-schema caveats](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore), [PostgreSQL connection service files](https://www.postgresql.org/docs/current/libpq-pgservice.html), [pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html).
