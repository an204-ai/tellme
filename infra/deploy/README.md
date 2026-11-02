# Deploy Tellme with Coolify

This production stack runs the main app, landing page, admin, API, three workers and Redis in one Coolify Docker Compose resource. MongoDB remains the existing MongoDB Atlas cluster: the API and workers receive its current `MONGODB_URI`, and this stack neither creates a MongoDB container nor changes or migrates database records. Public traffic enters three Nginx edge services; API and Redis have no published host ports. The app continues using MongoDB transactions against Atlas.

## Before you start

- A VPS with Docker managed by Coolify. For this all-in-one stack, plan for at least 4 vCPU, 8 GB RAM and 80 GB SSD; more is useful for image processing and database growth. Confirm the actual plan before production if it is smaller.
- A Git repository containing these deployment files, pushed to the branch you will select in Coolify.
- DNS control for `tellme.my` and its subdomains.
- Cloudinary and Giphy credentials, plus a working SMTP sender. SMTP and `AUTH_CODE_SECRET` are required because account creation requires an emailed verification code.
- The public outbound IP address used by this VPS to reach Atlas.
- An existing MongoDB Atlas database user and the current working Atlas connection URI. Preserve the existing database name (`tellme`) and permissions.
- A backup/restore policy configured for the existing Atlas cluster. This deployment does not alter Atlas backup settings.

## Configure DNS and firewall

Create DNS `A` records for `tellme.my`, `about.tellme.my` and `admin.tellme.my`, all pointing at the VPS public IPv4 address. Add `AAAA` records only if IPv6 routing and the Coolify proxy are configured on that VPS. Do not create public records for Redis or the API. Atlas remains a separate managed service.

Allow inbound TCP 80 and 443 for Coolify's proxy and certificate issuance, and SSH only from addresses you administer. If you open the Coolify dashboard directly by server IP, allow TCP 8000, 6001 and 6002 only from your own IP; if you already routed the Coolify dashboard through a dedicated domain, keep those direct dashboard ports closed. Do not open ports 27017, 6379, 3000, 4000 or 3001 on the VPS firewall. If the VPS provider restricts outbound traffic, permit DNS and outbound TCP 27017 to MongoDB Atlas.

## Connect the existing MongoDB Atlas cluster

1. In the VPS provider dashboard, find the server's **public outbound IPv4**. If the provider routes outbound traffic through a NAT gateway, use the NAT's egress IP rather than a private interface address.
2. In MongoDB Atlas, open the project that contains the current cluster, then go to **Security → Network Access → IP Access List → Add IP Address**. Add the VPS egress IP as a single `/32` entry with a note such as `Tellme production VPS`, then wait until Atlas marks the entry active. Atlas only accepts client connections from addresses on this project list; keep it restricted and do not use `0.0.0.0/0`. [Atlas IP access list guide](https://www.mongodb.com/docs/atlas/security/ip-access-list/)
3. Put the current `MONGODB_URI` from the production configuration into Coolify as a secret. Preserve its existing Atlas hostname, credentials, TLS/SRV options and query parameters; do not generate a new URI or replace the database. Set `MONGODB_DB=tellme` as in the example. The URI example is only a placeholder.
4. The database user in that URI must retain permission to read/write the Tellme database and create indexes. The application creates/updates indexes during startup.

Tellme uses multi-document transactions. MongoDB supports them on replica sets and sharded clusters; Atlas remains the transaction-capable database, and the VPS Compose file does not reconfigure its topology. [MongoDB transaction deployment requirements](https://www.mongodb.com/docs/manual/core/transactions-production-consideration/)

## Add the Git Compose resource in Coolify

1. Push this branch to the Git host and make sure the VPS can clone the repository.
2. In Coolify, create a Project and Production Environment, then add a **Docker Compose** resource from the Git repository. Keep the normal Coolify Compose deployment mode; do not select Raw Compose.
3. Set **Base Directory** to `/` (repository root) and **Docker Compose Location** to `infra/deploy/compose.yaml`. The `../..` build contexts in Compose resolve from this file back to the repository root. Coolify should show `web-edge`, `landing`, `admin-edge`, `api`, `redis`, the three workers and `web-app`; there are no MongoDB containers or MongoDB volumes in this resource.
4. Add the variables listed in `coolify-env.example` in the resource's Environment Variables screen. Mark secret values as secret/locked. Keep secrets runtime-only unless a value is explicitly used as a build argument. Never add credentials to the Compose file, Dockerfile, Git repository or build arguments.
5. Generate separate random secrets locally. For `REDIS_PASSWORD` and `AUTH_CODE_SECRET`, use `openssl rand -hex 32`. Copy each result directly into its matching Coolify secret field.
6. Keep the current `MONGODB_URI` secret unchanged, set `MONGODB_DB=tellme`, then set `CLOUDINARY_URL`, `GIPHY_API_KEY`, `SMTP_URL` and `EMAIL_FROM` to working production values. URL-encode special characters in URI credentials (especially `@`, `:`, `/`, `%` and `$`). Use the sender address approved by your mail provider. Fill both VAPID keys if you want web push. Do not enable the Epidemic Sound prototype key as a production music provider; the app intentionally disables that provider in production.
7. Keep the domain/origin values exactly as in the example unless you change the public domain names. Ensure `ADMIN_EMAILS` includes `tellme@admin.com`.

Coolify parses the Compose variables and validates required values. `${NAME:?…}` entries block deployment while required values are missing.

## Attach the three domains

After loading the Compose resource, open **Domains** and add one route for each public service:

| Domain | Coolify service | Internal port |
| --- | --- | ---: |
| `https://tellme.my` | `web-edge` | 80 |
| `https://about.tellme.my` | `landing` | 80 |
| `https://admin.tellme.my` | `admin-edge` | 80 |

Use `https://` in each Coolify domain entry so its proxy requests TLS certificates. Do not add a public domain for `api`, `redis`, or the worker services. The edge containers route `/api/*` and `/api/realtime` internally, keeping browser API and WebSocket requests on the corresponding site's origin and session cookie. Atlas is accessed outbound over TLS from the private Compose network; it is not proxied through the VPS.

## First deployment and account setup

1. Deploy the resource and follow Coolify Deployment Logs. Wait for `redis`, `api`, `web-app` and the three public edge/static services to become healthy. The API health check includes a database ping, so an Atlas IP allowlist, DNS, URI or credential problem keeps it unhealthy.
2. If any service fails, inspect that service's Runtime Logs first. Common first-deploy problems are a missing Atlas Network Access entry, wrong Atlas URI/database user, outbound DNS/TCP restrictions, an invalid Cloudinary URL, an SMTP connection/sender rejection, an incorrect DNS record, or a VPS without enough RAM/disk.
3. Verify `https://tellme.my`, `https://about.tellme.my` and `https://admin.tellme.my`. The admin login is a separate Tellme session on the admin subdomain.
4. Register `tellme@admin.com` through the main app's normal registration flow and verify it from the mailbox. The address is allowlisted by the `ADMIN_EMAILS` value; no default password is created.
5. Sign in at `https://admin.tellme.my`. Check **Hạ tầng**: MongoDB, Redis and worker heartbeats should be healthy. Unconfigured optional integrations should remain clearly marked as unavailable.

The database is the existing Atlas database, so current users, posts and sessions stay there. No data migration or database reset is part of deployment. Admin access requires the allowlisted account's email to be verified.

## Backups and updates

- Keep Atlas backups and restore procedures enabled according to the existing cluster's plan. Test restore into an isolated Atlas test database before relying on a backup; this VPS Compose stack does not take or change Atlas backups.
- Redis AOF uses the named `redis_data` volume. It has no public port. Review Coolify's generated volume name before any destructive resource action; removing it clears queued/cache data but does not affect Atlas records.
- Deploy code changes from Git through Coolify. Pin image versions and review release changes before upgrading Redis or application dependencies. Verify every domain, login, upload, Tell me now, chat/realtime and worker queue after deploying.
- Coolify's admin interface and SSH are separate from `admin.tellme.my`; do not assign the same domain to both.

## Local syntax/build checks

```sh
docker compose --env-file infra/deploy/coolify-env.example -f infra/deploy/compose.yaml config --quiet
pnpm --filter @tellme/api check-types
pnpm --filter @tellme/web build
pnpm --filter @tellme/admin build
pnpm --dir tellme-landing build
```

`coolify-env.example` contains placeholders only; never copy production secrets into Git. The real production variables belong in Coolify.

## Official Coolify references

- [Docker Compose from Git](https://coolify.io/docs/applications/builds/docker-compose)
- [Domains and internal service ports](https://coolify.io/docs/core/networking/domains)
- [Environment variables and secrets](https://coolify.io/docs/applications/configuration/environment-variables)
- [Health checks](https://coolify.io/docs/applications/configuration/health-checks)
- [Coolify server firewall ports](https://coolify.io/docs/core/infrastructure/servers/firewall)
- [MongoDB Atlas Network Access IP list](https://www.mongodb.com/docs/atlas/security/ip-access-list/)
- [MongoDB transaction requirements](https://www.mongodb.com/docs/manual/core/transactions-production-consideration/)
