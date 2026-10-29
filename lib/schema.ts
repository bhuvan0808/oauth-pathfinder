import { z } from "zod";

/**
 * The guide schema is the contract between four things:
 *  - the agent pipeline (synthesis + verification output must validate against it)
 *  - the curated library in /data/guides
 *  - the UI (renders only from this shape)
 *  - the markdown export (shareable guide)
 *
 * Design rule: every claim that a developer would act on carries Evidence.
 * "tested" is reserved for things a human or agent actually attempted.
 */

export const EvidenceLevel = z.enum(["tested", "documented", "reported", "inferred"]);
export type EvidenceLevel = z.infer<typeof EvidenceLevel>;

export const Evidence = z.object({
  level: EvidenceLevel,
  /** ids from Guide.sources. Empty only allowed for "inferred". */
  sourceIds: z.array(z.string()).default([]),
  note: z.string().optional()
});
export type Evidence = z.infer<typeof Evidence>;

export const Source = z.object({
  id: z.string(),
  url: z.string().url(),
  title: z.string(),
  /** official = provider docs/console; community = forums, blogs, vendors; composio = Composio docs/API; probe = a live check the pipeline ran */
  type: z.enum(["official", "community", "composio", "probe"]),
  fetchedAt: z.string().optional()
});
export type Source = z.infer<typeof Source>;

export const Owner = z.enum(["agent", "you", "either"]);
export type Owner = z.infer<typeof Owner>;

export const Duration = z.object({
  min: z.number().nonnegative(),
  max: z.number().nonnegative(),
  unit: z.enum(["minutes", "hours", "days", "weeks", "months"]),
  confidence: z.enum(["high", "medium", "low"]),
  note: z.string().optional()
});
export type Duration = z.infer<typeof Duration>;

export const Step = z.object({
  title: z.string(),
  detail: z.string(),
  owner: Owner,
  /** human-readable effort, e.g. "5 min", "1-2 hours", "1 week waiting" */
  effort: z.string(),
  /** where in the provider console this happens, e.g. "Developer Console > My apps > Create" */
  consoleLocation: z.string().optional(),
  /** concrete values to enter. The agent pre-fills these where it can. */
  values: z.array(z.object({ field: z.string(), value: z.string() })).optional(),
  evidence: Evidence
});
export type Step = z.infer<typeof Step>;

export const Requirement = z.object({
  item: z.string(),
  required: z.boolean(),
  notes: z.string().optional(),
  evidence: Evidence
});

export const Gotcha = z.object({
  title: z.string(),
  detail: z.string(),
  evidence: Evidence
});

export const StuckEntry = z.object({
  situation: z.string(),
  action: z.string(),
  link: z.string().url().optional(),
  evidence: Evidence
});

export const Blocker = z.object({
  text: z.string(),
  /** hard = cannot proceed to production without it; soft = slows you down */
  severity: z.enum(["hard", "soft"]),
  evidence: Evidence
});

export const TriState = z.enum(["yes", "no", "unknown"]);

export const Guide = z.object({
  schemaVersion: z.literal(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  app: z.object({
    name: z.string(),
    website: z.string().url().optional(),
    docsUrl: z.string().url().optional(),
    developerPortalUrl: z.string().url().optional(),
    category: z.string().optional(),
    oneLiner: z.string().optional()
  }),
  generatedBy: z.enum(["curated", "agent"]),
  generatedAt: z.string(),
  lastVerifiedAt: z.string(),

  oauth: z.object({
    supportsOAuth: z.boolean(),
    /** e.g. "authorization_code", "pkce", "client_credentials", "device_code", "oauth1" */
    flows: z.array(z.string()),
    /** other auth methods the app supports, e.g. "api_key", "personal_access_token" */
    alternatives: z.array(z.string()),
    composioManaged: TriState,
    composioToolkitSlug: z.string().optional(),
    /** does the provider expose RFC 8414 metadata + dynamic client registration (MCP-style)? */
    dynamicClientRegistration: TriState,
    notes: z.string().optional()
  }),

  summary: z.object({
    /** 1 trivial, 2 easy, 3 moderate, 4 hard, 5 gated */
    difficulty: z.number().int().min(1).max(5),
    difficultyReason: z.string(),
    timeToDevReady: Duration,
    timeToProduction: Duration,
    cost: z.string(),
    blockers: z.array(Blocker),
    tldr: z.string()
  }),

  prerequisites: z.array(z.object({ text: z.string(), owner: Owner, evidence: Evidence })),

  paths: z.object({
    dev: z.array(Step),
    production: z.array(Step)
  }),

  requirements: z.array(Requirement),
  gotchas: z.array(Gotcha),
  whenStuck: z.array(StuckEntry),
  sources: z.array(Source),

  verification: z.object({
    status: z.enum(["unverified", "agent-verified", "human-verified"]),
    checkedClaims: z.number().int().nonnegative(),
    corrected: z.array(z.string()),
    unverifiable: z.array(z.string()),
    notes: z.string().optional()
  }),

  openQuestions: z.array(z.string())
});
export type Guide = z.infer<typeof Guide>;

/** Strict validate; throws a readable error listing every issue. */
export function parseGuide(input: unknown): Guide {
  const result = Guide.safeParse(input);
  if (!result.success) {
    const issues = result.error.issues
      .slice(0, 25)
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Guide failed validation:\n${issues}`);
  }
  // Cross-field integrity: every sourceId must exist; non-inferred evidence needs at least one source.
  const guide = result.data;
  const ids = new Set(guide.sources.map((s) => s.id));
  const problems: string[] = [];
  const check = (where: string, e: Evidence) => {
    for (const id of e.sourceIds) if (!ids.has(id)) problems.push(`${where}: unknown sourceId "${id}"`);
    if (e.level !== "inferred" && e.sourceIds.length === 0) problems.push(`${where}: "${e.level}" evidence needs a source`);
  };
  guide.summary.blockers.forEach((b, i) => check(`summary.blockers[${i}]`, b.evidence));
  guide.prerequisites.forEach((p, i) => check(`prerequisites[${i}]`, p.evidence));
  guide.paths.dev.forEach((s, i) => check(`paths.dev[${i}]`, s.evidence));
  guide.paths.production.forEach((s, i) => check(`paths.production[${i}]`, s.evidence));
  guide.requirements.forEach((r, i) => check(`requirements[${i}]`, r.evidence));
  guide.gotchas.forEach((g, i) => check(`gotchas[${i}]`, g.evidence));
  guide.whenStuck.forEach((w, i) => check(`whenStuck[${i}]`, w.evidence));
  if (problems.length) throw new Error(`Guide failed integrity checks:\n${problems.join("\n")}`);
  return guide;
}

/** The JSON Schema-ish description we hand to the model. Kept in prose to avoid drift with zod. */
export const GUIDE_SHAPE_FOR_PROMPT = `
{
  "schemaVersion": 1,
  "slug": "lowercase-kebab",
  "app": { "name", "website?", "docsUrl?", "developerPortalUrl?", "category?", "oneLiner?" },
  "generatedBy": "agent",
  "generatedAt": ISO, "lastVerifiedAt": ISO,
  "oauth": {
    "supportsOAuth": bool,
    "flows": ["authorization_code" | "pkce" | "client_credentials" | "device_code" | "oauth1" | ...],
    "alternatives": ["api_key" | "personal_access_token" | "basic_auth" | ...],
    "composioManaged": "yes"|"no"|"unknown", "composioToolkitSlug?": string,
    "dynamicClientRegistration": "yes"|"no"|"unknown", "notes?": string
  },
  "summary": {
    "difficulty": 1..5,  // 1 trivial (create app, done) .. 5 gated (paid tier, business verification, security assessment, or partner program)
    "difficultyReason": string,
    "timeToDevReady":   { "min", "max", "unit": "minutes"|"hours"|"days"|"weeks"|"months", "confidence": "high"|"medium"|"low", "note?" },
    "timeToProduction": { same shape },  // time until ANY user can connect without caps/warnings, including approval waits
    "cost": string,
    "blockers": [{ "text", "severity": "hard"|"soft", "evidence": Evidence }],
    "tldr": string (2-3 sentences, the thing a developer screenshots for their team)
  },
  "prerequisites": [{ "text", "owner": "agent"|"you"|"either", "evidence": Evidence }],
  "paths": {
    "dev":        [Step],  // until you can get a token for yourself / test users
    "production": [Step]   // until any user can connect; approvals, verification, listing
  },
  "requirements": [{ "item", "required": bool, "notes?", "evidence": Evidence }],  // privacy policy URL, verified domain, demo video, business entity, ...
  "gotchas": [{ "title", "detail", "evidence": Evidence }],
  "whenStuck": [{ "situation", "action", "link?", "evidence": Evidence }],
  "sources": [{ "id": "s1", "url", "title", "type": "official"|"community"|"composio"|"probe", "fetchedAt?" }],
  "verification": { "status": "unverified", "checkedClaims": 0, "corrected": [], "unverifiable": [], "notes?" },
  "openQuestions": [string]
}
Step = { "title", "detail", "owner": "agent"|"you"|"either", "effort": string, "consoleLocation?": string, "values?": [{ "field", "value" }], "evidence": Evidence }
Evidence = { "level": "tested"|"documented"|"reported"|"inferred", "sourceIds": ["s1"], "note?": string }
`;
