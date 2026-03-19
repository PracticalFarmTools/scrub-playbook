# ScrubPlaybook

**Your Surgeons. Your Rules.** 🩺

A mobile-first personal reference app built by scrub techs, for scrub techs. Track surgeon preferences, glove specs, sutures, instrument nicknames, and tech-to-tech tips — all offline-capable and stored locally in your browser.

## Features

- **Surgeon Cards** — Per-procedure gloves, gowns, sutures, equipment, and tips
- **Instrument Nicknames** — Map surgeon slang to real instrument names
- **Fuzzy Search Portal** — Find any surgeon, procedure, or nickname instantly
- **Edit Engine** — Full CRUD on nicknames, procedures, vendor links, and more
- **Vendor IFU Library** — Quick-link to manufacturer instructions for use
- **Audit Trail** — Timestamped log of every change made
- **Offline-First** — All data stays in localStorage; works without internet
- **PWA Ready** — Installable on iOS and Android home screens

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 (Vite 8) |
| Styling | Tailwind CSS 4 |
| Icons | Lucide React |
| Data | localStorage — no backend |

## Quick Start

```bash
npm install
npm run dev
```

## Disclaimer

This tool is a **personal reference aid** and is not a substitute for official manufacturer Instructions for Use (IFU), facility-specific policies, or surgeon-verified preference cards. Always confirm preferences directly with the surgical team before each procedure. No patient-identifiable information (PHI) should be entered.
