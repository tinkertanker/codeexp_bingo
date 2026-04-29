# BrainHack Bingo

A companion web app for the **DSTA CODE_EXP / BrainHack 2026** hackathon "Secret Challenge — Bingo". Replaces the original sticker/paper bingo card with a digital experience: teams play a 4×4 bingo card across the event, complete squares by scanning each other's QR codes / uploading photos / asking mentors for stamps, and earn lucky-draw entries for completed lines. A live scoreboard + photo wall runs on the venue TV; an in-app spin animation handles the draw.

## Quick start

```bash
npm install
cp .env.example .env       # then edit .env with your Supabase project values
npm run dev
```

Open <http://localhost:5173>. The splash page redirects to a team's bingo card if a magic-link token is in localStorage; otherwise it shows a "got a magic link?" message. To get a token, sign in to the admin panel (`/admin`) and create teams.

### Required environment variables

| Var | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key (public, ships in client bundle) |
| `VITE_ADMIN_PASSCODE` | Shared mentor passcode (also ships in client bundle — fine for the trust model) |
| `VITE_ORGANISER_NAMES` | Comma-separated names allowed to flip game state and run the lucky draw (e.g. `YJ,Marcus`) |

### Setting up Supabase

1. Create a Supabase project at <https://supabase.com>.
2. Get the project ref from the dashboard URL.
3. Link locally and push the migrations:
   ```bash
   supabase link --project-ref <ref>
   supabase db push
   ```
   This creates all tables, seeds the 16 bingo squares, and creates the `photos` and `code-zips` storage buckets with public read/write.
4. Paste the project URL + anon key into `.env`.
5. `npm run dev`. Visit `/admin`, sign in with the passcode, and create some teams to play with.

> **Note**: A migration to **Convex** is in progress (see `docs/HANDOVER.md`). Once that lands, the Supabase setup steps above won't apply.

## What's where

```
src/
├── App.tsx                         router with code-split routes
├── main.tsx                        Vite entry
├── index.css                       Tailwind directives
├── lib/                            pure logic + API helpers
│   ├── supabase.ts                 Supabase client + all domain types
│   ├── token.ts                    localStorage helpers (team token, admin creds)
│   ├── lines.ts                    bingo line counting (rows/cols/diagonals)
│   ├── qr.ts                       QR magic-link encode/parse
│   ├── storage.ts                  photo upload + public URL
│   ├── standings.ts                compute lines + entries per team
│   ├── submit.ts                   typed wrappers for each verification kind
│   ├── admin.ts                    passcode check, organiser allow-list, audit
│   ├── project.ts                  GitHub URL + ZIP inspection helpers
│   └── draw.ts                     weighted-random pickWinners
├── hooks/
│   └── useTeam.ts                  loads a team + subscribes to realtime
├── components/                     reusable UI
│   ├── BingoGrid.tsx, SquareCell.tsx, TeamHeader.tsx
│   ├── QRScanner.tsx, PhotoCapture.tsx
│   ├── AdminLayout.tsx
│   └── Leaderboard.tsx, PhotoWall.tsx
└── pages/                          one component per route
    ├── Splash.tsx, TeamHome.tsx, SquareDetail.tsx, TeamQR.tsx
    ├── ProjectSubmit.tsx, BoothDeepfake.tsx, Scoreboard.tsx
    └── admin/
        ├── AdminLogin.tsx, ApprovalQueue.tsx
        ├── TeamsManage.tsx, GameControls.tsx, DrawSpin.tsx

supabase/
└── migrations/
    ├── 0001_init.sql               tables + 16-square seed + realtime publication
    └── 0002_storage.sql             photos + code-zips buckets and policies

docs/
├── TESTING.md                      manual test checklist
└── HANDOVER.md                     current state + Convex migration plan
```

## Routes

### Public
- `/` — splash, redirects to team home if a token is stored.
- `/t/:token` — team home (the bingo card).
- `/t/:token/square/:position` — square detail with the right verification UI.
- `/t/:token/qr` — big QR for other teams to scan.
- `/t/:token/project` — GitHub URL + ZIP submission.
- `/booth/deepfake` — auto-completes the booth square (scan-target for the printed booth poster).
- `/scoreboard` — public TV view, designed for 1920×1080.

### Admin (passcode + name)
- `/admin` — sign-in.
- `/admin/queue` — pending photo / IG approvals.
- `/admin/teams` — manage 40 teams + magic links.
- `/admin/game` — open/close the game + live stats.
- `/admin/draw` — organiser-only lucky draw with spin animation.

## Trust model (no real auth)

- Each team has an opaque token. The "magic link" is `/t/<token>`. Anyone with that URL acts as that team.
- Mentors share a single passcode. They identify themselves with a free-text name on every admin login; that name is stamped on every approve/reject action (`mentor_actions` table = audit trail).
- Organisers are the subset of mentor names listed in `VITE_ORGANISER_NAMES`; only they see the game-open/close and lucky-draw buttons.
- RLS is disabled on the database. Soft access control is the token-in-URL.

## Developer scripts

```bash
npm run dev        # Vite dev server with HMR
npm run build      # tsc -b && vite build → dist/
npm run lint       # ESLint
npm run preview    # serve dist/ for local production smoke test
```

## Status & next steps

See `docs/HANDOVER.md` for a fuller picture, including:
- which features are complete and ready to test
- the upcoming **Convex migration** that will replace the Supabase backend
- known limitations and follow-up tasks for interns

## Manual test plan

See `docs/TESTING.md` for an end-to-end test checklist. Run through it on two browser profiles (or two phones on the same Wi-Fi) to verify all the team-to-team interactions work.
