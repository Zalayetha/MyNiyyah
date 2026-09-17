# MyNiyyah Production Runbook

## Release Gate

Run these before deploying:

```sh
pnpm install --frozen-lockfile
pnpm contract:emit
pnpm db:update
pnpm db:seed
pnpm db:verify
pnpm release:verify
pnpm build
```

After deployment:

```sh
curl --fail --silent --show-error https://myniyyah.my.id/api/health
curl --fail --silent --show-error https://myniyyah.my.id/api/ready
pnpm release:headers -- https://myniyyah.my.id
```

`/api/health` only proves the Node process answers. `/api/ready` must fail if
PostgreSQL is unavailable.

## Proxy Headers

The app emits baseline security headers. Keep HSTS at the HTTPS proxy too:

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
proxy_set_header Host $host;
proxy_set_header X-Forwarded-Proto https;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

Do not add permissive CSP rules for third-party scripts unless the feature is
implemented and reviewed.

## PM2 Reload

```sh
set -a
. /etc/myniyyah.env
set +a
pm2 reload ecosystem.config.cjs --only myniyyah --update-env
pm2 save
```

This is a graceful reload, not a zero-downtime guarantee. Treat it as verified
only after `/api/ready` succeeds.

## Backup And Restore

Recommended schedule: daily `pg_dump` retained for 14 days, plus one manual
backup before schema changes.

Backup:

```sh
pg_dump "$DATABASE_URL" --format=custom --file="/var/backups/myniyyah/myniyyah-$(date +%F).dump"
```

Restore rehearsal into a disposable database:

```sh
createdb myniyyah_restore_test
pg_restore --clean --if-exists --dbname="postgresql://USER:PASSWORD@HOST:5432/myniyyah_restore_test" /var/backups/myniyyah/LATEST.dump
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/myniyyah_restore_test" pnpm db:verify
```

Sample user-owned and reference table counts before and after restore. Never
restore over production until the disposable restore has passed.

## Rollback Boundaries

Application rollback:

```sh
git checkout --detach <previous-good-sha>
pnpm install --frozen-lockfile
pnpm contract:emit
pnpm build
pm2 reload ecosystem.config.cjs --only myniyyah --update-env
```

Database rollback is restore-from-backup only. Do not drop or reset production
data. If a schema change has already run, rehearse restore in a disposable
database before touching production.
