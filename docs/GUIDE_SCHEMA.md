# Guide schema

The guide is the contract between the agent pipeline, the curated library, the UI and the Markdown export. Source of truth: `lib/schema.ts` (zod). A JSON Schema mirror for validators and agents is in [guide.schema.json](./guide.schema.json). This page explains what each field means and how it is used.

## Top level

| Field | Type | Meaning |
|---|---|---|
| `schemaVersion` | `1` | Bumped only on breaking changes. |
| `slug` | `^[a-z0-9-]+$` | URL slug, derived from the resolved app name via `slugify` (strips scheme, `www.` and common TLDs: `https://cal.com` → `cal`). |
| `app` | object | `name` (required), `website`, `docsUrl`, `developerPortalUrl` (where an OAuth app is created), `category`, `oneLiner`. |
| `generatedBy` | `curated` \| `agent` | Curated guides are human-reviewed files; agent guides come from the pipeline. |
| `generatedAt`, `lastVerifiedAt` | ISO 8601 | Shown on the page; `lastVerifiedAt` is updated by the verify pass or a human check. |
| `oauth` | object | See below. |
| `summary` | object | The screenshot-able part: difficulty, two clocks, cost, blockers, TL;DR. |
| `prerequisites` | array | Things to have before step 1, each with an owner and evidence. |
| `paths.dev`, `paths.production` | arrays of steps | Path 1 and Path 2. Production is empty when the dev path is already production. |
| `requirements` | array | Checklist items (privacy policy URL, verified domain, demo video, business entity…), `required` true/false. |
| `gotchas` | array | Traps with a title and detail. |
| `whenStuck` | array | Situation → action, optional link. |
| `sources` | array | Every URL referenced by evidence. |
| `verification` | object | Audit status and trail. |
| `openQuestions` | string array | What the pipeline or author could not pin down. |

## `oauth`

| Field | Values | Meaning |
|---|---|---|
| `supportsOAuth` | boolean | False for API-key-only providers (Resend). The guide still validates and describes the alternative path. |
| `flows` | strings | `authorization_code`, `pkce`, `client_credentials`, `device_code`, `oauth1`, `jwt_bearer`… |
| `alternatives` | strings | `api_key`, `personal_access_token`, `bot_token`… |
| `composioManaged` | `yes` \| `no` \| `unknown` | Whether Composio provides a managed OAuth app. Curated files ship `unknown`; `lib/enrich.ts` fills it at render time when `COMPOSIO_API_KEY` is set. |
| `composioToolkitSlug` | string | Composio toolkit slug when known. |
| `dynamicClientRegistration` | `yes` \| `no` \| `unknown` | Set from the discovery probe: `yes` means an MCP-style client may register itself without a manual app. |
| `notes` | string | Anything unusual about the auth model (e.g. Cal.com's managed users, Stripe's Connect-only OAuth). |

## `summary`

### Difficulty rubric

| Score | Label | Rule |
|---|---|---|
| 1 | Trivial | Create the app and you are done. No review. |
| 2 | Easy | A few settings and a URL or two. No review for most use. |
| 3 | Moderate | A distribution or review step, or tricky scopes. |
| 4 | Hard | A verification process with real waiting. |
| 5 | Gated | A paid tier, security assessment, business verification or partner program stands between you and production. |

`difficultyReason` must name the gate. The UI tone is green (1–2), amber (3), red (4–5).

### The two clocks

Both are `Duration` objects: `{ min, max, unit, confidence, note? }` with `unit` in minutes, hours, days, weeks, months and `confidence` high, medium or low.

- `timeToDevReady`: until the developer can obtain a token for themselves or a handful of test users.
- `timeToProduction`: until any user can connect without caps, warnings or admin consent, **including approval waits**. When a review is only needed for a marketplace listing, the note states the no-listing number too.

The UI draws both on one log-scale axis from 10 minutes to 6 months (`clockPosition` in `lib/format.ts`); lower confidence lowers the bar's opacity.

### Blockers

`{ text, severity: "hard" | "soft", evidence }`. Hard = cannot reach production without it; soft = slows you down. The library cards count hard blockers.

## Steps (`paths.dev[]`, `paths.production[]`)

| Field | Meaning |
|---|---|
| `title`, `detail` | What to do and how. |
| `owner` | `agent` (research, drafting values, choosing minimum scopes, writing justifications, scripting demo videos, pre-filling forms), `you` (anything needing a login, accepting terms, verifying a business, paying, recording, clicking submit), `either`. |
| `effort` | Human-readable: `5 min`, `1-2 hours`, `30 min + 2-4 weeks waiting (reported)`. |
| `consoleLocation` | Breadcrumb in the provider console, e.g. `Settings > API > Applications`. |
| `values[]` | `{ field, value }` pairs the agent pre-fills: redirect URI placeholders (`https://YOUR_DOMAIN/oauth/callback/<slug>`), minimal scopes, app names. |
| `evidence` | See below. |

The summary rail counts agent-owned and you-owned steps across both paths.

## Evidence

```json
{ "level": "documented", "sourceIds": ["s1", "s3"], "note": "optional" }
```

| Level | Meaning | Rule |
|---|---|---|
| `tested` | Actually attempted: a pipeline probe or a human attempt | Reserved. Model reasoning never earns it. |
| `documented` | Stated on an official provider page | Must cite at least one source id. |
| `reported` | Community post, vendor blog, forum | Must cite at least one source id. Typical for timing and cost. |
| `inferred` | Best reading of indirect evidence | May have no sources; the UI shows it grey and the Markdown italicises it. |

Integrity rules enforced by `parseGuide`:

1. Every `sourceIds` entry must exist in `sources[]`.
2. `tested`, `documented` and `reported` need at least one source id.
3. The pipeline additionally drops any non-probe source whose URL it never visited and re-levels dependent evidence to `inferred` with a note.

## Sources

`{ id, url, title, type, fetchedAt? }` with `type` in `official` (provider docs or console), `community` (forums, blogs, vendors), `composio` (Composio docs or API), `probe` (a live HTTP check the pipeline ran). Sources are numbered in order on the page; evidence badges link to them with superscripts.

## Verification

| Field | Meaning |
|---|---|
| `status` | `unverified` (draft only), `agent-verified` (audit pass ran), `human-verified` (curated). |
| `checkedClaims` | Items the audit examined. |
| `corrected[]` | What changed during the audit; shown on the page under "Corrected during verification". |
| `unverifiable[]` | Items left as inferred because no source supports them. |
| `notes` | Free text. Demo guides start it with `DEMO MODE`, which drives the UI banner and the `demo` flag in `/api/guides`. |

## Minimal valid example

```json
{
  "schemaVersion": 1,
  "slug": "example",
  "app": { "name": "Example" },
  "generatedBy": "agent",
  "generatedAt": "2026-10-30T00:00:00Z",
  "lastVerifiedAt": "2026-10-30T00:00:00Z",
  "oauth": { "supportsOAuth": true, "flows": ["authorization_code"], "alternatives": [], "composioManaged": "unknown", "dynamicClientRegistration": "unknown" },
  "summary": {
    "difficulty": 2, "difficultyReason": "Create the app; no review.",
    "timeToDevReady": { "min": 10, "max": 20, "unit": "minutes", "confidence": "high" },
    "timeToProduction": { "min": 10, "max": 20, "unit": "minutes", "confidence": "high" },
    "cost": "Free", "blockers": [], "tldr": "Create the app and go."
  },
  "prerequisites": [],
  "paths": { "dev": [ { "title": "Create the app", "detail": "…", "owner": "you", "effort": "5 min", "evidence": { "level": "documented", "sourceIds": ["s1"] } } ], "production": [] },
  "requirements": [], "gotchas": [], "whenStuck": [],
  "sources": [ { "id": "s1", "url": "https://example.com/docs/oauth", "title": "Example docs: OAuth", "type": "official" } ],
  "verification": { "status": "unverified", "checkedClaims": 0, "corrected": [], "unverifiable": [] },
  "openQuestions": []
}
```

Validate any file with `npx tsx -e "import('./lib/schema').then(m => m.parseGuide(require('./path/to/guide.json')))"` or by dropping it into `data/guides/` and running `npm run guide:validate`.
