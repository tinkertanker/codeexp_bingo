# Handover notes

State of the project just before the event.

## Where we are

The full app is built and runnable against **Convex**. All 10 originally-planned phases are complete plus the Supabase → Convex backend migration:

1. ✅ Project scaffold
2. ✅ Schema + 16-square seed (`convex/schema.ts` + `convex/seed.ts`)
3. ✅ Team identity + bingo grid
4. ✅ Orange-square scan flow
5. ✅ All 7 verification kinds + photo upload + colour-distinct rule (server-enforced)
6. ✅ Admin queue + audit trail + teams management
7. ✅ Project submission (GitHub URL via Convex action + ZIP inspection)
8. ✅ Live scoreboard + photo wall (Convex reactive queries — no manual subscription plumbing)
9. ✅ Lucky draw with spin animation (server picks weighted-random winners)
10. ✅ Game open/close gating + code-splitting
11. ✅ Backend migration — Supabase removed entirely; `@supabase/supabase-js` no longer a dependency

`npm run build` produces a clean dist; `npm run lint` is clean. `tsc -b` passes. SPA fallback works in dev and prod.

See `docs/TESTING.md` for the manual test plan covering all of this and `docs/CONVEX_BOOTSTRAP.md` for the first-time setup walkthrough.

## Architecture quick map

| Concern | Lives in |
|---|---|
| Tables + indexes + validators | `convex/schema.ts` |
| Read paths used by the app | `api.teams.*`, `api.squares.list`, `api.completions.listForTeam`, `api.scoreboard.bundle`, `api.gameState.get`, `api.codeSubmissions.getForTeam`, `api.photos.recent` |
| Write paths | `api.completions.submit*` (one per verification kind), `api.admin.approveCompletion / rejectCompletion`, `api.gameState.setOpen`, `api.teams.create / regenerateToken`, `api.codeSubmissions.save`, `api.draw.run / clearWinners` |
| File uploads | `api.upload.generateUploadUrl` → POST → save returned `storageId` in the relevant mutation |
| External fetches | `api.githubCheck.check` (action — server-side fetch, no per-IP rate-limit issues) |
| Trust enforcement | `assertAdmin(passcode)` + `assertOrganiser(name)` in `convex/admin.ts`, called by every privileged mutation |

Frontend never talks to GitHub directly anymore, never constructs storage URLs, never enforces the blue colour rule or the game-open lock — Convex does all of that.

## Known gaps + intern follow-ups

Not blockers. Pick from the top.

### Functional follow-ups
- [ ] **Teams seed script**: `/admin/teams` is currently manual. Write a `scripts/seed-teams.ts` that reads a CSV of `(name, colour)` and bulk-calls `api.teams.create`.
- [ ] **Team-card print sheet**: design + print 40 cards with QR + team name + colour. Should be a small standalone page (HTML or React).
- [ ] **CSV export**: from `/admin/game`, add a "Download standings CSV" button — useful for organisers and post-event analysis.
- [ ] **Booth QR variants**: if there's >1 booth, parametrise `/booth/:boothName` and seed a square per booth.
- [ ] **Mid-spin draw broadcast**: today, `api.draw.run` saves winners *before* the in-app spin animation reveals them, so the public scoreboard pops the winners banner a few seconds before the organiser's reveal completes. If you want the dramatic timing back, split the draw into two mutations: `previewDraw` (returns winners without saving) + `commitDraw` (persists). Have DrawSpin call preview, animate, then commit.

### UX polish
- [ ] **Mobile bottom sheet** for square detail instead of full-page navigation — less jarring on phones.
- [ ] **Toast/snackbar** for "Submission saved" rather than the navigate-back pattern.
- [ ] **Photo wall TV rotation**: currently shows the most recent N photos. Add a fade/transition rather than re-render.
- [ ] **Confetti** on lucky-draw winners (CSS or `canvas-confetti`).
- [ ] **Better empty states** on every admin tab (no teams yet, no pending, no completions).

### Hardening
- [ ] **Pass + verify the team token in submit mutations**: today, `submit*` mutations take a `teamId` directly. A malicious caller with the dev tools could submit on behalf of any team. Acceptable for a 40-team friendly event but tighten if this ever runs untrusted.
- [ ] **ZIP cleanliness re-check server-side**: still happens client-side via JSZip before upload. A modified client could skip the check. Add an action that re-inspects after upload using the storageId.

### Testing
- [ ] **E2E with Playwright** for the team flow + admin approve flow. Currently we only have a manual checklist.
- [ ] Test on **iOS Safari (real device)** specifically for QR camera + photo capture — desktop browser sims aren't a faithful proxy.
- [ ] Load test: 200 simulated concurrent connections to scoreboard + 40 simultaneous submissions.

### Documentation
- [ ] Add screenshots / a 30-second screen-recording to `README.md`. (Static screenshots already produced — see /tmp/codeexp_screenshots in chat history.)
- [ ] Document the printed-QR card design and physical setup procedure (which mentor hands out cards, where the booth poster goes).

## Design considerations under discussion

Floated late in development; not yet decided. Each has a sketch + tradeoff so a future dev can pick up cold.

### Time-based square availability

**Idea**: certain squares only unlock during specific windows (e.g. "scan a team during lunch", "find someone on stage during the demo block"). Creates "moments" during the event rather than a flat 6-hour grind.

**Sketch**:
- Add optional `availableFrom` / `availableUntil` fields (epoch ms or HH:MM strings) to the `bingoSquares` rows in `convex/schema.ts` + `convex/seed.ts`.
- Server-enforce in the relevant `submit*` mutations in `convex/completions.ts`: reject with `"Not available yet"` / `"This square has closed"` outside the window.
- UI: render locked squares with a clock icon + the window text; auto-refresh on a `useQuery(api.gameState.get)` tick or `setInterval`.

**Tradeoffs**: adds operational overhead — organisers must brief teams on timing, and any phone with a wonky clock will get confusing errors. Probably best limited to 1–2 special squares rather than the whole grid.

### "Interactive screens" / kiosks

**Status**: needs clarification before scoping. Two plausible interpretations:
- **(a) New kiosk feature** — a venue screen teams gather around. E.g. tappable scoreboard, photo booth, "spin the wheel" moment.
- **(b) Prototype mockups** — wireframes of the time-based and verification ideas before we commit code.

If (a): simplest add is a `/kiosk/photo-booth` route — front camera, on-tap snapshot, drops a photo into the photo wall with a stamped caption. ~1 evening of work.

If (b): use `ui-sketcher` for ASCII wireframes first, render the chosen direction as a real React preview, screenshot it.

### Verifying claimed completions

**Problem**: orange squares are "find a team that did X" — team A scans team B and self-asserts team B has the feature. Today this is honour-system; nothing checks that team B actually built X.

**Options ranked by cost/value**:
1. **Mutual scan** (cheap, high friction) — team B must scan back to confirm. Roughly doubles scanning time; teams may abandon mid-flow.
2. **Photo evidence + mentor approval** (high friction, slow) — every orange claim needs a screenshot or photo; mentor bandwidth becomes the bottleneck for 40 teams × 6 orange squares.
3. **Probabilistic audit** (cheap, defensible — recommended) — server flips a random ~20% of orange claims to `pending` for mentor review instead of auto-approving. Cheating becomes a coin-flip risk; honest teams barely notice. Implementation: in `convex/completions.ts` `submitOrangeScan`, roll a random number; on hit, set `status: 'pending'` and queue it like a photo approval.

**Recommendation**: option 3 with a per-square audit-rate config (default 0.2). Easy to tune mid-event if it's too noisy or too lax.

## Open questions for the team

- Will mentors review submissions in real-time during the event, or batch at the end? The current approval queue assumes real-time; batch would change UX.
- IG hashtag verification is `BH26` — confirm the actual hashtag with DSTA before printing.
- For the lucky draw: 3 winners is hard-coded as `NUM_WINNERS` in `DrawSpin.tsx`. Confirm with DSTA whether it should be configurable.
- Do photo gallery contents need approval before showing on the photo wall? Currently auto-approved photos go straight to the wall.

## Where to ask for help

- Architecture / data model questions → `CLAUDE.md`
- "How do I run X?" → `README.md`
- "How do I bring up Convex from scratch?" → `docs/CONVEX_BOOTSTRAP.md`
- "Does feature Y still work?" → run `docs/TESTING.md` end-to-end
- Anything else → ping YJ
