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

## Before production
- Replace stock imagery with real prototype, team and lab photography.
- Verify project descriptions and milestone statuses with the team.
- Add Supabase Auth and a protected content-management workflow before enabling project editing.
- Add rate limiting or challenge protection to the contact form if spam becomes an issue.
- Test all routes, form submission, mobile navigation and the production build before sharing publicly.

Project content currently contains editorial starter copy. Planned capabilities must be updated to match verified team progress.