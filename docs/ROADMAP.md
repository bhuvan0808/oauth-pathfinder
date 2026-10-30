# Roadmap

Next increments in order of value. Effort is a rough engineering estimate; review time for guides is separate.

| # | Increment | Why | Effort |
|---|---|---|---|
| 1 | **Switch the deployment to live research** and run the first-run checklist (SDK server-tool events, `web_fetch` beta header, JSON drift) | Turns the demo into the real product with one env var | hours |
| 2 | **"Real test" with a bring-your-own-key vault** (design below) | Lets a developer or evaluator run live research from the UI with their own Anthropic key without the operator paying or storing anything | hours |
| 2b | **Upstash cache and rate limit** | Guides survive cold starts; per-IP limits hold across instances | hours |
| 3 | **Browser probe of the create-app form** (Playwright or Browserbase) that reports the fields a provider asks for | Converts "documented" form details into "tested" evidence, the thinnest level today | days |
| 4 | **Batch-generate 20 more guides**, review the diff, promote | The path to the 100-guide library; measures real cost and failure modes | days, mostly review |
| 5 | **Freshness job**: weekly link check plus `?force=1` regeneration for guides older than N days, diffed against the curated file | Policies drift (X changed pricing twice in 2026) | hours |
| 6 | **Compare view**: two providers side by side on the two clocks and blockers | Teams choosing which integration to ship first | days |
| 7 | **Composio-aware recommendations**: when a managed OAuth app exists, generate the exact Composio connection snippet next to the guide | Shortcuts first, made actionable | days |
| 8 | **Manual-attempt tooling**: a template that turns VERIFICATION.md section 4 entries into `tested` evidence and probe-type sources automatically | Lowers the cost of adding human evidence | hours |
| 9 | **Dark mode** matching composio.dev's dark tokens | Already extracted; UI only | hours |
| 10 | **Evaluation set**: 10 apps with known answers, run on every pipeline change, scored on difficulty, clocks and evidence levels | Regression safety for prompt changes | days |

## Design note: "Real test" with a bring-your-own-key vault

A header toggle opens a modal where a developer pastes their own Anthropic key to run live research for the rest of the tab session. Designed so the operator never pays for, stores or sees the key.

**User-facing behaviour**

- Password-type input, a consent checkbox, and a plain statement: the key is kept in this tab's memory only, sent only to this site's own server over HTTPS for runs you start, never stored or logged, and gone on refresh or close. A "Forget key" button and a 30-minute idle timeout clear it sooner.
- A cheap validation call (models list) runs before any paid generation so a typo fails fast; a cost note (roughly $0.30–$0.80 per run) is shown up front.
- Guides produced this way are labelled "live research with a user-supplied key" and carry real sources; the header shows the mode (demo / real) at all times.
- The modal recommends creating a dedicated key in the Anthropic console with a spend limit and deleting it afterwards.

**Vault session (server never stores the key)**

1. Key submitted once to `POST /api/key/session`; the server validates it, encrypts it with AES-256-GCM under a server secret, and returns an opaque token with a 30-minute expiry. Nothing is written server-side.
2. The tab keeps only the token in memory (never `localStorage` or `sessionStorage`) and sends it per request in a header; the server decrypts, uses the key for that request's Anthropic calls with a fresh client (no cached singleton), and discards it.
3. Expiry is enforced by the server, so a copied token is useless after 30 minutes; refreshing the page drops the token.

**Hardening**

- Keys and tokens travel only in headers over HTTPS, never in URLs; error messages are scrubbed so a key can never echo back; request headers are never logged.
- Feature gated behind `ALLOW_BYOK=1`; the per-IP rate limit still applies; input is validated (`sk-ant-` prefix, length) before any upstream call.
- Security headers added to the app (`Content-Security-Policy` with nonces, `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`, `Permissions-Policy`) to narrow the XSS risk that is the real threat to any in-memory secret.
- Honest caveat shown in the modal: the key passes through this site's server. The stronger variant, calling Anthropic directly from the browser with the SDK's explicit browser opt-in so the key never leaves the tab, is a larger refactor (probes stay server-side because provider `.well-known` endpoints block cross-origin requests) and is the follow-on step.

Non-goals for now: accounts, analytics, user-submitted edits, a public write API.
