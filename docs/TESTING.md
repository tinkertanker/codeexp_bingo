# Manual test plan

End-to-end checklist for verifying the app works. Goes well with two browser profiles (Profile A and Profile B in Chrome / two private windows) or two phones on the same Wi-Fi.

> **Setup before testing:** bring up Convex (`npx convex dev`), set `ADMIN_PASSCODE` and `ORGANISER_NAMES` (`npx convex env set …`), seed the squares (`npx convex run seed:seedAll '{ "passcode": "…" }'`), set the matching `VITE_*` vars in `.env`, then `npm run dev`. Sign in to `/admin`, create at least 4 teams across different colour groups, and open the game from `/admin/game`. See `docs/CONVEX_BOOTSTRAP.md` for the longer walkthrough.

## Legend

- 🟧 = orange square (find a team that did X)
- 🟦 = blue square (ask a team a question, colour-rule applies)
- ⬜ = grey square (mentor / photo / booth)
- 🟨 = wild square

---

## A. Setup smoke test

- [ ] `npm install` succeeds with no warnings about missing peers.
- [ ] `npm run build` produces `dist/` with the `index-*.js` ≤ 500 KB and per-route `*.js` chunks (SquareDetail, ProjectSubmit, admin/*, etc.).
- [ ] `npm run lint` passes with no errors.
- [ ] `npm run dev` boots, splash page loads at `/` (HTTP 200), and any direct URL like `/scoreboard` also returns 200 (SPA fallback works).

## B. Admin sign-in + team creation

- [ ] `/admin` rejects an empty name with a clear error.
- [ ] `/admin` rejects a wrong passcode with "Incorrect passcode."
- [ ] Correct creds redirect to `/admin/queue`.
- [ ] Reloading `/admin/queue` keeps you signed in (creds persist in localStorage).
- [ ] **Sign out** clears localStorage and bounces back to `/admin`.
- [ ] `/admin/teams` create flow: name `"Team Alpha"`, colour `red` → row appears, magic link copies via clipboard button.
- [ ] **Regenerate** prompts for confirmation, then changes the URL on the row (verify the old link no longer resolves to a team).
- [ ] Create at least 4 teams: one each of red, blue, green, yellow.

## C. Team identity

- [ ] Open Team Alpha's magic link in Profile A. The bingo grid loads, header shows the team name + colour swatch, lines/entries are 0.
- [ ] Reload — token persists, no need for the magic link again.
- [ ] **"Forget this device"** on a `not_found` team page clears the token and bounces to splash.
- [ ] In Profile B, open Team Beta's magic link.

## D. Orange squares (scan team only) — auto-approve

- [ ] In Profile A, tap an 🟧 square. UI invites you to scan.
- [ ] **Permission**: deny camera once → see the camera-blocked error message; refresh and grant.
- [ ] Scan Profile B's QR (open `/t/<beta-token>/qr` on Profile B, point camera at the screen).
- [ ] "Scanned team" card shows Team Beta with the right colour swatch.
- [ ] **Confirm completion** → cell turns green with ✓, lines updates if you've completed a line.
- [ ] Realtime: while Profile A is on the team home, have Profile B's admin reject an unrelated square — Profile A's grid does not change (filter by team_id works).
- [ ] **Self-scan**: scan your own QR for a different orange square → also auto-approves.

## E. Blue squares (scan + answer + colour-distinct rule)

- [ ] Profile A scans Team Beta (blue group) for the first 🟦 → asks for a short answer → submitted, cell green.
- [ ] Profile A tries to scan **another blue-coloured team** for a different 🟦 → UI rejects with "You've already used a blue team for another blue square..."
- [ ] Profile A scans a **green** team for the second 🟦 → succeeds.
- [ ] **Self-scan blocked**: try scanning your own QR for a 🟦 → "Blue squares need to be completed with another team — you can't scan yourself here."
- [ ] Empty answer → submit shows "Please type the team's answer briefly."

## F. Grey square: photo with another team

- [ ] Profile A taps the 🟦/⬜ "Photo with a team" square.
- [ ] Scan Team Beta, then take/choose a photo. Both required.
- [ ] **Submit disabled** until both inputs are present.
- [ ] After confirm, cell turns green.
- [ ] Photo appears in `/scoreboard` photo wall (next refresh of the realtime subscription).

## G. Grey square: photo with mentor (mentor approval)

- [ ] Profile A: pick the "Photo with a mentor" square. Upload a photo. Cell shows "pending" with `…` icon.
- [ ] On `/admin/queue`, the submission appears with photo preview.
- [ ] **Approve**: cell flips to green on Profile A *via realtime* (no reload).
- [ ] Repeat for the "Photo on stage" square but **Reject** with a reason. Cell shows rejected status; team can resubmit.

## H. Grey square: IG URL

- [ ] Submit `not-a-url` → rejected with the "starts with https://" message.
- [ ] Submit `https://www.instagram.com/p/abcdef/` → goes to admin queue with clickable link.
- [ ] Approve → cell completes on the team's grid.

## I. Wild square (photo auto)

- [ ] Upload any photo. Auto-approves immediately.
- [ ] Photo appears on the photo wall.

## J. Booth QR

- [ ] In Profile A, navigate directly to `/booth/deepfake`. With Team Alpha's token in localStorage, it auto-completes the booth square and redirects to team home.
- [ ] In a fresh Profile (no token), `/booth/deepfake` shows the "you need to log in first" hint.
- [ ] Visiting `/booth/deepfake` again after success shows "Already claimed".

## K. Project submission

- [ ] Paste a non-GitHub URL → check fails with "Doesn't look like a GitHub repo URL."
- [ ] Paste a real **public** GitHub URL → check passes, default branch shown.
- [ ] Paste a real **private** repo URL → check fails with "Repo not found or is private."
- [ ] Upload a tiny ZIP that contains `node_modules/` → inspection rejects with offending paths.
- [ ] Upload a clean ZIP → inspection passes with file count and total MB.
- [ ] Save submission. Reload the page → fields rehydrate, "Clean ZIP already on file — bonus entry secured" badge shows.

## L. Scoreboard

- [ ] Open `/scoreboard` on a third browser/window. With teams that have completions, leaderboard renders.
- [ ] Profile A completes another square → leaderboard updates within ~1 second (realtime).
- [ ] Photo wall shows the latest photos with the team-colour caption overlay.
- [ ] If a team has a clean ZIP submission, their `entries` count > `lines`.

## M. Lucky draw (organiser only)

- [ ] As a non-organiser mentor on `/admin/draw`, the page shows "Organiser-only" message.
- [ ] As an organiser, the draw button shows "Draw 3 winners" if no winners yet.
- [ ] **Run the draw** with too few eligible teams (entries=0) → error "Only 0 eligible team(s)."
- [ ] With ≥ 3 eligible teams, the spin animation cycles candidates and reveals winners one at a time.
- [ ] After completion, `/scoreboard` shows the winner banner across the bottom.
- [ ] **Re-draw**: rerunning gives different winners (random) and overwrites.
- [ ] **Clear winners** removes the banner.

## N. Game open/close gating

- [ ] On `/admin/game`, close the game. Profile A's bingo card shows "The bingo is paused" banner.
- [ ] Profile A taps an unfinished square → submission UI is replaced with "submissions are locked".
- [ ] Profile A's existing approved squares still display.
- [ ] Reopen → banner clears, submissions work again.

## O. Audit trail spot check

- [ ] After running through the above, in the Convex dashboard open the `mentorActions` table — you should see rows for each kind: approve, reject, draw, regen_token, create_team, open_game, close_game, with mentor names attached.

---

## Mobile / device-specific tests

- [ ] iOS Safari (latest): camera permission prompt, scanning works.
- [ ] iOS Safari: photo upload via "Take Photo" → camera opens.
- [ ] Android Chrome: same as above.
- [ ] Tablet/desktop: scoreboard fills the screen at 1920×1080.

## Edge cases worth re-testing periodically

- [ ] A team that scans then kills the network mid-submit — does the next attempt succeed cleanly? (Hint: the upsert keys on `(team_id, square_id)`, so resubmits are idempotent.)
- [ ] Two phones on the same team submitting different squares simultaneously — both should appear.
- [ ] A team scans QR, the QR was just regenerated by an admin — they get "No team found for that QR" rather than ghost-completing.
