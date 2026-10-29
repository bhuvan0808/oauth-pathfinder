# Instructions for Claude Code

This repo is a take-home submission: an OAuth-app readiness guide generator (Next.js 14, App Router, TypeScript, Tailwind, Anthropic SDK with server-side web_search + web_fetch tools). Read README.md first.

## Your job in this session

1. `npm install`, then make `npm run typecheck`, `npm run guide:validate` and `npm run build` pass. They passed at hand-off; if they fail now it is an environment difference, not a design problem. Then run `MOCK_AGENT=1 npm run guide:generate -- Linear` to see the pipeline work without a key (fixtures in `lib/agent/mock.ts`).
2. With `ANTHROPIC_API_KEY` in `.env.local`, run `npm run dev` and generate guides for at least these inputs, watching `/generate?q=...`:
   - `Linear` (expect difficulty 1–2, fast)
   - `HubSpot` (expect a marketplace/app-review path)
   - `https://cal.com` (URL input)
   - `Mercury` (ambiguous name; check the resolve stage picks something sensible and says so)
   - `Resend` (likely API-key only: guide must say no OAuth app exists and still validate)
   - a tiny or obscure SaaS (expect low-confidence output, lots of "inferred", no crash)
   Fix any crash or validation loop you see. Typical fixes: the model's JSON shape drift (handle in `lib/agent/pipeline.ts` normalisation block), SSE buffering on the dev server, SDK event names for server tools in `lib/agent/client.ts` (check `stream.on("contentBlock")` still fires for `server_tool_use` / `web_search_tool_result` / `web_fetch_tool_result` blocks in the installed SDK version; if not, read `final.content` after `finalMessage()` and emit activity from there).
3. `npm run guide:linkcheck` and fix any dead source URL in `data/guides/*.json` by replacing it with the current page (keep the claim; update the URL and title).
4. Deploy to Vercel (`vercel`), set env vars, confirm `/`, `/guide/google-gmail`, `/api/guides/slack?format=md` and one live generation work on the deployed URL. Note the Hobby 60 s function limit in README if that is what the user is on.
5. Put the deployed URL and repo URL at the top of README.md.

## Do not

- Do not rewrite the curated guides' facts, difficulty scores, time ranges or evidence levels in `data/guides/`. They were checked against sources listed in VERIFICATION.md. Fix only broken URLs, typos, or things the user explicitly tells you were wrong in a manual attempt.
- Do not relax `lib/schema.ts` integrity rules (documented/reported claims must cite a source; "tested" is reserved for real attempts). If the model keeps failing validation, improve the prompt or normalisation, not the rule.
- Do not change the "Tested / Documented / Reported / Inferred" vocabulary or the two-clocks model; the README and VERIFICATION.md depend on them.
- Do not commit `.env.local` or any key. `.gitignore` already excludes it.
- Do not add `localStorage` reliance or client-side API keys.

## Where things are

- Pipeline: `lib/agent/pipeline.ts` (stages, events), `lib/agent/prompts.ts` (all prompts), `lib/agent/probe.ts` (real HTTP checks), `lib/agent/client.ts` (Anthropic calls; model via `ANTHROPIC_MODEL`, default `claude-sonnet-4-5`).
- SSE route: `app/api/generate/route.ts`. Client: `components/ProgressLog.tsx`.
- Schema and integrity checks: `lib/schema.ts` (`parseGuide`).
- Guide rendering: `components/GuideView.tsx`, `components/TwoClocks.tsx`, `components/Badges.tsx`.
- Markdown export: `lib/markdown.ts`.
- Storage: `lib/store.ts` (files for curated; Upstash or memory for live).

## If the user asks for more

Good next increments, in order of value: (1) a Playwright/Browserbase probe that opens the provider's "create app" form and reports the fields it asks for, feeding "tested" evidence; (2) batch generation of 20 more guides via `npm run guide:generate` with a review diff; (3) Upstash Ratelimit instead of the in-memory limiter.
