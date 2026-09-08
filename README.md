# Milford Carvana Cars

Astro frontend + Cloudflare Workers backend migration of [milford-carvanacars.com](https://milford-carvanacars.com) (from WordPress / Vehica theme).

## Structure

- `/` — **Astro** frontend (static, deployed to Cloudflare Pages via git integration)
- `/workers/` — **Cloudflare Workers** backend (Hono + D1)
- `/data/` — extracted + seed data (`seed-cars.json`, `pages.json`)

## Backend

- Worker URL: `https://milford-carvanacars-api.cloudbrightio4.workers.dev`
- D1 database: `milford-carvanacars`
- Endpoints: `/api/health`, `/api/cars`, `/api/facets`, `/api/compare`, `/api/contact`, `/api/subscribe`, `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`

## Deploy

- **Frontend**: push to `main` → Cloudflare Pages auto-builds (`npm run build` → `dist`)
- **Backend**: `cd workers && npx wrangler deploy`

## Dev

```sh
npm install          # frontend deps
npm run dev          # Astro dev server
cd workers && npm install && npm run dev   # Workers dev
```
