# STCLRC Faculty Feedback & Tracking Portal

Confidential trainee feedback and faculty analytics portal built with React, TypeScript, Tailwind CSS, and Express.

## Features

- **Role-Based Sign In**: Separate Trainee (`STCLRC0001`–`STCLRC0920`) and Admin logins with post-login password change (`scrypt`-hashed persistence).
- **27 Official Instructors Across 12 Papers**: Full roster (`T1`–`T27`) covering `Paper-1` (BNSS) through `Paper-12` (Ethics and Accountability), including mobile numbers and configurable features.
- **Trilingual Support (`English` · `বাংলা` · `हिन्दी`)**: Evaluation questions display simultaneously in English, Bengali, and Hindi, with a full page language switcher for Trainees.
- **Kolkata Standard Time (IST) Window**: Fixed Start/End date & time scheduling, live IST countdown timer, auto-save drafts, and session completion notifications.
- **Confidential Admin Console**: Performance charts, paper-wise comparison, searchable 920-trainee tracker, Instructor & Question Settings, full `.xlsx` Excel exports (individual reports + 5-sheet complete workbook), and confirmed trainee data reset.

## Local Development

```bash
npm install
npm run dev
```

The server runs on `http://localhost:3000`.

## Production Build & Start

```bash
npm run build
npm start
```

## Deploy on Render.com (Blueprint)

This repository includes a `render.yaml` Blueprint configured for Node 22 (`NODE_VERSION=22.18.0`), Kolkata Standard Time (`TZ=Asia/Kolkata`), automatic `SESSION_SECRET` generation, and `/api/health` health checks.

1. Push this repository to GitHub.
2. In the [Render Dashboard](https://dashboard.render.com/), click **New → Blueprint** and connect your GitHub repository.
3. Review the `stclrc-feedback-tracker` web service defined in `render.yaml` and click **Apply**.
4. **Persistent Storage (Recommended for Production)**: Render's `free` plan uses an ephemeral filesystem, which resets `data/portal-db.json` (including changed passwords and submitted feedback) whenever the free service spins down or redeploys. To keep changed Admin/Trainee passwords and feedback data permanently across restarts and deploys, switch `plan: free` to `plan: starter` and uncomment `DATA_DIR: /var/data` and the `disk:` block in `render.yaml`.

## Scripts

- `npm run dev` — Run Express + Vite middleware dev server (`tsx server.ts`)
- `npm run build` — Build frontend bundle to `dist/`
- `npm start` — Run production Express server (`node server.ts`)
- `npm run lint` — TypeScript type check (`tsc --noEmit`)
