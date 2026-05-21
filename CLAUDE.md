# BrainHack Bingo — codeexp_bingo

Companion app for the DSTA CODE_EXP / BrainHack 2026 hackathon "Secret Challenge — Bingo".

## What it does

Replaces the original sticker/paper bingo card. Each of ~40 teams plays a 4×4 bingo card during the event. Lines completed = lucky-draw entries. Optional GitHub repo + clean ZIP submission earns a bonus entry. Live scoreboard + photo wall on a venue TV. In-app spin animation for the draw.

## Stack

- React 19 + TypeScript + Vite 6 + Tailwind 3
- **Convex** (database + reactive queries + storage + actions). All backend code lives under `convex/`.
- Netlify hosting
- `qrcode` (render) + `html5-qrcode` (scan, browser camera)
- `jszip` (client-side ZIP central-directory inspection)
- GitHub REST API via a Convex action (`convex/githubCheck.ts`) — server-side fetch, not subject to per-IP rate limits

## Theme

UI is restyled to match the **BrainHack 2026 / CODE_EXP** brand: dark surface (`#000` / `bh.bg`), neon lime `#A6FB00` primary, magenta `#FF00C9` and cyan `#00FFFF` accents, pixel-grid backdrop, Orbitron display + Funnel Display body. Tokens live in `tailwind.config.js` under `bh.*`, `bingo.*-soft`, `team.*`, plus `boxShadow.neon-*` utilities. Global styles (`bh-card`, `bh-btn-primary`, `bh-btn-ghost`, `bh-display`, `bh-stripes`) are defined in `src/index.css`.

## Identity model (no real auth)

- **Teams**: each team has an opaque token. The "magic link" is `/t/<token>`. Mentors share via Discord. Token persisted in `localStorage`.
- **Mentors / organisers**: shared passcode. The client checks it against `VITE_ADMIN_PASSCODE`; every Convex mutation also re-validates it server-side against `ADMIN_PASSCODE` (set via `npx convex env set`). On admin login, mentors type their **name** (free text), stored in localStorage and stamped on every approve/reject — that's the audit trail. Organiser superpowers (open/close game, lucky draw) are gated client-side by `VITE_ORGANISER_NAMES` and server-side by `ORGANISER_NAMES` (must match).

## Game mechanics — 16 squares

Same 4×4 grid for everyone. Three categories from DSTA's brief plus one wild card. See `convex/seed.ts` for exact seed data.

| Category | Count | Verification |
|---|---|---|
| Orange — "Find a team that did X" | 6 | Scan another team's QR. Auto-approves. The scanned team must have a mentor-approved self-declaration (`teamEligibility`) for that square — see §Self-declared eligibility. Position 15 is "Innovative use of AI", category-locked to cat1. |
| Blue — "Ask another team a question" | 4 | Scan another team + type their answer. Distinct-team rule: across the 4 blue squares, no two scans may be the same team (enforced server-side in `convex/completions.ts`). |
| Grey — Photo with team | 1 | Scan team + upload photo. Auto-approve. |
| Grey — Photo with mentor / on stage | 2 | Upload photo. Mentor approves. |
| Grey — IG post #BH26 | 1 | Paste IG URL. Mentor approves. |
| Grey — Visit Deepfake booth | 1 | Scan QR poster at the booth. Auto-complete. |
| Wild — Show off your project | 1 | Upload selfie. Auto-approve. Goes to public photo wall. |

### Self-declared eligibility (orange squares)

Orange-square completion is no longer pure honour-code. Workflow:

1. A team self-declares "we qualify for X" via the eligibility card on `/t/:token` → creates a `teamEligibility` row, status `pending`.
2. A mentor approves on `/admin/queue` (Eligibility section).
3. Only then can another team scan that team's QR to claim the matching orange square.

### Team categories (cat1 / cat2)

Each team is assigned `cat1` or `cat2` (managed on `/admin/teams`). Squares may set `restrictToCategory`; teams from the other category see a "Not your category" placeholder tile and the square is auto-credited toward their bingo lines so they aren't penalised in the lucky draw. Position 15 "Innovative use of AI" is locked to cat1.

### Timed squares

Each `bingoSquare` may carry `releaseAt` (ms epoch) and/or `manuallyReleased` (true = force-released, false = force-locked, undefined = auto). Until released, the tile shows "Coming soon" and Convex blocks submissions in `assertCanSubmit`. Admins manage this on `/admin/game`.

### Fan-favourites voting

Independent of the bingo card. Each team picks one favourite (not themselves) on `/t/:token`; vote stored in `fanVotes`, changeable any time. Tally shown on `/admin/fanfavs` and the public scoreboard. Voting is allowed regardless of `gameState.isOpen`.

## Lucky draw

- Entries: 1 per completed bingo line + 1 bonus for a clean ZIP upload.
- Public GitHub URL is required for code submission but doesn't itself add an entry.
- Draw flow: `/admin/draw` (organiser only) → `api.draw.run` mutation picks 3 weighted-random winners server-side and saves to `gameState.drawWinners` → in-app spin animation reveals them → scoreboard reactively shows the winners banner.

## Routes

**Public**
- `/` — splash; auto-redirects if a team token is in localStorage.
- `/t/:token` — team home (the bingo card).
- `/t/:token/square/:position` — square detail (verification UI per `verificationKind`).
- `/t/:token/qr` — big QR for other teams to scan.
- `/t/:token/project` — GitHub URL + ZIP upload.
- `/booth/deepfake` — auto-completes the booth square.
- `/scoreboard` — public TV view. Designed for 1920×1080.

**Admin (passcode + name)**
- `/admin` — login.
- `/admin/queue` — pending eligibility declarations + photo / IG approvals.
- `/admin/teams` — manage 40 teams (colour + category) + magic links.
- `/admin/game` — open/close game + live stats + per-square release schedule.
- `/admin/fanfavs` — fan-favourite vote tally.
- `/admin/draw` — run the lucky draw (organiser-only).

## Schema

Source of truth: `convex/schema.ts`. Tables (camelCase, with `_id` and `_creationTime` system fields):

- `teams` — token, colour group, category (`cat1` / `cat2`). Indexed by `token`, `colour`.
- `bingoSquares` — 16 seeded rows. Optional `releaseAt` / `manuallyReleased` (timed-lock), optional `restrictToCategory` (cat lock). Indexed by `position`.
- `squareCompletions` — status + evidence; one row per (team, square) via the `by_team_and_square` index. Photo evidence is a `Id<'_storage'>` reference, not a path.
- `teamEligibility` — self-declared orange-square eligibility. One row per (team, square). Status `pending|approved|rejected`. Indexed by `by_team`, `by_team_and_square`, `by_status`.
- `fanVotes` — one row per voting team. Indexed by `voterTeamId` and `votedTeamId`.
- `mentorActions` — audit trail of every admin action.
- `codeSubmissions` — one per team. Indexed by `teamId`.
- `photos` — denormalised for the public photo wall. References `_storage` for the file.
- `gameState` — singleton (queried via `.first()`); holds `isOpen` + `drawWinners`.

## Storage

Convex Storage holds all photos and submitted ZIPs. Files are referenced by `Id<'_storage'>`; queries that return them call `ctx.storage.getUrl(...)` to mint signed URLs (e.g. `api.photos.recent`, `api.scoreboard.bundle`, `api.completions.listPending`). The frontend uploads via `api.upload.generateUploadUrl` → POST → save the returned storageId in the relevant mutation.

## Env vars

**Frontend** (`.env` / `.env.local`, `cp .env.example .env`):

```
VITE_CONVEX_URL=https://<your-deployment>.convex.cloud
VITE_ADMIN_PASSCODE=change-me
VITE_ORGANISER_NAMES=YJ,Marcus
```

**Convex deployment** (server-side, set via CLI — never reach the client bundle):

```bash
npx convex env set ADMIN_PASSCODE 'change-me'
npx convex env set ORGANISER_NAMES 'YJ,Marcus'
```

Both passcodes must match. The frontend gates the admin UI; every Convex mutation independently re-checks the passcode (and organiser allow-list for `setOpen` / `draw.run` / etc.).

## Setup

```bash
npm install
cp .env.example .env

# First-time: bootstrap a Convex project, generates convex/_generated/, deploys schema + functions.
npx convex dev   # leave running while developing — it hot-reloads Convex code on save

# Server-side env vars + seed the 16 bingo squares.
npx convex env set ADMIN_PASSCODE 'change-me'
npx convex env set ORGANISER_NAMES 'YJ,Marcus'
npx convex run seed:seedAll '{ "passcode": "change-me" }'

# In another terminal:
npm run dev
```

For deeper setup notes see `docs/CONVEX_BOOTSTRAP.md`.

## Pre-event setup tasks

- Add 40 teams via `/admin/teams` (or write a seed script that calls `api.teams.create`).
- Print 40 team magic-link cards. Each card shows: team name, colour group, the team's `/t/<token>` QR. The QR doubles as: (a) the team's "log in here on a fresh phone" link and (b) the QR other teams scan to complete bingo squares.
- Print one Deepfake-booth poster encoding the URL `/booth/deepfake`.
- Make sure `ORGANISER_NAMES` is set on the Convex deployment AND mirrored in `VITE_ORGANISER_NAMES` so the draw and game-open/close buttons show for them.
- Decide a memorable passcode and set it on both sides (`VITE_ADMIN_PASSCODE` + `npx convex env set ADMIN_PASSCODE`). Share with mentors via Discord.

## Implementation status

All 10 original phases complete + the Supabase → Convex backend migration:

- [x] Phase 1 — Bootstrap (Vite + Tailwind + router)
- [x] Phase 2 — Schema + 16-square seed
- [x] Phase 3 — Team identity + bingo grid render
- [x] Phase 4 — Orange-square scan happy path (QR scanner + team QR)
- [x] Phase 5 — All 7 verification kinds + photo upload + colour rule
- [x] Phase 6 — Admin queue, audit trail, teams management, game controls
- [x] Phase 7 — GitHub URL + ZIP upload (client-side JSZip inspection + server-side GitHub action)
- [x] Phase 8 — Live scoreboard + photo wall (Convex reactive queries)
- [x] Phase 9 — Lucky draw with spin animation
- [x] Phase 10 — Game-open/close gating + code-splitting
- [x] Backend migration — Supabase removed; all reads/writes go through Convex queries/mutations/actions

Build: `npm run build` produces a ~316KB initial JS chunk; SquareDetail (with html5-qrcode) and ProjectSubmit (with JSZip) lazy-load on demand.

## Known scope decisions

- Business logic (blue colour rule, ZIP cleanliness check, draw weighting) lives in Convex mutations, so the trust model is no longer pure honour code.
- ZIP cleanliness check still happens client-side via JSZip before upload (server doesn't re-inspect). For a 40-team friendly event, this is fine.
- Game-state lock and blue colour rule are now enforced in `convex/completions.ts` mutations — bypassing the client UI gets you a server error.

<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->
