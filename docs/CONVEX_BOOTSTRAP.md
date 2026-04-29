# Convex bootstrap

The Convex backend code lives in `convex/`. To bring up a deployment for the first time:

```bash
npx convex dev
```

The CLI will:
1. Prompt for a Convex login.
2. Create a new project (or link to an existing one).
3. Generate `convex/_generated/` (auto-generated TS types — gitignored locally for now; once stable, commit these).
4. Push the schema and functions.
5. Watch for changes and hot-reload them on save.

Leave `npx convex dev` running while developing — it deploys every file save to the cloud.

## Required environment variables (Convex side)

Set these via `npx convex env set`:

```bash
npx convex env set ADMIN_PASSCODE 'your-passcode'
npx convex env set ORGANISER_NAMES 'YJ,Marcus'
```

These are read inside Convex functions via `process.env.ADMIN_PASSCODE` and `process.env.ORGANISER_NAMES`. They never reach the client.

## Required environment variables (frontend side)

After running `npx convex dev`, copy the deployment URL it prints into `.env`:

```
VITE_CONVEX_URL=https://your-deployment-name.convex.cloud
```

## Seeding the 16 bingo squares

After the first deploy, call the seed mutation (idempotent — safe to re-run):

```bash
npx convex run seed:seedAll '{ "passcode": "<your-passcode>" }'
```

This inserts the 16 bingo squares and ensures a singleton `gameState` row exists. Re-running updates existing squares to match the canonical seed (useful if you tweak square copy).

## Deploying to production

```bash
npx convex deploy
```

Set the production env vars and a deploy hook in your hosting environment (Netlify env vars need `VITE_CONVEX_URL` to point at the prod deployment).

## File structure

```
convex/
├── schema.ts              all tables + indexes + shared validators
├── teams.ts               list, getByToken, create, regenerateToken
├── squares.ts             list (16 squares, sorted by position)
├── completions.ts         submitX mutations (one per verification kind),
│                          listForTeam, listPending (with hydrated team/square/photoUrl)
├── photos.ts              recent (with hydrated public URLs)
├── codeSubmissions.ts     getForTeam, listAll, save (upsert)
├── gameState.ts           get, setOpen
├── draw.ts                run (weighted random), clearWinners
├── scoreboard.ts          bundle (one query for the whole TV view)
├── upload.ts              generateUploadUrl mutation for storage
├── githubCheck.ts         action (server-side fetch to GitHub REST)
├── admin.ts               assertAdmin, assertOrganiser, approve/reject mutations
├── mentorActions.ts       logMentorAction helper used across mutations
├── seed.ts                idempotent seedAll mutation for the 16 squares
└── _generated/            auto-generated, never edit by hand
```

## Trust model

- All mutations that change game state require an `passcode` argument (the shared `ADMIN_PASSCODE`).
- Organiser-only actions (open/close game, run draw) additionally require the mentor name to be in `ORGANISER_NAMES`.
- Team-side mutations (`submit*`) currently take only the `teamId` directly. The token-in-URL is still the soft access control on the client; if we want to harden, the team token should be passed and validated in each mutation. (Follow-up task — see `docs/HANDOVER.md`.)
- The blue-square colour-distinct rule is now enforced *server-side* in `completions.ts` rather than client-side.
