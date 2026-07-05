# Scrub Playbook

A living survival guide for surgical techs — surgeon preference cards, tech-to-tech notes, and a vendor IFU library, built for the OR: offline-first, sterile-hands friendly, and fast to onboard a traveler or new hire.

## Running locally

```bash
npm install
npm run dev
```

Everything works fully offline with zero setup — data lives in your browser's local storage, and the app installs as a PWA (service worker + app-shell caching) so it keeps working in cellular dead zones.

## Optional: Team Sync

By default this app is single-device, local-only. If you want a team of techs to see each other's cards live instead of exporting/importing one at a time, you can turn on **Team Sync**:

1. Create a free project at [supabase.com](https://supabase.com).
2. Open the SQL Editor and run [`supabase/schema.sql`](./supabase/schema.sql).
3. Copy your Project URL and anon/public key (Project Settings → API).
4. Copy `.env.example` to `.env` and paste those two values in.
5. Restart the dev server (or set the same env vars in your Vercel/host deploy).

Once configured, a **Team Sync** button appears in the header. One person taps "Start a New Team Playbook" to get a 6-character facility code, and teammates enter that code to join. Note: a facility code is a shared secret (like a Google Doc link), not per-user login — appropriate for a small trusted team sharing their own reference notes, not for anything sensitive.

## Tech stack

React 19 + Vite + Tailwind 4, `vite-plugin-pwa` for offline support, Web Speech API for voice dictation, `qrcode.react` for peer-to-peer card sharing, and an optional Supabase backend for Team Sync.
