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

The root layout includes a 2.1-second Tellme brand intro: rounded Fredoka bubble lettering stamps in on navy, then a curved, elastic SVG edge lifts while the page fades and rises using the same progress curve. The 4.2 KB font subset is self-hosted under public/brand/fonts with its SIL OFL license. It runs once per document load, not during internal navigation. “Vào Tellme” and Escape skip it; reduced-motion preferences bypass it. CSS reveals the page even without JavaScript. Keep `src/components/BrandIntro.tsx` and `src/app/brand-intro.css` in sync with the corresponding web-app files; the copies keep this static site independent of the monorepo runtime.

See [`docs/ASSETS.md`](docs/ASSETS.md) for the Tellme-owned brand/reaction assets and the generated editorial photography sources. The technology and interaction contract is recorded in [`docs/DIRECTION.md`](docs/DIRECTION.md).
