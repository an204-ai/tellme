# Tellme landing

A standalone, static marketing site for Tellme. It lives in its own pnpm project and does not depend on the Tellme API, workers, Redis, MongoDB, or the existing web app. The interactive scene and FAQ are client-side; all pages export to static HTML.

## Run locally

From this directory:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://127.0.0.1:3002`. To preview the production static export:

```sh
pnpm build
pnpm start
```

## Deploy to Render

Create a **Static Site** with this directory as the Root Directory (`tellme-landing` when using the monorepo repository).

- Build command: `pnpm install --frozen-lockfile && pnpm build`
- Publish directory: `out`
- Environment variables: optional `NEXT_PUBLIC_SITE_URL` (set this to the landing's custom domain if configured; the Render URL is used by default)
- Start command: none (Render serves the exported static files)

The `render.yaml` in this directory contains the same static-site configuration. Set a custom domain in Render when ready. Links to the existing app currently point to `https://tellme.my`.

## Pages

- `/` — brand introduction and interactive day-in-the-life phone scene
- `/ve-tellme/` — about and brand principles
- `/tell-me-now/` — the daily photo-story feature and privacy explanation
- `/ung-dung/` — mobile app coming soon

## Assets and implementation notes

See [`docs/ASSETS.md`](docs/ASSETS.md) for the Tellme-owned brand/reaction assets and the generated editorial photography sources. The technology and interaction contract is recorded in [`docs/DIRECTION.md`](docs/DIRECTION.md).
