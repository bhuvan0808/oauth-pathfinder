# Documentation index

Everything about OAuth Pathfinder, organised by who is reading. Start with the row that matches you.

| Reader | Start here | Then |
|---|---|---|
| **Evaluator, 3 minutes** | [SUBMISSION.md](../SUBMISSION.md) | the [live site](https://oauth-pathfinder-blue.vercel.app) |
| **Manager / product** | [EXECUTIVE_SUMMARY.md](./EXECUTIVE_SUMMARY.md) | [DECISIONS.md](./DECISIONS.md), [ROADMAP.md](./ROADMAP.md) |
| **Developer, running it** | [../README.md](../README.md) (quick start) | [DEPLOYMENT.md](./DEPLOYMENT.md), [TESTING.md](./TESTING.md) |
| **Developer, changing it** | [ARCHITECTURE.md](./ARCHITECTURE.md) | [GUIDE_SCHEMA.md](./GUIDE_SCHEMA.md), [API.md](./API.md) |
| **Integrating from code or an agent** | [API.md](./API.md) | [guide.schema.json](./guide.schema.json), [/llms.txt](https://oauth-pathfinder-blue.vercel.app/llms.txt) |
| **AI coding agent** | [../AGENTS.md](../AGENTS.md) | [../CLAUDE.md](../CLAUDE.md) |
| **Checking the facts** | [../VERIFICATION.md](../VERIFICATION.md) | the "Sources" section of any guide |

## All documents

| File | What it contains |
|---|---|
| [../README.md](../README.md) | Overview, screenshots, quick start, environment variables, how a guide is generated, what was tested, key decisions, limitations, repository layout. |
| [../SUBMISSION.md](../SUBMISSION.md) | Evaluator note: links, what to click, what is demo vs real, email-ready blurb. |
| [../VERIFICATION.md](../VERIFICATION.md) | Gating claims checked against official sources, pipeline self-corrections, what could not be verified, manual setup attempts, what backs the demo fixtures, source-URL maintenance. |
| [../AGENTS.md](../AGENTS.md) | Repository map and conventions for AI agents and new contributors. |
| [../CLAUDE.md](../CLAUDE.md) | Instructions for coding agents: current state, go-live checklist, guardrails. |
| [../CHANGELOG.md](../CHANGELOG.md) | What changed when. |
| [EXECUTIVE_SUMMARY.md](./EXECUTIVE_SUMMARY.md) | The problem, the approach, what is proven, what is demo, risks, cost model, path to a 100-guide library. |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Runtime components, request flows, the five pipeline stages with budgets, SSE event schema, storage tiers, evidence rules, security, file map. |
| [API.md](./API.md) | Every HTTP endpoint with request and response examples, SSE event types, error codes. |
| [GUIDE_SCHEMA.md](./GUIDE_SCHEMA.md) | Field-by-field reference of the guide data model, the difficulty rubric, the two clocks, owner and evidence semantics, integrity rules. |
| [guide.schema.json](./guide.schema.json) | JSON Schema (draft 2020-12) mirror of the zod schema, for validators and agents. |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Local setup, Vercel deployment, env vars, switching from demo to live research, Upstash, Composio, rate limiting, costs, troubleshooting. |
| [TESTING.md](./TESTING.md) | Commands, what passes, demo runs per app, SSE timing method, production checklist, link check, layout check, the live-model checklist. |
| [DECISIONS.md](./DECISIONS.md) | Design decisions with the problem each solves and the trade-off accepted. |
| [FAQ.md](./FAQ.md) | Common questions, including what changes once a real API key is added. |
| [ROADMAP.md](./ROADMAP.md) | Next increments in order of value, with rough effort. |
| [banner.svg](./banner.svg), [screenshots/](./screenshots/) | Assets used by the README. |
| [attempts/](./attempts/) | Screenshots from manual setup attempts (VERIFICATION.md section 4). |
