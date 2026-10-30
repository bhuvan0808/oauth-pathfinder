# Testing

What was tested, how to re-run it, and what remains untested. Dates are 30 Oct 2026 unless stated.

## 1. Static checks

| Command | Result |
|---|---|
| `npm run typecheck` | Pass (TypeScript strict). |
| `npm run guide:validate` | Pass: all six curated guides satisfy the schema and the integrity rules. |
| `npm run build` | Pass (Next.js 14 production build). |
| `npm run guide:linkcheck` | 47 source URLs, 0 failing, after updating three moved pages and teaching the checker to retry with GET and browser headers. |

## 2. Pipeline runs in demo mode (CLI)

`MOCK_AGENT=1 npm run guide:generate -- "<app>"` writes `data/candidates/<slug>.json` (gitignored). Probes are real HTTP calls; everything else is fixture. Durations include the deliberate delays that make the streamed log readable.

| Input | Difficulty | Dev-ready | Production | Sources | Duration | What it exercises |
|---|---|---|---|---|---|---|
| Linear | 1/5 | 10–15 min | 10–15 min | 6 | 8 s | Broken first draft → retry; invented source dropped; "submit for review" step removed by the audit |
| HubSpot | 3/5 | 30–60 min | 2–4 weeks | 9 | 8 s | Marketplace listing path with an unlisted alternative |
| https://cal.com | 3/5 | 1–2 h | 1–7 days | 7 | 7 s | URL input; unusual OAuth model (managed users) |
| Mercury | 4/5 | 10–20 min | 2–8 weeks | 6 | 8 s | Ambiguous name resolved with a stated reason; approval-first provider |
| Resend | 1/5 | 5–10 min | 1–48 h | 7 | 7 s | `supportsOAuth: false` still validates; DNS is the production clock |
| Notion | 2/5 | 15–30 min | 1–2 h | 7 | 7 s | Public integration form, no review |
| Zoom | 4/5 | 30–60 min | 2–6 weeks | 8 | 8 s | Marketplace review gates external users |
| Discord | 2/5 | 10–20 min | 10–20 min | 7 | 7 s | OAuth instant; bot verification is the long clock |
| Dropbox | 3/5 | 15–30 min | 3–14 days | 7 | 7 s | Development-status user cap; production approval |
| Salesforce | 2/5 | 20–40 min | 20–40 min | 7 | 9 s | Self-serve connected app; propagation delay; AppExchange as the long road |
| Stripe | 3/5 | 15–30 min | 1–3 days | 7 | 7 s | Connect-only OAuth; activation, not review |
| Fathom Analytics (no fixture) | 3/5 | 1–4 h | 1–4 weeks | 0 | 6 s | Generic fallback: every claim inferred, status `unverified`, no crash |

Audit behaviour observed: owners reassigned where a step needs a human (e.g. Mercury's "Submit the OAuth2 access request form"), unsupported review steps removed (Linear), inferred items listed under "Left as inferred".

## 3. SSE streaming

Method: `curl -N` against `/api/generate` with a timestamp per `data:` line.

- `next dev`: first event at ~0.3 s, subsequent events 250–400 ms apart, `done` at ~8 s.
- Production (Vercel): first event at ~0.6 s, events ~350 ms apart, `done` at ~9 s.

Conclusion: the browser log animates live; nothing is buffered until the end.

## 4. Production checklist (https://oauth-pathfinder-blue.vercel.app)

| Check | Result |
|---|---|
| `/` lists the six curated guides and shows the Demo mode pill | Pass |
| `/guide/google-gmail` renders two clocks, hard blockers, Path 1, Path 2, sources | Pass |
| `/api/guides/slack?format=md` returns `text/markdown` | Pass |
| `POST /api/generate {"query":"Linear"}` streams 26 events to `done` in ~9 s | Pass |
| `/guide/linear` loads afterwards | Pass after fix (memory cache is per instance; demo mode now rebuilds on a miss) |
| `POST /api/generate {"query":"Slack"}` returns `{"cached":true,"tier":"library"}` in < 1 s | Pass |
| Fresh app (`https://cal.com`, `Pipedrive`) streams rather than short-circuiting | Pass after fix (generate route skips the demo rebuild on its cache check) |
| `/guide/mercury` cold (never generated on that instance) | Pass, ~1.4 s |
| `/api/guides`, `/api/health` | Added after the checks above; verified locally and after deploy |

## 5. Layout

Headless Edge screenshots at 1440 px and inside a 390 px frame (Chromium enforces a minimum window width, so a plain 390 px window is not a valid phone test). One defect found and fixed: long callback and scope URLs widened the guide and progress grids on phones (`min-width: 0` on the grid children, `overflow-wrap: anywhere` on values). Screenshots in `docs/screenshots/`.

## 6. Not tested: the live model

No `ANTHROPIC_API_KEY` was available. The live path is complete but unexercised. First-run checklist:

1. `npm run guide:generate -- Linear` with a key in `.env.local`.
2. If no `search`/`fetch` activity appears: confirm `stream.on("contentBlock")` receives `server_tool_use`, `web_search_tool_result` and `web_fetch_tool_result` with the installed SDK; otherwise derive activity and visited URLs from `final.content` after `finalMessage()`.
3. If the API rejects tool types or the `anthropic-beta: web-fetch-2025-09-10` header: check current Anthropic docs and update `lib/agent/client.ts`.
4. If synthesis fails validation twice: extend the normalisation block in `lib/agent/pipeline.ts` or tighten the prompt; never relax `lib/schema.ts`.
5. Then HubSpot, `https://cal.com`, Mercury, Resend, one obscure SaaS; record durations and failures in this file and in the README.

## 7. Manual setup attempts

Real attempts with free accounts are the only end-to-end "tested" evidence beyond probes. The template and results live in [VERIFICATION.md](../VERIFICATION.md) section 4, with screenshots in `docs/attempts/`.
