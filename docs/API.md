# HTTP API

Base URL of the deployment: `https://oauth-pathfinder-blue.vercel.app`. All responses are UTF-8 JSON unless stated. No authentication is required to read; `POST /api/generate` can be gated with `GENERATE_KEY` and is rate limited.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Mode (demo / live / unconfigured), configuration flags, curated slugs, demo apps, endpoint list |
| GET | `/api/guides` | Index of every guide this deployment can serve |
| GET | `/api/guides/{slug}` | One guide as JSON |
| GET | `/api/guides/{slug}?format=md` | One guide as Markdown |
| POST | `/api/generate` | Generate a guide; Server-Sent Events, or JSON when cached |
| GET | `/llms.txt` | Plain-text summary for agents |

## GET /api/health

```bash
curl -s https://oauth-pathfinder-blue.vercel.app/api/health
```

```json
{
  "ok": true,
  "name": "oauth-pathfinder",
  "version": "0.1.0",
  "time": "2026-10-30T12:00:00.000Z",
  "mode": "demo",
  "modeHelp": "Live generation runs on fixture responses; probes are real HTTP checks. Set ANTHROPIC_API_KEY and remove MOCK_AGENT for live research.",
  "model": "claude-sonnet-4-5",
  "cache": "memory",
  "composioCheck": false,
  "generateKeyRequired": false,
  "rateLimitPerHourPerIp": 10,
  "curatedGuides": ["atlassian-jira", "github", "google-gmail", "microsoft-entra", "slack", "x-twitter"],
  "demoFixtureApps": ["Linear", "Notion", "HubSpot", "Cal.com", "Mercury", "Resend", "Zoom", "Discord", "Dropbox", "Salesforce", "Stripe"],
  "endpoints": { "...": "..." },
  "docs": { "...": "..." }
}
```

`mode` is `demo` when `MOCK_AGENT=1`, `live` when an Anthropic key is configured, otherwise `unconfigured` (generation refuses requests). Secret values are never returned.

## GET /api/guides

```bash
curl -s https://oauth-pathfinder-blue.vercel.app/api/guides
```

```json
{
  "mode": "demo",
  "count": 7,
  "generate": "POST https://oauth-pathfinder-blue.vercel.app/api/generate with {\"query\": \"<app name or url>\"} streams a new guide as text/event-stream",
  "guides": [
    {
      "slug": "github",
      "name": "GitHub",
      "tier": "library",
      "generatedBy": "curated",
      "demo": false,
      "difficulty": 1,
      "difficultyLabel": "Trivial",
      "timeToDevReady": "10–20 minutes",
      "timeToProduction": "10–20 minutes",
      "supportsOAuth": true,
      "hardBlockers": 0,
      "verification": "human-verified",
      "lastVerifiedAt": "2026-10-28T00:00:00Z",
      "tldr": "GitHub is the easy case: ...",
      "links": {
        "page": "https://oauth-pathfinder-blue.vercel.app/guide/github",
        "json": "https://oauth-pathfinder-blue.vercel.app/api/guides/github",
        "markdown": "https://oauth-pathfinder-blue.vercel.app/api/guides/github?format=md"
      }
    }
  ]
}
```

Curated guides come first, sorted by difficulty then name; live guides cached on this instance follow. `demo` is true when the guide came from fixtures.

## GET /api/guides/{slug}

```bash
curl -s https://oauth-pathfinder-blue.vercel.app/api/guides/slack | head -c 400
```

```json
{
  "tier": "library",
  "guide": { "schemaVersion": 1, "slug": "slack", "app": { "name": "Slack", "...": "..." }, "...": "..." }
}
```

`tier` is `library` (curated file) or `live` (generated). The `guide` object follows [guide.schema.json](./guide.schema.json); field meanings are in [GUIDE_SCHEMA.md](./GUIDE_SCHEMA.md). Unknown slug → `404 {"error": "No guide with that slug"}`. In demo mode an unknown live slug is rebuilt from fixtures (or the generic fallback) instead of returning 404.

### Markdown

```bash
curl -s "https://oauth-pathfinder-blue.vercel.app/api/guides/slack?format=md"
```

Returns `text/markdown; charset=utf-8` with `Content-Disposition: inline; filename="slack-oauth-guide.md"`. The document starts with the title, the live URL, generation and verification dates, the TL;DR, an "At a glance" table, then blockers, prerequisites, Path 1, Path 2, requirements checklist, gotchas, when stuck, still uncertain, verification and numbered sources. Evidence appears as `_Documented [1][2]_` after each item, so an agent reading the Markdown keeps the provenance.

## POST /api/generate

Request body:

```json
{ "query": "HubSpot", "force": false }
```

| Field | Type | Notes |
|---|---|---|
| `query` | string, 1–200 chars | App name or website URL. Ambiguous names are resolved with a stated reason. |
| `force` | boolean, optional | Skip the cache and regenerate. |

Optional header `x-generate-key: <GENERATE_KEY>` (or `?key=`) when the deployment is gated.

### Cached response (JSON)

If a curated or cached guide exists and `force` is not set:

```json
{ "cached": true, "slug": "slack", "tier": "library" }
```

### Streaming response (text/event-stream)

```bash
curl -N -s -X POST https://oauth-pathfinder-blue.vercel.app/api/generate \
  -H 'content-type: application/json' -d '{"query":"Mercury","force":true}'
```

```
data: {"type":"stage","stage":"resolve","message":"Working out what \"Mercury\" is and where its developer docs live"}

data: {"type":"activity","stage":"resolve","kind":"search","detail":"Mercury API developer docs"}

data: {"type":"activity","stage":"resolve","kind":"note","detail":"Ambiguous name. Picking Mercury the bank (mercury.com): ..."}

data: {"type":"result","stage":"resolve","data":{"name":"Mercury","website":"https://mercury.com/", "...":"..."}}

data: {"type":"stage","stage":"investigate","message":"Reading Mercury's docs on app registration, review and scopes"}

data: {"type":"stage","stage":"probe","message":"Running live checks: discovery metadata, developer portal, Composio managed auth"}

data: {"type":"activity","stage":"probe","kind":"probe","detail":"OAuth/OIDC discovery document: no (https://mercury.com/.well-known/oauth-authorization-server)"}

data: {"type":"activity","stage":"synthesize","kind":"note","detail":"Draft ready: difficulty 4/5, 2 dev steps, 3 production steps, 6 sources."}

data: {"type":"stage","stage":"verify","message":"Auditing every claim against the memo and visited pages; downgrading anything unsupported"}

data: {"type":"stage","stage":"done","message":"Guide ready"}

data: {"type":"done","guide":{ "...": "..." },"auditLog":["..."],"stats":{"searches":3,"fetches":2,"inputTokens":6900,"outputTokens":1050}}
```

Event types:

| `type` | Fields | Meaning |
|---|---|---|
| `stage` | `stage`, `message` | A stage started. `investigate` and `probe` start together. |
| `activity` | `stage`, `kind` (`search` \| `fetch` \| `probe` \| `note`), `detail` | One search query, one page read, one probe result, or a note from the stage. |
| `result` | `stage`, `data` | Structured output of resolve, investigate (finding count and unknowns) and probe. |
| `done` | `guide`, `auditLog`, `stats` | Final guide (validated), the verifier's audit lines, and usage counters. |
| `error` | `stage`, `message` | The run stopped. The stream closes after this. |

Keep-alive comment lines (`: keep-alive`) are sent every 15 s and must be ignored by clients. The route declares `maxDuration = 300` seconds; demo runs take about 8 s, live runs 1–3 minutes.

### Errors

| Status | Body | When |
|---|---|---|
| 400 | `{"error":"Give me an app name or website (1-200 chars)."}` | Empty or too-long query |
| 401 | `{"error":"Generation is key-protected on this deployment."}` | `GENERATE_KEY` set and not supplied |
| 429 | `{"error":"Rate limit: too many generations from this network this hour. ..."}` | Per-IP hourly limit (cached results do not count) |
| 500 | `{"error":"ANTHROPIC_API_KEY is not configured on the server."}` | Neither a key nor `MOCK_AGENT=1` |

## Pages

| Path | What it renders |
|---|---|
| `/` | Hero with submit box, stats strip, provider marquee, curated library, live-generated guides on this instance, how it works |
| `/generate?q=<query>[&force=1]` | The streaming run; redirects to the guide when done |
| `/guide/{slug}` | The guide; `Copy link`, `Copy as Markdown`, `Download .md`, `JSON` actions |

## Using the API from an agent

1. `GET /api/guides` to see what exists; open `links.markdown` for anything relevant.
2. If the app is missing, `POST /api/generate` and read the stream until `done`; the `guide` in that event is complete and validated, no second fetch needed.
3. Treat `inferred` evidence as a hypothesis to verify, and read `verification.corrected` and `openQuestions` before relying on timelines.
