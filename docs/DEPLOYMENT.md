# Deployment and operations

How to run OAuth Pathfinder locally, deploy it to Vercel, switch it from demo to live research, and what to watch in production.

## 1. Local

Requirements: Node 18.17+ (tested on Node 24), npm.

```bash
git clone https://github.com/bhuvan0808/oauth-pathfinder.git && cd oauth-pathfinder
npm install
cp .env.example .env.local
# either:  ANTHROPIC_API_KEY=sk-ant-...   (live research)
# or:      MOCK_AGENT=1                   (demo mode, no key)
npm run dev          # http://localhost:3000
```

Checks:

```bash
npm run typecheck
npm run guide:validate
npm run build
npm run guide:linkcheck
```

## 2. Environment variables

| Variable | Scope | Default | Purpose |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | server | none | Enables live research. Without it and without `MOCK_AGENT=1`, `/api/generate` returns 500. |
| `ANTHROPIC_MODEL` | server | `claude-sonnet-4-5` | Must support the `web_search` and `web_fetch` server tools. |
| `MOCK_AGENT` | server | unset | `1` = demo mode with fixtures. Set on the deployment. |
| `COMPOSIO_API_KEY` | server | none | Lets the probe stage and the guide page ask Composio whether a managed OAuth app exists. |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | server | none | Persistent live cache. Without them, memory per serverless instance. |
| `GENERATE_KEY` | server | none | Shared secret to gate `/api/generate` (`x-generate-key` header or `?key=`). |
| `GENERATE_RATE_LIMIT` | server | `6` | Generations per hour per IP. `10` on the deployment. |
| `NEXT_PUBLIC_REPO_URL` | build | GitHub repo | The GitHub link in the header. |

Never commit `.env.local`; it is gitignored. Pipe values into `vercel env add` so they never appear in shell history or logs.

## 3. Vercel

The deployment lives in Vercel project `oauth-pathfinder` (team "Bhuvan's projects") and is connected to the GitHub repository, so every push to `main` builds and promotes a production deployment automatically. Production URL: https://oauth-pathfinder-blue.vercel.app (the bare `oauth-pathfinder.vercel.app` name was taken).

First-time setup from a clean machine:

```bash
npm i -g vercel
vercel link --yes --scope <team-slug> --project oauth-pathfinder --token "$VERCEL_TOKEN"
printf '1'  | vercel env add MOCK_AGENT production --token "$VERCEL_TOKEN"
printf '10' | vercel env add GENERATE_RATE_LIMIT production --token "$VERCEL_TOKEN"
vercel --prod --yes --token "$VERCEL_TOKEN"
```

Notes:

- `vercel link` needs `--scope` when run non-interactively.
- `app/api/generate/route.ts` declares `maxDuration = 300`. Vercel accepted it on the Hobby plan (Fluid Compute allows up to 300 s), so a 1–3 minute live run fits. If a future plan change rejects it, reduce the search and fetch budgets in `lib/agent/pipeline.ts` rather than the timeout.
- `.vercel/` is gitignored.

## 4. Switching the deployment to live research

```bash
printf '%s' "$ANTHROPIC_API_KEY" | vercel env add ANTHROPIC_API_KEY production
vercel env rm MOCK_AGENT production --yes
vercel --prod
```

Then run the first-run checklist in [CLAUDE.md](../CLAUDE.md): generate Linear from the CLI and watch for missing activity events (SDK event names), rejected tool types or beta header, and repeated validation failures. Add Upstash before inviting traffic so generated guides survive cold starts, and consider `GENERATE_KEY` if the endpoint is public.

Optional but recommended: `COMPOSIO_API_KEY` (free at platform.composio.dev) so guides can say "Composio already manages this; you may not need your own app".

## 5. Costs

| Item | Cost |
|---|---|
| Demo generation | $0 |
| Live generation | ~5 model calls, ~12 searches, ~8 fetches: roughly $0.30–$0.80 depending on how much the model reads |
| Vercel | Hobby plan sufficed for the demo |
| Upstash | Free tier is enough for a cache of guides |

## 6. Observability

- `GET /api/health`: mode, cache type, whether Composio and a generate key are configured, rate limit, curated slugs, demo apps.
- Vercel function logs show pipeline errors (`Demo-mode rebuild failed for …`, validation failures) and probe failures.
- `npm run guide:linkcheck` in CI catches moved provider pages.

## 7. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Guide page 404 right after a successful generation | Live cache is in memory per serverless instance | Demo mode rebuilds on a miss (already in place). For live mode add Upstash. |
| `POST /api/generate` returns `{"cached": true}` instead of streaming | A curated or cached guide exists | Pass `"force": true` or `/generate?q=…&force=1`. |
| Progress log arrives all at once | A proxy buffered the SSE | The route sends `x-accel-buffering: no`, `cache-control: no-transform` and keep-alive comments; confirmed streaming on `next dev` and on Vercel. Check intermediaries. |
| 429 on generate | Per-IP hourly limit | Raise `GENERATE_RATE_LIMIT` or wait; cached and curated guides are never limited. |
| 500 "ANTHROPIC_API_KEY is not configured" | Neither key nor demo mode | Set one of them. |
| Activity events missing in live mode | SDK event names for server tools changed | See the checklist in CLAUDE.md; derive activity from `final.content` after `finalMessage()`. |
| Draft fails validation twice | Model JSON drift | Improve the normalisation block in `lib/agent/pipeline.ts` or the prompt; do not relax `lib/schema.ts`. |
