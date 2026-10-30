# Design decisions

Each entry: the problem, the decision, and the trade-off accepted.

## D1. Two clocks, not one

**Problem.** Most "set up OAuth for X" content stops at the client ID; the time that actually slips launches is the review, assessment or verification after it.
**Decision.** Every guide has `timeToDevReady` and `timeToProduction`, drawn on one log-scale bar so the gap is visible at a glance.
**Trade-off.** Production estimates are often "reported" rather than documented; the schema forces a confidence level instead of hiding that.

## D2. Owners on every step

**Problem.** The brief asks what an agent can do and where a human takes over; a paragraph does not answer that per step.
**Decision.** `owner: agent | you | either` on every step and prerequisite; the summary counts them. The verifier reassigns anything needing login, payment or legal acceptance to `you`.
**Trade-off.** Some steps are genuinely either; the `either` value exists for those rather than forcing a false precision.

## D3. Evidence is a field, not a footnote

**Problem.** Timing and cost claims are the most useful and the least reliable.
**Decision.** Four levels (tested, documented, reported, inferred) on every claim, with source ids; the integrity checker refuses documented or reported claims without a source, and `tested` is reserved for probes and human attempts.
**Trade-off.** Guides read as more hedged than a blog post. That is the point.

## D4. A separate audit pass with a narrower job

**Problem.** Asking one model call to write and self-check produces confident prose.
**Decision.** Stage 5 is told it is the skeptic and may only downgrade, correct or flag; its corrections are shown on the page.
**Trade-off.** One more model call per guide (~20% of cost) and a slightly longer run.

## D5. Only visited URLs may back a claim

**Problem.** Hallucinated console paths and doc URLs were the biggest failure in early drafts.
**Decision.** The pipeline tracks every URL returned by search or fetched by the tools; sources outside that set are dropped before validation and dependent evidence becomes inferred. Probe URLs are exempt because the pipeline made those requests itself.
**Trade-off.** A legitimate page the model knows but did not visit is excluded; the fix is to visit it, not to trust memory.

## D6. Shortcuts first

**Problem.** The most valuable answer is sometimes "you do not need to do this".
**Decision.** Probes check for dynamic client registration (MCP-style self-registration) and ask Composio whether a managed OAuth app exists; both surface at the top of the guide when positive.
**Trade-off.** The Composio check needs a key; without it the guide says `unknown` rather than guessing.

## D7. A focused library, not 100 shallow guides

**Problem.** The brief's goal is a 100-app library, with a 6–8 hour budget.
**Decision.** Six curated guides chosen to span the difficulty range and the different kinds of gate, each checked against official sources; the pipeline plus `npm run guide:generate` into `data/candidates/` is the batch path to the rest, promoted after a human diff.
**Trade-off.** Breadth is deferred; depth and the process are demonstrated.

## D8. The schema is the contract

**Problem.** Four consumers (pipeline, curated files, UI, Markdown export) must agree on shape.
**Decision.** One zod schema (`lib/schema.ts`) with cross-field integrity checks; a prose copy is handed to the model; a JSON Schema mirror is published for agents.
**Trade-off.** Two hand-maintained mirrors (prompt text, JSON Schema) can drift; zod is declared the source of truth.

## D9. Stream the investigation

**Problem.** A 1–3 minute wait with a spinner hides what the agent is doing and whether it is working.
**Decision.** Server-Sent Events with stage, activity, result, done and error events; the UI shows every search, read and probe as it happens, in a terminal-style log.
**Trade-off.** A long-lived function (`maxDuration = 300`) and keep-alive handling; both confirmed on Vercel.

## D10. Demo mode that tells the truth

**Problem.** No Anthropic key was available at deploy time, but evaluators will submit apps live.
**Decision.** `MOCK_AGENT=1` swaps only the model calls: eleven hand-written fixtures plus a deliberately low-confidence generic guide; probes stay real; every guide is labelled DEMO MODE in data and in the UI; `/api/health` reports the mode. The Linear fixture deliberately breaks on the first draft and cites an invented source so the retry and audit paths run on every demo.
**Trade-off.** Fixture facts are prior knowledge, not fresh fetches; VERIFICATION.md section 5 says exactly which page was read.

## D11. Rebuild on cache miss in demo mode

**Problem.** The in-memory live cache is per serverless instance; a guide page could 404 right after a successful generation.
**Decision.** `getGuide` rebuilds a missing live guide in demo mode with the fixture delays disabled; the generate route opts out so a fresh request still streams.
**Trade-off.** Any slug renders a generic guide in demo mode rather than 404. In live mode the real fix is Upstash.

## D12. Borrow Composio's visual language

**Problem.** The audience is Composio; the UI should feel at home next to their product.
**Decision.** Palette, mono labels, pill buttons and motion modelled on composio.dev; the four evidence colours and the difficulty tones stay semantic.
**Trade-off.** No dark mode in this iteration.

## D13. No auth, analytics or accounts

**Problem.** Scope.
**Decision.** Public read, rate-limited generate with an optional shared key; nothing stored about users; no browser storage.
**Trade-off.** Abuse control is coarse; acceptable for a demo, Upstash Ratelimit is the next step.
