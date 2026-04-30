# BrainHack Bingo — codeexp_bingo

Companion app for the DSTA CODE_EXP / BrainHack 2026 hackathon "Secret Challenge — Bingo".

## What it does

Replaces the original sticker/paper bingo card. Each of ~40 teams plays a 4×4 bingo card during the event. Lines completed = lucky-draw entries. Optional GitHub repo + clean ZIP submission earns a bonus entry. Live scoreboard + photo wall on a venue TV. In-app spin animation for the draw.

## Stack

- React 19 + TypeScript + Vite 6 + Tailwind 3
- Supabase (Postgres + Realtime + Storage) — current runtime backend
- Convex backend scaffolded under `convex/` (schema + queries + mutations + actions); frontend not yet switched over. See `docs/HANDOVER.md` for the migration plan.
- Netlify hosting
- `qrcode` (render) + `html5-qrcode` (scan, browser camera)
- `jszip` (client-side ZIP central-directory inspection)
- GitHub REST API (client-side, no token — public-repo check)

## Theme

UI is restyled to match the **BrainHack 2026 / CODE_EXP** brand: dark surface (`#000` / `bh.bg`), neon lime `#A6FB00` primary, magenta `#FF00C9` and cyan `#00FFFF` accents, pixel-grid backdrop, Orbitron display + Funnel Display body. Tokens live in `tailwind.config.js` under `bh.*`, `bingo.*-soft`, `team.*`, plus `boxShadow.neon-*` utilities. Global styles (`bh-card`, `bh-btn-primary`, `bh-btn-ghost`, `bh-display`, `bh-stripes`) are defined in `src/index.css`.

## Identity model (no real auth)

- **Teams**: each team has an opaque token. The "magic link" is `/t/<token>`. Mentors share via Discord. Token persisted in `localStorage`.
- **Mentors / organisers**: shared `VITE_ADMIN_PASSCODE` env var. On admin login, mentor types their **name** (free text), stored in localStorage and stamped on every approve/reject — that's the audit trail. Organiser superpowers (open/close game, lucky draw) are gated by a `VITE_ORGANISER_NAMES` allow-list env var (comma-separated).

## Game mechanics — 16 squares

Same 4×4 grid for everyone. Three categories from DSTA's brief plus one wild card. See `supabase/migrations/0001_init.sql` for exact seed data.

| Category | Count | Verification |
|---|---|---|
| Orange — "Find a team that did X" | 6 | Scan another team's QR (or self). Auto-approves. |
| Blue — "Ask another team a question" | 4 | Scan another team + type their answer. Colour rule: across the 4 blue squares, no two scans may share a team-colour group. |
| Grey — Photo with team | 1 | Scan team + upload photo. Auto-approve. |
| Grey — Photo with mentor / on stage | 2 | Upload photo. Mentor approves. |
| Grey — IG post #BH26 | 1 | Paste IG URL. Mentor approves. |
| Grey — Visit Deepfake booth | 1 | Scan QR poster at the booth. Auto-complete. |
| Wild — Show off your project | 1 | Upload selfie. Auto-approve. Goes to public photo wall. |

## Lucky draw

- Entries: 1 per completed bingo line + 1 bonus for a clean ZIP upload.
- Public GitHub URL is required for code submission but doesn't itself add an entry.
- Draw flow: `/admin/draw` (organiser only) → spin animation → 3 weighted-random winners → broadcast to `/scoreboard` via Supabase realtime.

## Routes

**Public**
- `/` — splash; auto-redirects if a team token is in localStorage.
- `/t/:token` — team home (the bingo card).
- `/t/:token/square/:position` — square detail (verification UI per `verification_kind`).
- `/t/:token/qr` — big QR for other teams to scan.
- `/t/:token/project` — GitHub URL + ZIP upload.
- `/booth/deepfake` — auto-completes the booth square.
- `/scoreboard` — public TV view. Designed for 1920×1080.

**Admin (passcode + name)**
- `/admin` — login.
- `/admin/queue` — pending photo / IG approvals.
- `/admin/teams` — manage 40 teams + magic links.
- `/admin/game` — open/close game + live stats.
- `/admin/draw` — run the lucky draw (organiser-only).

## Schema

See `supabase/migrations/0001_init.sql` for source of truth. Tables:

- `teams` (token, colour group)
- `bingo_squares` (16 seeded rows)
- `square_completions` (status + evidence; one row per (team, square) via unique constraint)
- `mentor_actions` (audit trail of every admin action)
- `code_submissions` (one per team)
- `photos` (denormalised for fast gallery)
- `game_state` (single row, is_open + draw_winners)

`0002_storage.sql` creates the `photos` and `code-zips` Supabase Storage buckets and their public-read / public-write policies.

RLS is **disabled** to match sister projects. Token-in-URL is the soft access control.

## Storage

- `photos` bucket — public read + write. Stores all photo evidence and the public photo wall.
- `code-zips` bucket — public read + write. Stores submitted project ZIPs (we inspect them client-side via JSZip before upload to reject `node_modules` / oversized files).

## Env vars

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_ADMIN_PASSCODE=
VITE_ORGANISER_NAMES=YJ,Marcus      # comma-separated, case-insensitive
```

`VITE_ADMIN_PASSCODE` ships in the client bundle — fine for this trust model. Anyone with the passcode can act as a mentor; only names listed in `VITE_ORGANISER_NAMES` can flip game state or run the draw.

## Setup

```bash
npm install
cp .env.example .env  # fill in Supabase values + admin passcode
npm run dev
```

Provision Supabase, then run migrations:
```bash
supabase link --project-ref <ref>
supabase db push
```

The migration creates buckets too (no extra storage setup needed).

## Pre-event setup tasks

- Add 40 teams via `/admin/teams` (or write a seed script to bulk-insert).
- Print 40 team magic-link cards. Each card shows: team name, colour group, the team's `/t/<token>` QR. The QR doubles as: (a) the team's "log in here on a fresh phone" link and (b) the QR other teams scan to complete bingo squares.
- Print one Deepfake-booth poster encoding the URL `/booth/deepfake`.
- Add organiser names to `VITE_ORGANISER_NAMES` so the draw and game-open/close buttons show for them.
- Decide a memorable passcode for `VITE_ADMIN_PASSCODE` and share it with mentors via Discord.

## Implementation status

All 10 phases complete:

- [x] Phase 1 — Bootstrap (Vite + Tailwind + Supabase client + router)
- [x] Phase 2 — Schema + 16-square seed
- [x] Phase 3 — Team identity + bingo grid render
- [x] Phase 4 — Orange-square scan happy path (QR scanner + team QR)
- [x] Phase 5 — All 7 verification kinds + photo upload + colour rule
- [x] Phase 6 — Admin queue, audit trail, teams management, game controls
- [x] Phase 7 — GitHub URL + ZIP upload (client-side JSZip inspection)
- [x] Phase 8 — Live scoreboard + photo wall (realtime)
- [x] Phase 9 — Lucky draw with spin animation
- [x] Phase 10 — Game-open/close gating + code-splitting + dev-server smoke test

Build: `npm run build` produces a ~451KB initial JS chunk; SquareDetail (with html5-qrcode) and ProjectSubmit (with JSZip) lazy-load on demand.

## Known scope decisions

- No Edge Functions in v1. All writes happen client-side against the unrestricted tables. Trust posture matches sister hackathon apps.
- No real-time enforcement of the blue colour rule beyond the client check. A team that bypasses the UI could theoretically submit duplicates, but the rule shows visibly in the UI and the audit trail catches it.
- ZIP cleanliness check is also client-side (server has no second look). For a 40-team friendly event, this is fine.
- Photos and ZIPs go to Supabase Storage, not R2. Simpler — same client, same auth, free tier covers the event.
