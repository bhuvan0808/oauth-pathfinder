# Instructions for Claude Code

This repo is a take-home submission: an OAuth-app readiness guide generator (Next.js 14, App Router, TypeScript, Tailwind, Anthropic SDK with server-side `web_search` + `web_fetch` tools). Read [README.md](./README.md) first, then [VERIFICATION.md](./VERIFICATION.md).

## Current state (30 Oct 2026)

- **Deployed:** https://oauth-pathfinder-blue.vercel.app, Vercel project `oauth-pathfinder`, connected to https://github.com/bhuvan0808/oauth-pathfinder so pushes to `main` auto-deploy.
- **Mode:** `MOCK_AGENT=1` and `GENERATE_RATE_LIMIT=10` are set in production. No `ANTHROPIC_API_KEY` has ever been used; the live-model path is unverified.
- **Checks that pass:** `npm run typecheck`, `npm run guide:validate`, `npm run build`, `npm run guide:linkcheck` (47 URLs, 0 failing).
- **Demo fixtures:** `lib/agent/mock.ts` (Linear, Notion, HubSpot, Cal.com, Mercury, Resend) and `lib/agent/mockFixturesExtra.ts` (Zoom, Discord, Dropbox, Salesforce, Stripe) plus a generic low-confidence fallback. In demo mode `lib/store.ts` rebuilds a missing live guide on a cache miss (fixture delays skipped) so deep links survive serverless cold starts; the generate route opts out of that so fresh requests still stream.
- **Agent-facing surface:** `GET /api/health`, `GET /api/guides`, `public/llms.txt`, `AGENTS.md`, `docs/guide.schema.json`. The documentation set is indexed in `docs/README.md`; keep it in sync when you change behaviour (and add a line to `CHANGELOG.md`).
- **UI:** visual language modelled on composio.dev (tokens in `tailwind.config.ts` and `app/globals.css`). Geist fonts come from the `geist` package; Instrument Serif from `next/font/google`.

## If asked to switch to live research

1. Add the key: `printf '%s' "$ANTHROPIC_API_KEY" | vercel env add ANTHROPIC_API_KEY production`, then `vercel env rm MOCK_AGENT production --yes`, then `vercel --prod`. Locally: put the key in `.env.local` and delete the `MOCK_AGENT` line.
2. Run `npm run guide:generate -- Linear` first and watch for:
   - Activity events not appearing: check that `stream.on("contentBlock")` in `lib/agent/client.ts` receives `server_tool_use` / `web_search_tool_result` / `web_fetch_tool_result` blocks with the installed `@anthropic-ai/sdk`. If not, also derive activity and visited URLs from `final.content` after `finalMessage()`.
   - Tool type names or the beta header being rejected: check the current Anthropic docs for the `web_search` and `web_fetch` tool versions and update `client.ts`.
   - JSON validation failing twice: improve the normalisation block in `lib/agent/pipeline.ts` or the prompt wording. Do **not** relax the integrity rules in `lib/schema.ts`.
3. Then generate HubSpot, `https://cal.com`, Mercury, Resend and one obscure SaaS. Candidates land in `data/candidates/` (gitignored); promote with `--promote` only after a human diff.
4. Add Upstash (`UPSTASH_REDIS_REST_URL` / `_TOKEN`) so live guides survive cold starts, and update the "What was tested" section of the README with real durations and failures.

## Do not

- Do not rewrite the curated guides' facts, difficulty scores, time ranges or evidence levels in `data/guides/`. They were checked against the sources listed in VERIFICATION.md. Fix only broken URLs (update URL and title, keep the claim), typos, or things the user explicitly reports from a manual attempt.
- Do not touch VERIFICATION.md section 4 (manual attempts); the user fills that in.
- Do not relax `lib/schema.ts` integrity rules (documented and reported claims must cite a source; "tested" is reserved for real attempts). If the model keeps failing validation, improve the prompt or normalisation, not the rule.
- Do not change the Tested / Documented / Reported / Inferred vocabulary or the two-clocks model; the README, VERIFICATION.md and the UI depend on them.
- Do not commit `.env.local`, `.vercel/`, `data/candidates/*.json` or any key. `.gitignore` already excludes them. Never put a token in a git remote URL; push with a one-off `http.extraHeader`.
- Do not add `localStorage` reliance or client-side API keys.
- Do not present fixture output as live research: every mock guide must keep the `DEMO MODE` prefix in `verification.notes`, which drives the UI banner.

## Where things are

- Pipeline: `lib/agent/pipeline.ts` (stages, events), `lib/agent/prompts.ts` (all prompts), `lib/agent/probe.ts` (real HTTP checks), `lib/agent/client.ts` (Anthropic calls; model via `ANTHROPIC_MODEL`, default `claude-sonnet-4-5`), `lib/agent/mock.ts` (demo fixtures).
- SSE route: `app/api/generate/route.ts` (`maxDuration = 300`). Client: `components/ProgressLog.tsx`. Read endpoints: `app/api/guides/route.ts`, `app/api/guides/[slug]/route.ts`, `app/api/health/route.ts`.
- Schema and integrity checks: `lib/schema.ts` (`parseGuide`).
- Guide rendering: `components/GuideView.tsx`, `components/TwoClocks.tsx`, `components/Badges.tsx`.
- Markdown export: `lib/markdown.ts`.
- Storage: `lib/store.ts` (files for curated; Upstash or memory for live; demo rebuild on miss).
- Docs assets: `docs/banner.svg`, `docs/screenshots/`, `docs/attempts/` (manual-attempt screenshots, no secrets).

## Good next increments, in order of value

1. A Playwright or Browserbase probe that opens the provider's "create app" form and reports the fields it asks for, feeding "tested" evidence.
2. Batch generation of 20 more guides via `npm run guide:generate` with a review diff.
3. Upstash Ratelimit instead of the in-memory limiter.
