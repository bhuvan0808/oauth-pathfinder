# FAQ

**Does it work for any app, not just the ones in the library?**
Yes, that is the design. The pipeline is provider-agnostic: resolve the name or URL with web search, read the official docs with web fetch, run real HTTP probes, write the guide against the schema, audit it. Nothing in the code is specific to the curated six or the eleven demo apps. On the deployed demo, apps without a fixture get a deliberately low-confidence generic guide because no model is being called.

**What changes when I add a real Anthropic API key?**
Set `ANTHROPIC_API_KEY`, remove `MOCK_AGENT`, redeploy. `lib/agent/client.ts` then calls the Anthropic Messages API with the `web_search` and `web_fetch` server tools for every stage, and every app you type gets a researched guide with sources the pipeline actually visited. The live path is complete but has not been exercised end to end because no key was available; the first-run checklist (SDK event names, beta header, JSON drift) is in [CLAUDE.md](../CLAUDE.md) and [TESTING.md](./TESTING.md). Expect 1–3 minutes and roughly $0.30–$0.80 per guide.

**How do I know whether I am looking at a demo guide or a researched one?**
Demo guides show a lime "Demo mode" banner, carry `verification.notes` starting with `DEMO MODE`, and are flagged `demo: true` in `/api/guides`. `/api/health` reports the deployment mode.

**Are the demo guides made up?**
They are hand-written to the same schema from knowledge of each provider's documentation, with every cited URL checked to resolve. One page (Mercury's OAuth2 doc) was read in full; the rest rests on prior knowledge, which [VERIFICATION.md](../VERIFICATION.md) section 5 states per app. The probe results inside them are real.

**Why two clocks?**
Because "how long will this take" has two honest answers: an hour to a token for yourself, and anything from an hour to a quarter until any user can connect without warnings or caps. The gap is where launches slip, so it is the first thing a guide shows.

**What does "Tested" mean, and why is there so little of it?**
Tested means actually attempted: the pipeline's HTTP probes or a human attempt recorded in VERIFICATION.md. It is deliberately reserved; model reasoning never earns it. The probes are shallow by design; a browser probe of the create-app form is the next increment.

**Why does the guide say "inferred" so often for a small SaaS?**
Because the sources are thin, and the tool prefers to say so rather than guess. Inferred items are listed under "Left as inferred" and in `openQuestions`, so you know exactly what to confirm.

**Can I trust the review durations?**
Treat them as reported ranges with the stated confidence. No provider in the library publishes a median review time; the guides cite the community sources they come from.

**How do I add a curated guide?**
Generate it (`npm run guide:generate -- "App"`), review `data/candidates/app.json` against the sources, fix what is wrong, set `generatedBy: "curated"` and `verification.status: "human-verified"`, move it to `data/guides/`, run `npm run guide:validate` and `npm run guide:linkcheck`, and record what you checked in VERIFICATION.md.

**How would the 100-guide library be built?**
Batch generation with the CLI, a human diff per guide, promotion. At roughly $0.30–$0.80 per live run the model cost is tens of dollars; the real cost is review time, which the evidence badges and the audit trail are designed to shorten.

**Can an agent use this?**
Yes: `/api/guides` for the index, `/api/guides/{slug}?format=md` for a guide with provenance intact, `POST /api/generate` for a new one (the `done` event contains the full guide), `/llms.txt` for orientation, and [guide.schema.json](./guide.schema.json) for the shape.

**Does the Composio check work?**
Only with `COMPOSIO_API_KEY`. Without it the guide says `unknown` and links to the managed-auth directory rather than asserting something unchecked.

**Why Vercel Hobby, and does the 300-second timeout work there?**
Vercel accepted `maxDuration = 300` on Hobby (Fluid Compute allows it). Demo runs take about 8 s; live runs 1–3 minutes.

**Why did the guide page 404 after generating?**
The live cache is in memory per serverless instance. Demo mode now rebuilds on a miss; for live mode add Upstash (two env vars).

**Is anything stored about me?**
No accounts, no analytics, no browser storage. The rate limiter keeps a per-IP counter in memory for an hour.

**Where are the keys?**
Server-side only, in Vercel environment variables or `.env.local`. Nothing is sent to the browser.
