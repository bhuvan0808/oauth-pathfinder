<p align="center"><img src="./banner.svg" alt="OAuth Pathfinder" width="100%"></p>

# Executive summary

*For managers and reviewers who want the shape of the solution without reading code.*

## The problem

A developer building an AI agent wants users to connect an app (Gmail, Slack, HubSpot). Before launch they usually must register an OAuth app with the provider and, for many providers, get it approved. Today that means piecing together docs, unfamiliar consoles and provider emails, with no way to know up front whether the setup is an hour of clicking or a quarter of waiting on reviews, security assessments or business verification.

## What we built

**OAuth Pathfinder**: a shareable readiness guide per provider, plus an agent that writes one for any app on demand.

| Capability | What it does for the developer |
|---|---|
| **Two clocks** | Separates *dev-ready* (a token for yourself) from *production* (any user can connect, including approval waits). The gap is where launches slip. |
| **Difficulty 1–5 with a reason** | One number to plan around, with the gate named: review, verification, paid tier, security assessment, partner program. |
| **Owners on every step** | Each step is marked *agent* or *you*, so a team knows what to automate and where a human must log in, pay, accept terms or click submit. |
| **Evidence on every claim** | Tested, documented, reported or inferred, with linked sources. Timing and cost claims are the least reliable in this domain, so their confidence is explicit. |
| **Shareable formats** | Web page, Markdown (paste into Slack, Notion or an agent's context) and JSON. |
| **Live generation** | Type any app name or URL; watch the agent resolve it, read its docs, run real HTTP probes, write the guide and audit its own draft. |

Six curated guides were chosen to span the range and the kinds of gate: GitHub (1), Atlassian (3), Slack (3), Microsoft 365 (4), Google (5), X (5). The same pipeline is how a 100-guide library would be built: generate in batches, review the diff, promote.

## What is proven

- Every gating claim in the six curated guides was checked against official provider pages on 28 Oct 2026; corrections made along the way are listed in [VERIFICATION.md](../VERIFICATION.md).
- The pipeline runs end to end: schema validation with retry, dropping of sources the agent never visited, a separate audit pass that downgrades unsupported claims and reassigns steps that need a human.
- Real HTTP probes run on every generation: OAuth discovery metadata (and whether dynamic client registration is advertised), developer-portal reachability, and whether Composio already provides a managed OAuth app.
- Deployed on Vercel with streaming progress; production checks in [docs/TESTING.md](./TESTING.md).

## What is demo

No Anthropic API key was available at deploy time, so the deployed site runs the pipeline in **demo mode**: hand-written fixtures for eleven apps (Linear, Notion, HubSpot, Cal.com, Mercury, Resend, Zoom, Discord, Dropbox, Salesforce, Stripe) and a deliberately low-confidence generic guide for anything else. The UI labels every such guide. The live-research code path is complete and switches on with one environment variable, but it has not yet been exercised against the model; the first-run checklist is in [CLAUDE.md](../CLAUDE.md).

## Why it matters for Composio

Composio's managed OAuth apps remove this work for many providers. Where they do not (custom branding, scopes, quota, or a provider Composio does not manage yet), a developer still faces the path this tool maps. The guide checks Composio's managed-auth status first and says "you may not need your own app" when that is true, which is the most useful possible answer.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Provider policies drift (X changed pricing twice in 2026) | Every guide carries `lastVerifiedAt`; regenerate on demand with `?force=1`; the link checker catches moved pages. |
| Model hallucinates console paths or timelines | Only URLs the pipeline actually visited can back documented claims; the integrity checker rejects documented claims without a source; the audit pass downgrades the rest. |
| Live generation cost and abuse | Per-IP rate limit, optional shared key on the endpoint, roughly $0.30–$0.80 per live run. |
| Thin "tested" evidence | Probes are real but shallow; the next increment is a browser probe that opens the provider's create-app form. |
| Memory cache on serverless | Demo mode rebuilds on a miss; a live deployment should add Upstash (two env vars). |

## Cost model

- Demo mode: $0 per generation.
- Live mode: about 5 model calls, ~12 searches and ~8 fetches per guide; roughly $0.30–$0.80 depending on how much the model reads. A 100-guide library is therefore tens of dollars plus human review time, which is the real cost.

## Next 30 days (if continued)

1. Switch the deployment to live research and run the first-run checklist (hours).
2. Browser-based probe of the create-app form for tested evidence (days).
3. Batch-generate 20 more guides, review, promote (days, mostly review).
4. Upstash cache and rate limit (hours).

Details in [ROADMAP.md](./ROADMAP.md).
