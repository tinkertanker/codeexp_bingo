# Handover notes

The state of the project as of the **Convex migration** kickoff.

## Where we are

The full app is built and runnable against **Supabase**. All 10 originally-planned phases are complete:

1. ✅ Project scaffold
2. ✅ Schema + 16-square seed
3. ✅ Team identity + bingo grid
4. ✅ Orange-square scan flow
5. ✅ All 7 verification kinds + photo upload + colour-distinct rule
6. ✅ Admin queue + audit trail + teams management
7. ✅ Project submission (GitHub URL + ZIP inspection)
8. ✅ Live scoreboard + photo wall
9. ✅ Lucky draw with spin animation
10. ✅ Game open/close gating + code-splitting

`npm run build` produces a clean dist; `npm run lint` is clean. SPA fallback works in dev and prod.

See `docs/TESTING.md` for the manual test plan covering all of this.

## What changed at planning vs reality

| Plan said | What we actually did | Why |
|---|---|---|
| 5 Edge Functions (submit-square, approve, github-check, upload-zip, run-draw) | Zero — all logic client-side | Sister apps' trust model already does this; saves deployment complexity. Means trust is "soft" — anyone can hit the tables directly. |
| Cloudflare R2 for ZIP storage | Supabase Storage for ZIPs (`code-zips` bucket) | One platform instead of two. Free tier easily covers the event. |
| Gemini API for repo public-check | Plain GitHub REST API client-side | GitHub is authoritative; Gemini was redundant. |

## What's next: the Convex migration

We're moving the backend from Supabase to **Convex**. Reasons captured in chat history:
- Real-time is the core feature; Convex's reactive `useQuery` removes the manual subscription plumbing in `useTeam`, `Scoreboard`, `ApprovalQueue`.
- Business logic (the blue colour rule, the ZIP cleanliness check, the draw weighting) moves server-side via mutations, instead of being client-side honour code.
- Single platform (functions + DB + storage + realtime) rather than Supabase tables + Storage + Realtime channels.

### Files that will change

| Today (Supabase) | After (Convex) |
|---|---|
| `supabase/migrations/*.sql` | `convex/schema.ts` |
| `src/lib/submit.ts` | `convex/completions.ts` (mutations) |
| `src/lib/admin.ts` | `convex/admin.ts` |
| `src/lib/project.ts` | `convex/project.ts` (action for GitHub fetch) |
| `src/lib/draw.ts` | `convex/draw.ts` (mutation) |
| `src/lib/storage.ts` | replaced by Convex storage helpers |
| `src/hooks/useTeam.ts` | `useQuery(api.teams.getByToken, ...)` |
| `Scoreboard.tsx` realtime channel | `useQuery(api.scoreboard.bundle)` (auto-reactive) |
| `ApprovalQueue.tsx` realtime channel | `useQuery(api.admin.pendingQueue)` (auto-reactive) |
| `src/lib/supabase.ts` types | superseded by Convex auto-generated types |

### Files that stay mostly the same

- All page components in `src/pages/` — their data hooks change but the JSX is identical.
- All UI components in `src/components/` — they take props, they don't care where data comes from.
- `src/lib/lines.ts`, `src/lib/standings.ts`, `src/lib/qr.ts`, `src/lib/token.ts` — pure logic, no backend.
- `src/lib/draw.ts` — `pickWinners` is pure; only the persistence call changes.

### Migration approach

We'll do this in steps so the app is buildable at each commit:

1. Add the `convex` dependency and `convex/_generated/` placeholder, run `npx convex dev` once to bootstrap a deployment.
2. Author `convex/schema.ts` matching today's tables.
3. Port queries first (read-only) — `teams`, `bingoSquares`, `completions`, `gameState`, `photos`, `codeSubmissions`. Update `useTeam` to use Convex.
4. Port mutations — `completions.submit*`, `admin.approve/reject`, `admin.openGame/closeGame`, `teams.createTeam/regenToken`, `draw.run`.
5. Port file storage — replace `src/lib/storage.ts` calls with Convex storage upload URLs.
6. Port the GitHub public check to a Convex action (server-side fetch, no rate limit per user IP).
7. Delete Supabase code: `supabase/migrations/*`, `src/lib/supabase.ts` Supabase client, all `supabase.from(...)` calls.
8. Update env vars, `.env.example`, `README.md`, `CLAUDE.md`.
9. Re-run the manual test plan in `docs/TESTING.md`.

## Known gaps + intern follow-ups

These are not blockers for the migration; they're follow-up tasks once Convex is in place.

### Functional follow-ups
- [ ] **Teams seed script**: `/admin/teams` is currently manual. Write a `scripts/seed-teams.ts` that reads a CSV of `(name, colour)` and bulk-inserts.
- [ ] **Team-card print sheet**: design + print 40 cards with QR + team name + colour. Should be a small standalone page (HTML or React).
- [ ] **CSV export**: from `/admin/game`, add a "Download standings CSV" button — useful for organisers and post-event analysis.
- [ ] **Booth QR variants**: if there's >1 booth, parametrise `/booth/:boothName` and seed a square per booth.

### UX polish
- [ ] **Mobile bottom sheet** for square detail instead of full-page navigation — less jarring on phones.
- [ ] **Toast/snackbar** for "Submission saved" rather than the navigate-back pattern.
- [ ] **Photo wall TV rotation**: currently shows the most recent N photos. Add a fade/transition rather than re-render.
- [ ] **Confetti** on lucky-draw winners (CSS or `canvas-confetti`).
- [ ] **Better empty states** on every admin tab (no teams yet, no pending, no completions).

### Testing
- [ ] **E2E with Playwright** for the team flow + admin approve flow. Currently we only have a manual checklist.
- [ ] Test on **iOS Safari (real device)** specifically for QR camera + photo capture — desktop browser sims aren't a faithful proxy.
- [ ] Load test: 200 simulated concurrent connections to scoreboard + 40 simultaneous submissions.

### Documentation
- [ ] Add screenshots / a 30-second screen-recording to `README.md`.
- [ ] Document the printed-QR card design and physical setup procedure (which mentor hands out cards, where the booth poster goes).

## Open questions for the team

- Will mentors review submissions in real-time during the event, or batch at the end? The current approval queue assumes real-time; batch would change UX.
- IG hashtag verification is `BH26` — confirm the actual hashtag with DSTA before printing.
- For the lucky draw: 3 winners is hard-coded as `NUM_WINNERS` in `DrawSpin.tsx`. Confirm with DSTA whether it should be configurable.
- Do photo gallery contents need approval before showing on the photo wall? Currently auto-approved photos go straight to the wall.

## Where to ask for help

- Architecture / data model questions → `CLAUDE.md`
- "How do I run X?" → `README.md`
- "Does feature Y still work?" → run `docs/TESTING.md` end-to-end
- Anything else → ping YJ
