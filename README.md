# RankLens — SEO analytics SaaS

A modern, self-hostable SEO platform: track keyword rankings, monitor backlinks, run technical
SEO audits, pull in Google Search Console / GA4 / PageSpeed Insights data, and generate
client-ready PDF & CSV reports — all from a clean dashboard.

**Stack:** Next.js 16 (App Router, TypeScript) · React 19 · Tailwind CSS 4 · PostgreSQL · Prisma 6 · NextAuth v5 · Recharts · node-cron worker · Docker

## Features

- **Projects** — add websites, per-project team with role-based access (Owner / Admin / Member / Viewer)
- **Keyword rank tracking** — per country & device, position history, sparklines, trend charts, movement alerts
- **Backlink monitoring** — new/lost link detection with anchor text and domain rating
- **Technical SEO audits** — crawls the site for title/meta/H1/canonical/viewport/robots/sitemap/indexability issues, folds in PageSpeed Insights scores and Core Web Vitals, produces a 0–100 health score
- **Google integrations** — OAuth connect for Search Console (clicks/impressions) and GA4 (sessions/users); PageSpeed Insights via API key
- **Scheduled scans** — daily/weekly/monthly per project, executed by a separate cron worker
- **Notifications** — in-app + email (SMTP) alerts on ranking moves, backlink changes and critical audit issues
- **Reports** — one-click PDF summary and CSV keyword export, downloadable from the dashboard
- **REST API** — everything the UI does is available under `/api/v1/*` (session-authenticated)

## Quick start (local)

Requirements: Node.js ≥ 20.9, PostgreSQL running locally.

```bash
cp .env.example .env          # then edit DATABASE_URL + AUTH_SECRET
npm install                   # runs prisma generate via postinstall
npx prisma migrate deploy     # create tables
npm run db:seed               # optional: demo@ranklens.local / password123
npm run dev                   # web app on http://localhost:3000
npm run worker                # (separate terminal) scheduled-scan worker
```

## Quick start (Docker)

```bash
cp .env.example .env          # set AUTH_SECRET at minimum
docker compose up --build
```

This starts PostgreSQL, applies migrations, then runs the web app on
[http://localhost:3000](http://localhost:3000) plus the scan worker. Report files persist in the
`reports` volume.

## Deploying to Netlify

The repo ships Netlify-ready ([netlify.toml](netlify.toml) + `@netlify/plugin-nextjs` is
auto-detected). Because Netlify is serverless, reports are stored in Postgres (not on disk) and
scheduled scans run via a [Netlify scheduled function](netlify/functions/scheduled-scans.mts)
(every 6 hours) instead of the long-running worker.

1. **Database** — create a hosted PostgreSQL instance (e.g. [Neon](https://neon.tech) or
   [Supabase](https://supabase.com); both have free tiers). Copy the connection string.
2. **Import the repo** in Netlify (Add new site → Import from GitHub → `seosaas`). The build
   command from `netlify.toml` runs `prisma migrate deploy` before `next build`, so tables are
   created automatically on first deploy.
3. **Environment variables** (Site settings → Environment variables):
   - `DATABASE_URL` — the hosted Postgres connection string (Neon: the **pooled** one)
   - `DIRECT_URL` — the direct (non-pooled) connection string, used by `prisma migrate`
     (Neon: same URL without `-pooler` in the hostname)
   - `AUTH_SECRET` — `openssl rand -base64 32`
   - `AUTH_TRUST_HOST` — `true`
   - `NEXT_PUBLIC_APP_URL` — your site URL, e.g. `https://seosaas.netlify.app`
   - `CRON_SECRET` — any long random string (authorizes the scheduled-scan function)
   - Optional: `SERP_PROVIDER`/`SERPAPI_KEY`, `PAGESPEED_API_KEY`, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, `SMTP_*`
4. **Google OAuth** (if used) — add `https://<your-site>/api/v1/google/callback` as an authorized
   redirect URI in Google Cloud Console.

Note: Netlify function execution time is capped (~10–26 s on free plans). Full scans of projects
with many keywords + PageSpeed checks can exceed that — for heavy use, run `npm run worker` on any
small always-on host (or use Docker) against the same database; the app works identically.

## Configuration

All configuration is via environment variables — see [.env.example](.env.example).

| Integration | Setup |
| --- | --- |
| **SERP ranking data** | Works out of the box with `SERP_PROVIDER=mock` (deterministic demo data). For real rankings set `SERP_PROVIDER=serpapi` and `SERPAPI_KEY` (serpapi.com). Other providers plug into `src/lib/integrations/serp.ts`. |
| **Search Console + GA4** | Create OAuth credentials in Google Cloud Console with redirect URI `<APP_URL>/api/v1/google/callback`, set `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`. Users click **Connect Google** in project settings, then enter their GSC property (`sc-domain:example.com`) and GA4 property ID. |
| **PageSpeed Insights** | Works keyless at very low volume; set `PAGESPEED_API_KEY` for reliable quota. |
| **Backlinks** | Ships with a demo provider. Wire a commercial API (DataForSEO, Ahrefs, Majestic) into `src/lib/integrations/backlinks.ts`. |
| **Email** | Set `SMTP_HOST/PORT/USER/PASS/FROM`. Unconfigured, emails are logged and skipped. |

## Architecture

```
src/
  app/                  # App Router pages + REST API route handlers
    api/v1/…            # REST API (projects, keywords, backlinks, audits, reports, members, google)
    dashboard/…         # authenticated UI (overview, project tabs, notifications)
  components/           # charts (Recharts), tables, forms
  lib/
    auth.ts             # NextAuth v5 (credentials + JWT); auth.config.ts is edge-safe for proxy.ts
    rbac.ts             # requireUser / requireProjectRole (role hierarchy)
    scans.ts            # ranking / backlink / audit scan orchestration + notifications
    audit/technical.ts  # on-page + infrastructure checks, PSI integration
    integrations/       # searchConsole, analytics (GA4), pagespeed, serp, backlinks, googleAuth
    reports.ts          # PDF (pdf-lib) + CSV generation
worker/index.ts         # node-cron worker running due scheduled scans
prisma/                 # schema + migrations + seed
```

**Security notes:** passwords hashed with bcrypt (cost 12); JWT sessions; every API route
revalidates project membership and role server-side; report downloads are membership-checked;
Zod validates all input; Google tokens are stored server-side only and refreshed on demand.

## Roles

| Role | Permissions |
| --- | --- |
| Viewer | read-only access to all project data |
| Member | + add/remove keywords, run scans, generate reports |
| Admin | + edit project settings & integrations, manage members |
| Owner | + delete the project |
