# Changelog

## 30 Oct 2026 · documentation set, more demo apps, agent-facing endpoints

- Added demo fixtures for Zoom, Discord, Dropbox, Salesforce and Stripe (eleven apps in total) in `lib/agent/mockFixturesExtra.ts`.
- Added `GET /api/guides` (index of every guide with summary fields and links) and `GET /api/health` (mode and configuration, no secrets).
- Added `public/llms.txt`, `AGENTS.md`, `docs/README.md` (index), `docs/EXECUTIVE_SUMMARY.md`, `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/GUIDE_SCHEMA.md`, `docs/guide.schema.json`, `docs/DEPLOYMENT.md`, `docs/TESTING.md`, `docs/DECISIONS.md`, `docs/FAQ.md`, `docs/ROADMAP.md`, this changelog.
- Home page: eight example chips; marquee marks demo-fixture apps when in demo mode.
- `package.json`: homepage, repository, license and engines metadata.

## 30 Oct 2026 · restyled docs and submission materials

- README, VERIFICATION and CLAUDE restyled to match the site: SVG banner, colour-coded badges, mermaid diagram, production screenshots, callouts.
- VERIFICATION.md gained section 5 (what backs the demo fixtures) and section 6 (source-URL maintenance).
- New `SUBMISSION.md` evaluator note.

## 30 Oct 2026 · deployment and demo mode

- Deployed to Vercel (https://oauth-pathfinder-blue.vercel.app) in demo mode (`MOCK_AGENT=1`, `GENERATE_RATE_LIMIT=10`); repository connected for auto-deploys.
- Fixtures for Linear, Notion, HubSpot, Cal.com, Mercury and Resend plus a generic low-confidence fallback; real probe results folded into every demo guide.
- Fixed: guide page 404 after generation on serverless (per-instance memory cache) by rebuilding demo guides on a miss; the generate route opts out so fresh requests still stream.
- UI restyled to composio.dev's palette and motion; phone overflow fixed; progress stepper treats investigate and probe as concurrent.
- Link checker retries with GET and browser headers; three moved source URLs updated.
- Private submission checklist moved out of the repository.

## 28 Oct 2026 · hand-off

- Pipeline, schema, curated library of six guides, SSE generation UI, Markdown and JSON export, mock mode with the Linear fixture, verification log.
