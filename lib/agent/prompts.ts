import { GUIDE_SHAPE_FOR_PROMPT } from "../schema";

/**
 * Shared framing. Every stage sees this so the vocabulary stays consistent.
 */
export const DOMAIN_PRIMER = `
You help developers who are building AI agents or integrations and need their users to connect a third-party app.
Before users can connect, the developer usually has to register an OAuth app with the provider (client ID/secret,
redirect URIs, scopes, consent-screen branding), and sometimes get that app approved.

Use this mental model everywhere:

TWO CLOCKS
- "Dev-ready": the developer can obtain a token for themselves or a handful of test users. Usually minutes to an hour.
- "Production": any user can connect without warnings, user caps, or admin consent. This is where the real waiting lives:
  verification reviews, security assessments (e.g. Google CASA), publisher/business verification, marketplace review,
  paid API tiers, partner programs, demo videos, privacy policies.
The developer's real question is "hour or weeks?", and that is almost always about the production clock.

OWNERSHIP
- "agent": research, drafting values, choosing minimum scopes, writing privacy-policy/scope-justification drafts, scripting the demo video, pre-filling forms.
- "you": anything needing a login, accepting terms, verifying a business, paying, recording a video, clicking submit.

EVIDENCE DISCIPLINE
- "documented": stated on an official provider page you actually fetched or saw in search results. Cite it.
- "reported": community posts, vendor blogs, forums. Typical for timing and cost. Cite it and say it is reported.
- "tested": only for things actually attempted (probes in this pipeline, or a human attempt). Never invent a test.
- "inferred": your best reading when sources are thin. Say so. Prefer "unknown" over a confident guess.
Never fabricate a console path, a scope name, a price or a timeline. If you did not see it, mark it inferred or leave it out.
`;

export const RESOLVE_SYSTEM = `${DOMAIN_PRIMER}
Task: identify the app the developer means and locate its developer documentation. Output JSON only.`;

export function resolveUser(query: string): string {
  return `The developer typed: "${query}"

Figure out which app/service this is. If it is a URL, use the domain. If ambiguous (e.g. "Mercury" could be a bank or a browser), pick the most likely SaaS/API product developers integrate with and say why in "ambiguityNote".

Search for the official developer docs and, specifically, where a developer registers an OAuth app (developer console / app settings page). Also determine whether the API supports OAuth at all, or only API keys / tokens.

Return exactly this JSON:
{
  "name": "Canonical product name",
  "website": "https://...",
  "docsUrl": "https://... (developer docs home, if found)",
  "developerPortalUrl": "https://... (where you create an app, if found)",
  "category": "short category, e.g. CRM, Email, Project management",
  "oneLiner": "what the product is, one sentence",
  "supportsOAuth": true | false | "unknown",
  "authMethodsSeen": ["oauth2", "api_key", ...],
  "ambiguityNote": "optional",
  "confidence": "high" | "medium" | "low"
}`;
}

export const INVESTIGATE_SYSTEM = `${DOMAIN_PRIMER}
Task: investigate the OAuth app setup and approval path for one provider and write a structured research memo.
Use web_search for discovery and web_fetch to read the official pages that matter most (app registration, distribution/review/verification, scopes, pricing/access tiers). Prefer official docs; use community posts for timing/cost signals and label them as such.
Be concrete: console paths, field names, scope names, tier names, review names, numbers with their source.
Output the memo as JSON only.`;

export function investigateUser(resolved: {
  name: string;
  website?: string;
  docsUrl?: string;
  developerPortalUrl?: string;
  supportsOAuth?: boolean | "unknown";
}): string {
  return `Provider: ${resolved.name}
Website: ${resolved.website ?? "unknown"}
Docs: ${resolved.docsUrl ?? "unknown"}
Developer portal: ${resolved.developerPortalUrl ?? "unknown"}
OAuth support from resolve stage: ${String(resolved.supportsOAuth ?? "unknown")}

Answer these questions, each with the URL(s) that support the answer. Where a question cannot be answered from what you find, write "unknown" rather than guessing.

1. Registration: Where exactly does a developer create an OAuth app? What account type is needed (any account / developer program / workspace admin / business account)? Is there a cost or approval just to create the app?
2. Flows: Which OAuth flows are supported (authorization code, PKCE, client credentials, device code, OAuth 1.0a)? Any alternative auth (API keys, personal tokens)?
3. Dev mode limits: In the initial state, who can authorize the app? Any test-user caps, "development mode", token expiry quirks, or "unverified app" warnings?
4. Production gate: What must happen before ANY user can connect cleanly? Name the process (e.g. "app review", "verification", "publisher verification", "public distribution", "marketplace listing", "security assessment"). Is it mandatory, or only for a listing?
5. Scope tiers: Are scopes tiered (basic / sensitive / restricted / advanced-access)? Which tiers trigger review?
6. Requirements for review: privacy policy URL, terms URL, verified domain, homepage, logo, demo video, business verification, registered company, support email, security questionnaire, SOC2/pen test, etc.
7. Timing and cost: Documented or reported review durations and costs (assessments, paid tiers, partner fees). Mark each as documented or reported.
8. Common blockers and rejection reasons, and the official support/appeal channel.
9. Rate limits or quotas tied to app verification status, if any.
10. Anything that makes this provider unusual (rotating refresh tokens, single callback URL, region restrictions, admin consent, app must be "installed" per workspace, etc.).

Return exactly this JSON:
{
  "findings": [
    { "topic": "registration" | "flows" | "devLimits" | "productionGate" | "scopeTiers" | "reviewRequirements" | "timingCost" | "blockers" | "rateLimits" | "unusual",
      "claim": "one precise statement",
      "evidenceLevel": "documented" | "reported" | "inferred",
      "urls": ["https://..."],
      "quoteOrDetail": "a short supporting excerpt or detail (under 25 words)" }
  ],
  "sourcesSeen": [ { "url": "https://...", "title": "...", "type": "official" | "community" } ],
  "unknowns": ["questions you could not answer"]
}
Aim for 15-30 findings. Quality over quantity.`;
}

export const SYNTHESIZE_SYSTEM = `${DOMAIN_PRIMER}
Task: turn a research memo plus probe results into a developer-facing readiness guide that follows the schema exactly.
Write for a developer who will follow this without you in the room. Short, specific, no hedging filler.
Output JSON only. No prose before or after.`;

export function synthesizeUser(args: {
  resolved: any;
  memo: any;
  probes: any[];
  composio: any;
  visitedUrls: { url: string; title?: string }[];
  now: string;
  slug: string;
}): string {
  return `Today: ${args.now}
Slug to use: ${args.slug}

RESOLVED APP:
${JSON.stringify(args.resolved, null, 2)}

RESEARCH MEMO:
${JSON.stringify(args.memo, null, 2)}

LIVE PROBES (these are real HTTP checks; cite them with evidence level "tested" and source type "probe"):
${JSON.stringify(args.probes, null, 2)}

COMPOSIO MANAGED-AUTH CHECK:
${JSON.stringify(args.composio, null, 2)}

URLS THE PIPELINE ACTUALLY VISITED (only these may appear as "documented"/"reported" sources; do not invent URLs):
${args.visitedUrls.map((u) => `- ${u.url}${u.title ? ` (${u.title})` : ""}`).join("\n")}

Write the guide as JSON with this shape:
${GUIDE_SHAPE_FOR_PROMPT}

Rules:
- "sources": build it from the visited URLs you rely on plus one entry per probe (type "probe", url = probe url). Give each an id like "s1", "s2"... and reference those ids in evidence.sourceIds.
- Every step/requirement/gotcha/blocker needs evidence. "documented" and "reported" need at least one sourceId. Use "inferred" with an empty sourceIds when you are reasoning without a source, and say so in note.
- "paths.dev" ends when the developer can get a token for themselves. "paths.production" starts there and ends when any user can connect cleanly. If no extra production steps exist, make production an empty array and say so in tldr.
- "timeToProduction" must include approval waiting time. If reviews are only needed for a marketplace listing, say so in the note and give the no-listing number.
- Difficulty: 1 trivial (create app, done) / 2 easy / 3 moderate (a distribution or review step, or tricky scopes) / 4 hard (a verification process with real waiting) / 5 gated (paid tier, security assessment, business verification or partner program). Explain in difficultyReason.
- Owners: label every step "agent", "you" or "either" using the OWNERSHIP rules. Pre-fill "values" for fields the agent can decide (app name, redirect URI placeholder like https://YOUR_DOMAIN/oauth/callback, minimum scopes, homepage URL placeholder).
- If supportsOAuth is false: still produce a valid guide. Set oauth.supportsOAuth=false, difficulty based on the alternative (API key is usually 1), describe the alternative path in paths.dev, and say clearly in tldr that no OAuth app exists to register.
- If Composio check outcome is "yes": put that in tldr first ("Composio already provides a managed OAuth app for X; you only need your own app if..."), set oauth.composioManaged="yes" and composioToolkitSlug.
- If dynamic client registration probe is "yes": mention in tldr and gotchas that an MCP-style client may register itself without a manual app.
- "openQuestions": list what you could not pin down. Be honest; this list is read by the evaluator.
- Keep verification as {"status":"unverified","checkedClaims":0,"corrected":[],"unverifiable":[]}; a later stage fills it.
- generatedBy: "agent". generatedAt and lastVerifiedAt: today.`;
}

export const VERIFY_SYSTEM = `${DOMAIN_PRIMER}
Task: audit a generated guide against the research memo and the list of URLs that were actually visited.
You are the skeptic. Your job is to downgrade, correct or flag, never to add new unsourced facts.
Output JSON only.`;

export function verifyUser(args: { guide: any; memo: any; visitedUrls: string[] }): string {
  return `GUIDE TO AUDIT:
${JSON.stringify(args.guide, null, 2)}

RESEARCH MEMO (ground truth gathered by the investigate stage):
${JSON.stringify(args.memo, null, 2)}

URLS ACTUALLY VISITED:
${args.visitedUrls.join("\n")}

Check every item in summary.blockers, prerequisites, paths.dev, paths.production, requirements, gotchas and whenStuck:
a) Does the memo contain a finding that supports it? If not, and it is marked "documented" or "reported", downgrade to "inferred" and clear sourceIds.
b) Does every sourceId point at a source whose url is in the visited list? If a source url was not visited, remove it from "sources" and from any sourceIds; re-level the affected evidence.
c) Are the numbers (times, costs, caps) consistent with the memo? Fix them to match the memo, or mark inferred.
d) Is any step claiming the agent can do something that actually requires a login, payment, or legal acceptance? Change owner to "you".
e) Is timeToProduction consistent with the production steps and blockers? Adjust.
f) Does tldr overpromise? Tighten it.

Return exactly this JSON:
{
  "guide": <the full corrected guide JSON, same schema, with verification filled in as:
    "verification": { "status": "agent-verified", "checkedClaims": <count of items checked>, "corrected": ["short description of each change"], "unverifiable": ["items left as inferred because no source supports them"], "notes": "one or two sentences" } >,
  "auditLog": ["one line per check performed, including ones that passed"]
}`;
}
