<p align="center">
  <img src="docs/banner.svg" alt="OAuth Pathfinder" width="100%">
</p>

# Submission note · APM Integrations take-home

| | |
|---|---|
| **Live** | https://oauth-pathfinder-blue.vercel.app |
| **Repo** | https://github.com/bhuvan0808/oauth-pathfinder |
| **Evidence** | [VERIFICATION.md](./VERIFICATION.md): what was checked, corrected, and could not be verified |
| **Setup, decisions, limitations** | [README.md](./README.md) |
| **Mode** | ![Demo mode](https://img.shields.io/badge/demo%20fixtures-no%20API%20key%20at%20deploy%20time-d4ff4a?style=flat-square&labelColor=0f0f0f) |

## The one-paragraph version

OAuth Pathfinder answers "hour or quarter?" per provider. Each guide runs on **two clocks** (dev-ready vs production), labels every step as **agent-doable or human-only**, and carries an **evidence level on every claim**. Six curated guides span the difficulty range (GitHub → Google CASA, X pay-per-use). The live generator investigates any app with web search, fetch and real HTTP probes, writes a schema-validated guide, then audits its own draft and shows the corrections. Obscure apps get low-confidence guides rather than confident guesses.

## What to click (three minutes)

| Step | Where | What to look for |
|---|---|---|
| 1 | [Home](https://oauth-pathfinder-blue.vercel.app) | The two-clocks framing and a library that goes from ![1](https://img.shields.io/badge/1-trivial-1a7f4b?style=flat-square) to ![5](https://img.shields.io/badge/5-gated-d23b36?style=flat-square). |
| 2 | [Google guide](https://oauth-pathfinder-blue.vercel.app/guide/google-gmail) | TL;DR, the two-clocks bar (30–60 min vs 2–8 weeks), two hard blockers, Path 2 with **You** on submit and **Agent** on drafting, evidence badges with source numbers, the "could and couldn't verify" section. |
| 3 | Type **Mercury** | Ambiguous name: the resolve stage says which Mercury it picked and why; production is an approval form, not a console. |
| 4 | Type **Resend** | API-key-only provider: the guide says no OAuth app exists and still validates; the production clock is DNS, not approval. |
| 5 | Type **anything obscure** | Low-confidence shape: every claim *inferred*, status `unverified`, open questions listed. No crash. |
| 6 | **Copy as Markdown** on any guide | The shareable artifact, with evidence levels and source list intact. |

## What is real and what is demo on the deployed site

| Piece | Status |
|---|---|
| Six curated guides | Real. Facts checked against official pages on 28 Oct 2026 ([VERIFICATION.md](./VERIFICATION.md) section 1). |
| Pipeline code (resolve → investigate → probe → synthesize → verify) | Real and unchanged; the deployment runs it with `MOCK_AGENT=1`. |
| Probes (OAuth discovery metadata, developer-portal reachability, Composio check) | Real HTTP requests on every generation, folded in as *Tested* evidence. |
| Research text and guide drafts for Linear, Notion, HubSpot, Cal.com, Mercury, Resend | Fixtures written by hand to the same prompts and schema; URLs verified to resolve, one page (Mercury's OAuth2 doc) read in full. See VERIFICATION.md section 5. |
| Any other app | Generic low-confidence fixture, all claims *inferred*, labelled as such. |
| Model calls with `web_search` / `web_fetch` | Not exercised: no Anthropic key was available. Switching is three commands (README, "Switching the deployment to live research"). |

## Where the thinking is

- **Why two clocks, owners and evidence levels:** README, "Key decisions".
- **What was confirmed, corrected and left open:** VERIFICATION.md sections 1–3; manual setup attempts in section 4.
- **What the pipeline corrects on its own:** VERIFICATION.md section 2, and the "Corrected during verification" block on every generated guide.
- **How the 100-guide library would be built:** `npm run guide:generate` into `data/candidates/`, human diff, promote. README, "Key decisions".

## Known limitations (short form)

- Deployed demo is fixtures, not live research; the UI says so on every generated guide.
- Review durations are "reported" ranges; no provider publishes a median.
- "Tested" evidence is shallow (probes), apart from the manual attempts in VERIFICATION.md section 4.
- Live-generated guides are cached in memory per serverless instance; demo mode rebuilds on a miss, a real deployment should use Upstash.

## Email-ready blurb

> **Subject:** APM Integrations take-home · OAuth Pathfinder
>
> Live: https://oauth-pathfinder-blue.vercel.app · Repo: https://github.com/bhuvan0808/oauth-pathfinder
>
> OAuth Pathfinder answers "hour or quarter?" per provider. Each guide runs on two clocks (dev-ready vs production), labels every step as agent-doable or human-only, and carries an evidence level on every claim. Six curated guides span the difficulty range (GitHub → Google CASA, X pay-per-use); the live generator investigates any app with web search, fetch and real probes, then audits its own draft. VERIFICATION.md lists what was checked against official sources, what was corrected, and what I could not verify.
>
> The deployed site runs the pipeline in demo mode (fixtures for six apps, a low-confidence generic guide for the rest, real HTTP probes) because no Anthropic key was available at deploy time; adding one switches it to live research without code changes. Try the generator with any app; obscure ones return low-confidence guides rather than confident guesses.
