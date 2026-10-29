# OAuth Pathfinder

**Live:** `https://YOUR-DEPLOYMENT.vercel.app` · **Repo:** `https://github.com/YOUR_HANDLE/oauth-pathfinder`

Before an AI agent's users can connect an app, the developer usually has to register an OAuth app with the provider and sometimes get it approved. The real question developers ask is not "how do I create the app" but **"will this take an hour or a quarter, and what is going to block me?"** OAuth Pathfinder answers that question per provider: a curated library of readiness guides, plus an agent that investigates any app you name and produces a shareable guide live.

Submitted for the Composio APM Integrations take-home.

## What a guide gives you

Every guide, curated or live-generated, has the same shape:

| Section | What it answers |
|---|---|
| **TL;DR + difficulty (1–5)** | The thing you screenshot for your team. 1 = create app, done. 5 = a paid tier, security assessment, business verification or partner program stands between you and production. |
| **Two clocks** | *Dev-ready*: time until you can get a token for yourself. *Production*: time until any user can connect without caps, warnings or admin consent, including approval waits. Shown on one log-scale bar so the gap is obvious. |
| **Blockers** | Hard (cannot ship without) vs soft (slows you). |
| **Path 1 / Path 2** | Steps to dev-ready, then steps to production. Each step is labelled **Agent** (research, drafting values, choosing scopes, writing justifications) or **You** (login, terms, payment, business verification, recording a video, clicking submit), with effort, console location and pre-filled values. |
| **Requirements, gotchas, when stuck** | Privacy policy, verified domain, demo video, assessments; the traps; the escalation path. |
| **Evidence on every claim** | **Tested** (actually attempted), **Documented** (official docs, linked), **Reported** (community/vendor posts), **Inferred** (the agent's best reading; verify). |
| **What we could and couldn't verify** | Corrections made during the audit pass, items left as inferred, open questions. |

Guides are shareable by URL, as Markdown (`/api/guides/<slug>?format=md`, paste into Slack/Notion/an agent's context) and as JSON (`/api/guides/<slug>`).

## Setup

```bash
git clone <repo> && cd oauth-pathfinder
npm install
cp .env.example .env.local      # add ANTHROPIC_API_KEY (required); COMPOSIO_API_KEY and Upstash are optional
npm run dev                     # http://localhost:3000
```

No API key yet? Set `MOCK_AGENT=1` in `.env.local` and the pipeline runs on fixture responses (a realistic Linear guide, including a deliberately broken first draft and an invented source so you can watch the retry, source-dropping and verification paths work). The resulting guide is labelled MOCK MODE. This is also how the pipeline is tested without spending tokens.

Useful commands:

```bash
npm run guide:validate          # schema + integrity check on every curated guide (run in CI)
npm run guide:linkcheck         # HEAD every source URL in the curated guides
npm run guide:generate -- "Pipedrive"          # CLI: generate into data/candidates/ for review
npm run guide:generate -- https://cal.com --promote   # write straight into data/guides/
```

Deploy: `vercel` from the repo root. Set the env vars in the Vercel dashboard. The `/api/generate` route declares `maxDuration = 300`; on the Hobby plan functions are capped at 60 s, which is usually too short for a full run, so use Pro or run the live demo locally. Without Upstash, live-generated guides are cached in memory and vanish on cold start (curated guides are files and always load).

## How a guide is generated

```
query ──► resolve ──► investigate (web search + fetch) ──┐
                 └──► probe (real HTTP checks) ──────────┴──► synthesize ──► verify ──► guide
```

1. **Resolve.** One model call with web search: canonical name, website, docs, developer console, whether OAuth exists at all. Handles URLs and ambiguous names ("Mercury").
2. **Investigate.** A model call with Anthropic's server-side `web_search` and `web_fetch` tools answers ten questions (registration, flows, dev-mode limits, production gate, scope tiers, review requirements, timing/cost, blockers, rate limits, oddities). It returns a memo of findings, each with its evidence level and URLs.
3. **Probe.** Deterministic checks that need no account, run in parallel with step 2: `/.well-known/oauth-authorization-server` and `openid-configuration` (is there RFC 8414 metadata, and does it advertise **dynamic client registration**, the MCP-style path where no manual app is needed?); developer-portal reachability (does it redirect to a login wall?); and a Composio API lookup (does Composio already provide a **managed OAuth app**, so the developer can skip all of this?).
4. **Synthesize.** The memo, probes and the list of URLs the pipeline actually visited go into one call that writes the guide JSON. Output is validated with zod; a failed draft is retried once with the validation errors.
5. **Verify.** A second model call audits every claim against the memo and the visited-URL list. Anything "documented" without a supporting finding is downgraded to "inferred"; sources with URLs the pipeline never saw are removed; steps that claim an agent can do something requiring login or payment are reassigned to "you". The corrections are shown in the guide, not hidden.

The UI streams each stage and every search/fetch/probe over SSE so you can watch the investigation. A full run takes 1–3 minutes and roughly 12 searches, 8 fetches and 5 model calls.

## What was tested

- `npm run typecheck`, `npm run guide:validate` and `npm run build` pass.
- Full pipeline in mock mode, via CLI and via the SSE endpoint: resolve → investigate + probe (parallel) → synthesize (first draft fails validation, retry succeeds) → verify (unsupported step removed, invented source dropped, evidence re-levelled) → cached → rendered → exported as Markdown and JSON.
- Cache behaviour: a second request for the same app returns instantly; curated apps route to the library tier without touching the model.
- Error paths: empty input, unknown slug (404), missing API key, probe network failures (reported as "unknown", never as a guess).
- Two real HTTP probes against github.com, recorded in the GitHub guide as Tested evidence.
- Not yet tested against the live model (no API key at hand-off). See CLAUDE.md step 2 for the first live run checklist.

## Key decisions

**Two clocks, not one.** Most "how to set up OAuth for X" content stops at the client ID. The gap between dev-ready and production is where launches slip: Google's CASA assessment, Microsoft's publisher verification, Slack's Marketplace review, X's prepaid credits. Making the production clock a first-class field forces every guide to answer the real question.

**Owners on every step.** The brief asks what an agent can do and where the human takes over. Rather than a paragraph, each step carries `owner: agent | you | either`, and the summary counts them. In practice agents can do most of the preparation (scope minimisation, privacy-policy and justification drafts, demo-video scripts, manifests) and almost none of the gates (login, terms, business vetting, payment, submit).

**Evidence is a field, not a footnote.** Timing and cost claims are the most useful and the least reliable, so the schema makes the level explicit and the integrity checker refuses "documented" claims without a source. "Tested" is reserved for things actually attempted; the pipeline's probes earn it, model reasoning never does.

**Verify in a separate pass with a narrower job.** Asking the same call to write and self-audit produces confident prose. The verifier is told it is the skeptic and may only downgrade, correct or flag. Its corrections are surfaced in the guide so readers see the audit trail.

**Pipeline bans invented URLs.** Only URLs returned by search or fetched by the tools can appear as "documented"/"reported" sources. Hallucinated console paths were the single biggest failure in early tests; this rule plus the integrity checker removed almost all of them.

**Shortcuts first.** If Composio manages the OAuth app, or the provider advertises dynamic client registration, the guide says so at the top. Telling a developer they can skip the whole process is the most useful possible answer.

**A focused library, not 100 shallow guides.** Six curated guides chosen to span the difficulty range and the different kinds of gate:

| Guide | Difficulty | Why it is in the set |
|---|---|---|
| GitHub | 1 | Baseline: create app, works for everyone, no review. Includes two real probes. |
| Atlassian (Jira/Confluence) | 3 | Instant sharing with a privacy policy, but an "unreviewed app" warning until Marketplace review. |
| Slack | 3 | Unlisted distribution is a switch; policy pushes commercial apps into a reported months-long Marketplace review. |
| Microsoft 365 / Entra | 4 | No review queue at all; the wait is Partner Center company vetting and a verified domain. |
| Google (Gmail/Drive) | 5 | Restricted scopes: verification plus an annual paid CASA assessment. The canonical "weeks" case. |
| X (Twitter) | 5 | No review, but gated by money: pay-per-use credits, no free tier for ordinary apps. |

The same pipeline generates the rest: `npm run guide:generate` writes candidates into `data/candidates/` for review, which is how a 100-app library would be built in batches and promoted after a human diff.

## What was checked against real sources

See [VERIFICATION.md](./VERIFICATION.md). Summary: the gating claims in all six curated guides (CASA and its 12-month renewal; Slack's Dec 2024 policy and May 2025 terms; Atlassian's private-by-default and unreviewed warning; Microsoft's MPN requirement and B2C exclusion; X's pay-per-usage model) are confirmed on official pages fetched on 28 Oct 2026. Corrections made along the way are listed there and inside each guide. Form-level details that rely on integrator walkthroughs are labelled "reported", and a few stable doc pages cited from memory are flagged as such.

## Limitations

- **Timing estimates are mostly "reported".** Providers rarely publish review durations. The guides say so and give ranges with confidence levels rather than a single number.
- **"Tested" is thin.** The pipeline's probes are real but shallow (metadata, portal reachability, Composio status). Actually clicking through a provider's "create app" form needs an account and a browser agent; that was out of scope for the time budget. The two manual setup attempts recorded in VERIFICATION.md are the only end-to-end tests.
- **Policies drift.** X changed its pricing model twice in 2026; Google's restricted-scope list moves. Every guide carries a `lastVerifiedAt` and the pipeline can regenerate on demand (`?force=1`).
- **Live generation is not human-reviewed.** Agent-verified guides are labelled as such and should be read with the evidence badges in view.
- **Cost and abuse controls are minimal.** Per-IP rate limiting is in-memory; `GENERATE_KEY` can gate the endpoint for a public demo. Expect roughly $0.30–$0.80 per live generation depending on how much the model reads.
- **Composio status needs a key.** Curated guides ship with `composioManaged: unknown` rather than asserting something that was not checked; the page fills it in live when `COMPOSIO_API_KEY` is set.

## Repository layout

```
app/                   Next.js App Router: home, /guide/[slug], /generate, API routes
components/            GuideView, TwoClocks, Badges, ProgressLog, SubmitBox, LibraryGrid
lib/schema.ts          Zod schema: the contract for agent output, curated data, UI and export
lib/agent/             client (Anthropic tools), prompts, probe, pipeline, json
lib/store.ts           Curated library loader + live cache (Upstash or memory)
lib/markdown.ts        Shareable Markdown export
data/guides/*.json     Curated, human-verified guides
scripts/               generate (CLI), validate, linkcheck
VERIFICATION.md        What was checked, corrected, and could not be verified
```
