# Implementation plan — 2026-05-21 changes

This document is the single reference for the changes requested on 2026-05-21. Every change below maps back to one of the five numbered items in the original request. Code edits should reference this file (commit messages can cite `docs/IMPLEMENTATION_PLAN.md §N`).

## 0. Decisions captured from clarification

- "Brown squares" in the request means the **orange** category (the 6 "Find a team that did X" squares).
- Team categories for item (5) are called **`cat1`** and **`cat2`**. `cat1` = "open category" (sees the AI square); `cat2` = locked out of the AI square.
- Fan-favourites: each team casts **1 vote, changeable any time**. Results visible on the **admin panel** and **public scoreboard** only — participants do not see other teams' votes inside their own UI (they only see their own current pick).
- Timed boxes: each square may optionally have a **release time (`releaseAt`)** AND a **manual override** (`manuallyReleased`). The tile shows a "Coming soon" placeholder until either condition unlocks it. Admins manage on `/admin/game`.

## 1. Make sure the game is able to start

Symptom: the original report is that the game can't be opened. Likely causes:
- The singleton `gameState` row hasn't been inserted (only `seed:seedAll` inserts it; `gameState.get` returns `null`, and `setOpen` calls `ensureGameRow` which is fine — so this isn't the blocker on its own).
- `ORGANISER_NAMES` (Convex env) not set or doesn't match the mentor's typed name → `assertOrganiser` throws with a generic "restricted to organisers" message.
- The admin user typed a name that differs in case/whitespace from `ORGANISER_NAMES`.

Fixes:
- `convex/admin.ts`: in `assertOrganiser`, throw a more diagnostic error when `ORGANISER_NAMES` is **empty** (treat empty as "everyone is an organiser" during bootstrap is risky — instead, emit `ORGANISER_NAMES is not configured on the Convex deployment` so the operator knows why).
- `convex/gameState.ts`: expose a `bootstrap` mutation gated on `assertAdmin` only (no organiser check) so that an admin can force-create the `gameState` row and open the game even if `ORGANISER_NAMES` is misconfigured. Use sparingly.
- `src/pages/admin/GameControls.tsx`: surface the *actual* error string instead of a generic toggle-failed (already does this) and add a small "Why can't I see the open/close button?" hint when `isOrganiser(name)` is false (shows the configured organiser list — read from `import.meta.env.VITE_ORGANISER_NAMES`).
- `src/pages/admin/AdminLogin.tsx`: trim name on save (already does); add a hint reminding the user the name must match `VITE_ORGANISER_NAMES` (case-insensitive).

No schema change required.

## 2. Fan-favourites voting

### Schema
Add table `fanVotes`:

```ts
fanVotes: defineTable({
  voterTeamId: v.id('teams'),
  votedTeamId: v.id('teams'),
})
  .index('by_voter', ['voterTeamId'])
  .index('by_voted', ['votedTeamId'])
```

There is **exactly one row per voter team** (upsert in the mutation). `votedTeamId !== voterTeamId` is enforced server-side.

### Convex API
New module `convex/fanVotes.ts`:
- `getMyVote(teamId)` query — returns the row for this team or `null`.
- `tally()` query — returns `[{ teamId, votes }]` sorted desc; joins to `teams` so the scoreboard can render. Read by admin + scoreboard.
- `castVote(teamId, votedTeamId)` mutation — verifies `votedTeamId !== teamId`, asserts both teams exist, upserts. Does **not** require `assertGameOpen` (voting can run independently — keep it loose so it works even when the game closes for the draw).

### Frontend
- `src/pages/TeamHome.tsx`: add a `FanFavCard` component below the bingo grid (above the "Project submission / Scoreboard" pair). Shows a single dropdown of all teams except yourself, with the current selection highlighted. On change, immediately calls `castVote`. Shows "Your vote: ___" once cast, with a "Change" affordance. Self-vote impossible by construction (filtered from the dropdown).
- `src/pages/Scoreboard.tsx`: under the leaderboard, add a "Fan favourites" mini-leaderboard (top 5) using `api.fanVotes.tally`.
- `src/components/AdminLayout.tsx`: new tab `Fan favs` → `/admin/fanfavs`.
- New page `src/pages/admin/FanFavs.tsx`: lists `tally()` with vote counts + who voted for whom (drill-down using `by_voted` index).

No vote weight or game-open dependency. Anti-cheat is honour-only — one vote per team token already enforced.

## 3. Blue squares — distinct *teams*, not distinct *colours*

Current rule (in `convex/completions.ts::checkBlueColourRule`): across the 4 blue squares, no two scans share the same team **colour group**.
New rule: across the 4 blue squares, no two scans may be the **same team**.

### Changes
- Rename `checkBlueColourRule` → `checkBlueDistinctTeamRule` (or just rewrite in place). The new check: iterate other blue completions and compare `scannedTeamId === args.scannedTeamId`; if match, throw "You've already used this team for a blue square — each blue square needs a different team."
- `enforceColourDistinct` field on `bingoSquares` is now semantically "enforce-distinct-scanned-team". Keep the field name to avoid a wider rename (note in comment); alternative is to rename to `enforceDistinctTeam` — see "Optional polish" below.
- `convex/seed.ts`: the blue square *descriptions* still say "Ask another team …" — fine. Update the helper copy in `src/pages/SquareDetail.tsx::ScanTeamWithAnswerFlow` from "you must use teams of **4 different colours**" → "you must scan **4 different teams**".
- Update the error string thrown from the server to match.

Optional polish: rename `enforceColourDistinct` → `enforceDistinctTeam` across schema, seed, completions, types. Doable but touches more files; defer unless trivial.

## 4a. Orange squares: self-declared eligibility

### Concept
Today, anyone can scan any team for any orange square — the honour-code is "they say yes". The new model:
1. A team **self-declares** they qualify for an orange square (e.g. "we have dark mode").
2. A mentor **approves** that self-declaration on the admin panel.
3. Only then can *other* teams scan them for that square.

### Schema
Add table `teamEligibility`:

```ts
teamEligibility: defineTable({
  teamId: v.id('teams'),
  squareId: v.id('bingoSquares'),
  status: v.union(v.literal('pending'), v.literal('approved'), v.literal('rejected')),
  approvedByMentor: v.optional(v.string()),
  approvedAt: v.optional(v.number()),
  rejectedReason: v.optional(v.string()),
})
  .index('by_team', ['teamId'])
  .index('by_team_and_square', ['teamId', 'squareId'])
  .index('by_status', ['status']),
```

### Convex API
New module `convex/eligibility.ts`:
- `listForTeam(teamId)` query — used by participant UI to see which orange squares they've declared.
- `declare(teamId, squareId)` mutation — upserts `pending` row. No passcode (team-only action).
- `listPending()` query — admin view of pending declarations.
- `approve(passcode, mentorName, eligibilityId)` mutation — sets status `approved`, audit log.
- `reject(passcode, mentorName, eligibilityId, reason)` mutation — sets status `rejected`, audit log.

Add to `mentorActionKind` literal union: `'approve_eligibility' | 'reject_eligibility'`.

### Cross-check on scan
`convex/completions.ts::submitScanTeam`:
- Look up the square. If `category === 'orange'`, verify that an approved `teamEligibility` row exists for `(scannedTeamId, squareId)`. If not, throw: "That team hasn't been verified for this challenge yet."
- Exception: a team scanning **itself** is rejected with: "Orange squares need to be completed by scanning a *different* team — declare your own eligibility instead."

(`scan_team_with_answer` is blue; eligibility check does not apply.)

### Participant UI
New section in `src/pages/TeamHome.tsx` ("Your eligibilities") OR a dedicated route `/t/:token/declare`:
- For each orange square, a button: "Declare we qualify for this." Shows current status (`none / pending / approved / rejected (+ reason)`).
- Recommended: new compact card on TeamHome, below the bingo grid, listing the 6 orange squares with three states (none → "Declare" button, pending → "Awaiting mentor", approved → "Approved ✓", rejected → reason).

### Admin UI
`/admin/queue` is already a single queue for completions. Two options:
- (A) Add eligibility items to the *same* page, distinguished by a label.
- (B) New page `/admin/eligibility`, linked from the nav.

Decision: **(A)** — extend `convex/completions.ts::listPending` to also include pending eligibility rows, OR add a second `useQuery(api.eligibility.listPending)` to `ApprovalQueue.tsx`. Implementation: add a second `useQuery` in `ApprovalQueue.tsx` and render two sections (Completions / Eligibility). Less code churn than merging.

## 4b. Timed squares (release time + manual override)

### Schema
Extend `bingoSquares`:

```ts
bingoSquares: defineTable({
  position: v.number(),
  category: squareCategory,
  title: v.string(),
  description: v.string(),
  verificationKind,
  enforceColourDistinct: v.boolean(),
  // NEW:
  releaseAt: v.optional(v.number()),         // ms epoch; unset = released by default
  manuallyReleased: v.optional(v.boolean()), // override; true = unlock regardless of releaseAt, false = leave to releaseAt
})
```

A square is "released" iff:
- `manuallyReleased === true`, **OR**
- `releaseAt` is `undefined`, **OR**
- `Date.now() >= releaseAt`.

If `manuallyReleased === false` is explicitly set, force-lock regardless of clock. (Allow admin to pre-lock a square they want to delay.)

### Helper
`src/lib/squares.ts` — new file. Exports `isSquareReleased(square, now = Date.now()): boolean`. Used by frontend and (server-side) Convex modules.

Server-side helper duplicated in `convex/lib.ts` (Convex modules can't import from `src/`).

### Submission gate
In `convex/completions.ts`, every `submitXxx` mutation: after `assertGameOpen`, also `assertSquareReleased`. Throws "This square isn't unlocked yet. Check back later." if locked.

### Admin UI
`src/pages/admin/GameControls.tsx`:
- New section "Timed squares".
- Lists all squares. For each: shows current state (Released / Locked, with reason), an `<input type="datetime-local">` for `releaseAt`, and Lock / Unlock / Clear buttons.
- Backend: `convex/squares.ts::adminUpdateSchedule(passcode, mentorName, squareId, releaseAt?, manuallyReleased?)` — admin-only mutation.

### Participant UI
`src/components/SquareCell.tsx`:
- New prop `locked: boolean`. When locked, render a "Coming soon ⏳" tile (greyed, ring-bh-dim) with no link (just a `<div>` not `<Link>`).
- `src/components/BingoGrid.tsx` computes `locked` per square via `isSquareReleased` and passes it down.
- `src/pages/SquareDetail.tsx` redirects to TeamHome if accessed for a locked square (or shows a "Coming soon" copy with no submit UI).
- `src/lib/lines.ts` / `src/lib/standings.ts` are unaffected: a square not yet released simply can't be completed, so it won't appear in `completedPositions`. The line won't form until it's released. **OK by design**.

## 5. Team categories (`cat1` / `cat2`) + Innovative-use-of-AI square

### Schema
Extend `teams`:

```ts
teams: defineTable({
  name: v.string(),
  colour: teamColour,
  token: v.string(),
  category: v.optional(v.union(v.literal('cat1'), v.literal('cat2'))),
})
```

Optional initially (existing teams default to `cat1` for backwards compat) — but admin UI requires it for new teams. Add a `teamCategory` validator export in `convex/schema.ts`.

Extend `bingoSquares` with `restrictToCategory: v.optional(v.union(v.literal('cat1'), v.literal('cat2')))`. When set, only teams of that category see this square (others see a "Locked for your category" placeholder tile).

### Seed change
Replace one existing orange square with **"Innovative use of AI"** (`category: 'orange'`, `restrictToCategory: 'cat1'`, `verificationKind: 'scan_team'`). Candidate to replace: position 15 ("User onboarding") — least overlap, the grid keeps 16 squares.

Better: leave the existing 16 alone, **bump** the AI square in as a category-locked variant by replacing one orange position. Final call in the implementation step. Will document final position in the seed file comments.

### Server gate
In `convex/completions.ts`, before submission, check: if `square.restrictToCategory` set and team's category mismatches, throw "This square isn't part of your category."

### Participant UI
`src/components/SquareCell.tsx`:
- Add another lock mode: `categoryLocked: boolean`. Renders "Locked — not for your category" with a distinct subtle style (dimmed, no `<Link>`). Different from "Coming soon" timed-lock visually so participants don't think it's coming.

Computed in `BingoGrid.tsx`:
```ts
const categoryLocked = !!sq.restrictToCategory && sq.restrictToCategory !== team.category
```

### Line counting
**Important decision**: should a category-locked square count as auto-complete for line-counting (so cat2 still has a path to bingo) or block any line that crosses it (cat2 effectively loses any line through that position)?

Default: **treat as auto-complete for cat2** — otherwise cat2 has fewer possible lines, which is unfair for the lucky draw. Implementation: in `src/lib/lines.ts::countCompletedLines` and `src/lib/standings.ts`, treat `restrictToCategory && restrictToCategory !== team.category` as "filled". (Server-side `convex/draw.ts` needs the same logic — it duplicates the line-count.)

### Admin UI
`src/pages/admin/TeamsManage.tsx`:
- Add a `<select>` for category when creating a team (default `cat1`).
- Show category beside team name in the list.
- New mutation `convex/teams.ts::setCategory(passcode, mentorName, teamId, category)`.

## 6. File map (touched files)

```
convex/schema.ts                       (1,2,4a,4b,5) — new tables + new fields
convex/admin.ts                        (1) — clearer org-not-configured error
convex/gameState.ts                    (1) — bootstrap mutation
convex/completions.ts                  (3,4a,4b,5)
convex/seed.ts                         (4b,5) — releaseAt seeds (optional), AI square
convex/squares.ts                      (4b) — adminUpdateSchedule
convex/teams.ts                        (5) — setCategory
convex/eligibility.ts                  (4a) — NEW module
convex/fanVotes.ts                     (2) — NEW module
convex/draw.ts                         (5) — line-count treats category-locked as filled
convex/scoreboard.ts                   (2) — bundle fan-fav tally + eligibility(?) optional
convex/_generated/*                    auto-regenerated via `npx convex dev`

src/lib/types.ts                       (2,4a,4b,5)
src/lib/squares.ts                     (4b) — NEW helper
src/lib/lines.ts                       (5) — auto-fill category-locked
src/lib/standings.ts                   (5) — same
src/lib/admin.ts                       (1) — surface configured organiser list

src/components/BingoGrid.tsx           (4b,5)
src/components/SquareCell.tsx          (4b,5) — locked + categoryLocked
src/components/AdminLayout.tsx         (2) — Fan favs nav tab

src/pages/TeamHome.tsx                 (2,4a) — vote card, declarations card
src/pages/SquareDetail.tsx             (3,4b) — copy update, locked redirect
src/pages/Scoreboard.tsx               (2) — fan-fav mini-leaderboard
src/pages/admin/AdminLogin.tsx         (1) — organiser hint
src/pages/admin/GameControls.tsx       (1,4b) — bootstrap button, timed-squares panel
src/pages/admin/ApprovalQueue.tsx      (4a) — eligibility section
src/pages/admin/TeamsManage.tsx        (5) — category picker + setter
src/pages/admin/FanFavs.tsx            (2) — NEW page
src/App.tsx                            (2) — /admin/fanfavs route
```

## 7. Order of execution

1. **Plan committed** (this file).
2. Schema additions in `convex/schema.ts` (`fanVotes`, `teamEligibility`, new fields on `teams` + `bingoSquares`, extended `mentorActionKind`).
3. Convex modules: `fanVotes.ts`, `eligibility.ts`, helpers in `completions.ts`, `gameState.ts` bootstrap, `squares.ts` schedule, `teams.ts` category, `draw.ts` line-count update.
4. Seed file: add AI square (position decision), ensure schema-compatible defaults for existing rows (no `releaseAt`/`manuallyReleased`/`restrictToCategory` set → backwards-safe).
5. Shared helpers in `src/lib/`.
6. Components (`SquareCell`, `BingoGrid`).
7. Pages (TeamHome, SquareDetail, Scoreboard, admin pages).
8. Routes in `App.tsx`.
9. `npm run build` to type-check.
10. Document any env / re-seed steps in commit message + CLAUDE.md.

## 8. Re-seed + env steps the operator must run after deploy

```bash
# Re-deploy schema + functions
npx convex dev   # or `npx convex deploy` in CI

# Re-seed with the new AI square + ensures gameState exists
npx convex run seed:seedAll '{ "passcode": "change-me" }'

# (Optional) Make sure ORGANISER_NAMES is set so /admin/game can open the game
npx convex env set ORGANISER_NAMES 'YJ,Marcus'
```

## 9. Open questions / explicit non-goals

- Fan-fav vote weight: 1 each, equal weight (decided).
- Eligibility for **blue / grey / wild** squares: out of scope. Only orange ("find a team that did X") needs declared eligibility per the brief.
- Cat2 line-count behaviour: auto-fill category-locked squares so cat2 can still win the lucky draw. Open to revision if the user prefers the inverse.
- We are *not* adding granular per-mentor permissions for the new admin actions; existing passcode + audit-log model is reused.
