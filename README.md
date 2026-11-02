# VajraTronics — Immersive Engineering Website

A responsive multi-page React + TypeScript website for VajraTronics, an engineering and robotics team. The design pairs cinematic industrial imagery, technical microcopy, project dossiers and responsive motion with readable engineering documentation.

## Routes
- `/` — immersive home and selected projects
- `/projects` — searchable and filterable project directory
- `/projects/yantrachikitsa` — YantraChikitsa project dossier
- `/projects/firebots` — FireBots project dossier
- `/research` — research domains and publication index
- `/team` — team principles and working style
- `/journal` — workstreams and milestones
- `/contact` — Supabase-backed project enquiry form

## Stack
React 19, TypeScript, Vite, React Router, Framer Motion, Lucide, Supabase Postgres/RLS and Vercel.

## Run locally
Requirements: Node.js 20.19+ or 22.12+.
```bash
npm install
cp .env.example .env
npm run dev
```
The public site runs without Supabase credentials. Contact submissions require a configured backend and the UI does not pretend submissions succeeded when it is unavailable.

## Supabase setup
1. Create a Supabase project in the account intended for VajraTronics.
2. Run `supabase/migrations/001_initial_schema.sql` in the Supabase SQL Editor.
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` locally and in Vercel.
4. Never expose a service-role key in client code or any `VITE_` variable.

## Vercel deployment
Import this GitHub repository into the separate Vercel account you intend to use. Vercel should detect Vite. Build command: `npm run build`; output directory: `dist`. Configure the Supabase environment variables and deploy.


## SENTINEL edge protection

VajraTronics includes a framework-independent Vercel Routing Middleware connector in `middleware.js`. It runs before the static-site response is served and protects document/navigation requests while skipping the built asset directories and common static file extensions.

### Vercel environment variables

Configure these on the **VajraTronics Vercel project** under Settings → Environment Variables (Production and Preview as appropriate):

| Variable | Value |
|---|---|
| `SENTINEL_API_URL` | `https://project-sentinel-ivory.vercel.app` |
| `SENTINEL_PUBLIC_ORIGIN` | `https://project-sentinel-ivory.vercel.app` |
| `SENTINEL_SITE_ID` | `vajratronics` |
| `SENTINEL_INGEST_TOKEN` | The same secret configured as `SENTINEL_INGEST_TOKEN` on the SENTINEL backend |

The ingest token is server-side only. Never use a `VITE_` prefix, add it to client code, or commit its value.

### What the first integration detects

- Sensitive-path discovery: `/.env`, `/.git/config`, `/wp-config.php`, `/.htpasswd`, `/actuator/env`, `/etc/passwd`, and `/server-status`.
- High-confidence SQL injection signatures in the URL/query string.
- High-confidence script-injection signatures in the URL/query string.

The middleware creates a random first-party HttpOnly session reference and sends only the event category, site ID, and opaque session reference to SENTINEL. It does **not** send the raw URL, query string, request body, IP address, or browser fingerprint. The backend's deterministic policy requires three matching high-severity signals within five minutes before restricting a session; confirmed signals can be restricted immediately, but this initial detector does not mark URL signatures as confirmed.

When SENTINEL returns a restriction, the middleware redirects only that session to the signed challenge at the SENTINEL origin. Normal traffic continues. If SENTINEL is unconfigured, unreachable, or times out, the middleware fails open so an API outage does not take VajraTronics offline.

### Scope and limits

This first layer is a conservative URL/path probe detector, not a complete WAF. It cannot inspect POST bodies in a static Vite deployment, block volumetric DDoS traffic, or identify every vulnerability. Protect APIs and form handlers at their own server/edge boundary, and add a managed WAF such as Cloudflare for broader rules and DDoS protections. It deliberately does not treat Developer Tools, page source, normal navigation, or ordinary query words as attacks.

After adding the environment variables, redeploy VajraTronics. Test with a staging/preview deployment first; repeated probe URLs can trigger a short restriction for that browser session.

## Before production
- Replace stock imagery with real prototype, team and lab photography.
- Verify project descriptions and milestone statuses with the team.
- Add Supabase Auth and a protected content-management workflow before enabling project editing.
- Add rate limiting or challenge protection to the contact form if spam becomes an issue.
- Test all routes, form submission, mobile navigation and the production build before sharing publicly.

Project content currently contains editorial starter copy. Planned capabilities must be updated to match verified team progress.

### Current Vercel Routing Middleware configuration

This Vite project uses the framework-independent Vercel Routing Middleware entrypoint `proxy.js`, explicitly declared by `proxy.entrypoint` and `proxy.matcher` in the root `vercel.json`. The project installs `@vercel/functions` and uses its documented `next()` helper to continue normal requests. The legacy `middleware.js` file is not used.

When an event reaches the restriction threshold, SENTINEL's event endpoint now returns the signed `challenge_url` directly. The proxy can redirect immediately without making a second decision request.

After these source changes, wait for Vercel's new production deployment to become Ready. In the deployment summary, verify that `proxy.js` is listed as a Routing Middleware/Proxy entrypoint. With `SENTINEL_DEBUG=true`, response headers `X-SENTINEL-Middleware: active` and `X-SENTINEL-Check` provide temporary diagnostics; remove or disable this variable after testing.
