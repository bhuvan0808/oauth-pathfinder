# AGENTS.md

A map of this repository for AI agents and new contributors. Everything here is also linked from [docs/README.md](./docs/README.md); the live site serves a shorter version at `/llms.txt`.

## What this is

OAuth Pathfinder answers one question per provider: **will getting an OAuth app ready for production take an hour or a quarter, and what will block it?** It is a Next.js 14 app with a curated, human-verified library of guides and an agent pipeline that investigates any app by name or URL and streams a schema-validated guide.

- Live: https://oauth-pathfinder-blue.vercel.app (demo mode, see below)
- Repo: https://github.com/bhuvan0808/oauth-pathfinder
- Context: Composio APM Integrations take-home. The brief is summarised in [docs/EXECUTIVE_SUMMARY.md](./docs/EXECUTIVE_SUMMARY.md).

## Vocabulary you must keep

- **Two clocks**: `timeToDevReady` (token for yourself) and `timeToProduction` (any user can connect, including approval waits).
- **Owners**: `agent` | `you` | `either` on every step and prerequisite.
- **Evidence levels**: `tested` | `documented` | `reported` | `inferred`. Documented, reported and tested claims must cite a source id; inferred may not. Enforced by `parseGuide` in `lib/schema.ts`.
- **Difficulty 1–5**: trivial, easy, moderate, hard, gated. Rubric in [docs/GUIDE_SCHEMA.md](./docs/GUIDE_SCHEMA.md).

## Modes

| Mode | How | What happens |
|---|---|---|
| **Demo** (deployed) | `MOCK_AGENT=1` | `lib/agent/mock.ts` + `lib/agent/mockFixturesExtra.ts` answer the model calls with hand-written fixtures for Linear, Notion, HubSpot, Cal.com, Mercury, Resend, Zoom, Discord, Dropbox, Salesforce and Stripe; any other app gets a generic all-inferred guide. Probes (`lib/agent/probe.ts`) are real HTTP requests. Guides carry `verification.notes` starting with `DEMO MODE` and the UI shows a banner. |
| **Live** | `ANTHROPIC_API_KEY` set, no `MOCK_AGENT` | `lib/agent/client.ts` calls the Anthropic Messages API with server-side `web_search` and `web_fetch`. Works for any app; not yet exercised end to end (no key was available). Checklist in [CLAUDE.md](./CLAUDE.md). |

`GET /api/health` reports the current mode.

## Where things are

```
app/
  page.tsx                 home: hero, submit box, curated library, how it works
  generate/page.tsx        /generate?q=...  streams the run (components/ProgressLog.tsx)
  guide/[slug]/page.tsx    renders a guide (components/GuideView.tsx)
  api/generate/route.ts    POST, SSE; rate limit; cache pre-check; maxDuration = 300
  api/guides/route.ts      GET index of all guides
  api/guides/[slug]/route.ts  GET guide JSON or ?format=md
  api/health/route.ts      GET mode and configuration (no secrets)
  layout.tsx, globals.css  fonts (Geist, Instrument Serif), palette, motion
components/                GuideView, TwoClocks, Badges, ProgressLog, SubmitBox, LibraryGrid, CopyButton
lib/
  schema.ts                zod schema + integrity checks (parseGuide); GUIDE_SHAPE_FOR_PROMPT
  format.ts                labels, duration maths, log-scale clock positions, slugify
  store.ts                 curated loader; live cache (Upstash or memory); demo rebuild on miss
  markdown.ts              Markdown export
  enrich.ts                fills composioManaged at render time when COMPOSIO_API_KEY is set
  agent/pipeline.ts        the five stages and the event stream
  agent/prompts.ts         every prompt (domain primer, resolve, investigate, synthesize, verify)
  agent/probe.ts           RFC 8414 / OIDC discovery, developer-portal reachability, Composio lookup
  agent/client.ts          Anthropic calls; swaps to mock when MOCK_AGENT=1
  agent/json.ts            tolerant JSON extraction from model output
  agent/mock.ts            demo fixtures (6) + generic fallback + audit simulation
  agent/mockFixturesExtra.ts  demo fixtures (5 more)
data/guides/*.json         curated guides (human-verified; do not change facts)
data/candidates/           CLI output for review (gitignored)
scripts/                   generate.ts (CLI), validate.ts, linkcheck.ts
docs/                      documentation set, banner, screenshots, JSON Schema
public/llms.txt            agent-facing summary served by the site
```

## Commands

```bash
npm install
npm run dev                         # http://localhost:3000
npm run typecheck                   # tsc --noEmit
npm run build                       # next build
npm run guide:validate              # schema + integrity on data/guides/*.json
npm run guide:linkcheck             # fetch every source URL in the curated guides
MOCK_AGENT=1 npm run guide:generate -- "Zoom"      # demo run -> data/candidates/zoom.json
npm run guide:generate -- "Pipedrive"              # live run (needs ANTHROPIC_API_KEY)
```

## Guardrails

1. Do not change facts, difficulty scores, time ranges or evidence levels in `data/guides/*.json`. Only fix moved URLs (keep the claim, update url and title) or typos. Record what you changed in [VERIFICATION.md](./VERIFICATION.md).
2. Do not relax the integrity rules in `lib/schema.ts`. If model output fails validation, improve `lib/agent/prompts.ts` or the normalisation block in `lib/agent/pipeline.ts`.
3. Do not rename the evidence levels, owners or the two clocks; the README, VERIFICATION.md, the UI and the Markdown export all depend on them.
4. Keep every demo guide labelled: `verification.notes` must start with `DEMO MODE`.
5. Never commit `.env.local`, `.vercel/`, `data/candidates/*.json` or any key. Push with a one-off `git -c http.extraHeader=...`, never a token in the remote URL.
6. Do not add client-side API keys or `localStorage` reliance.
7. Do not touch VERIFICATION.md section 4; the author fills in the manual attempts.

## How to verify a change

- Guide data or schema: `npm run guide:validate`, then open `/guide/google-gmail` and `/api/guides/google-gmail?format=md`.
- Pipeline or fixtures: `MOCK_AGENT=1 npm run guide:generate -- Linear` (exercises retry, source-dropping and audit) and one unknown app (exercises the generic fallback).
- SSE: `curl -N -X POST localhost:3000/api/generate -H 'content-type: application/json' -d '{"query":"Notion","force":true}'` and watch events arrive incrementally.
- UI: `npm run build && npm start`, check `/`, a guide page and `/generate?q=Mercury&force=1` at desktop width and at 390 px.

## Reading order for a full understanding

1. [README.md](./README.md), then the [live site](https://oauth-pathfinder-blue.vercel.app).
2. [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) and [docs/GUIDE_SCHEMA.md](./docs/GUIDE_SCHEMA.md).
3. `lib/agent/prompts.ts` (the domain primer explains the mental model) and `lib/agent/pipeline.ts`.
4. [VERIFICATION.md](./VERIFICATION.md) for what is known versus inferred.
5. [docs/DECISIONS.md](./docs/DECISIONS.md) and [docs/ROADMAP.md](./docs/ROADMAP.md).
