/**
 * Mock mode (MOCK_AGENT=1): fixture responses for each pipeline stage so the whole flow (parsing,
 * validation, retry, source filtering, verification, SSE, caching) runs without an API key.
 *
 * What is real even in mock mode: the probe stage (lib/agent/probe.ts) still makes live HTTP
 * requests, and its results are folded into the fixture guide as "tested" evidence.
 *
 * What is fixture: the resolve/investigate "research" text, the synthesis draft and the audit.
 * Every mock guide is labelled DEMO MODE in verification.notes and the UI shows a banner.
 *
 * Fixtures exist for Linear, Notion, HubSpot, Cal.com, Mercury and Resend. Any other query falls
 * back to a deliberately low-confidence generic guide where every claim is "inferred": the shape a
 * real run produces for an obscure app with thin documentation.
 *
 * The Linear fixture deliberately includes a first synthesis draft that fails validation (retry path),
 * a source URL the pipeline never visited (drop + re-level path) and a step wrongly owned by "agent"
 * (verify path), so the whole error-handling surface is exercised on every demo run.
 */
import type { ResearchResult, VisitedSource } from "./client";

type Act = { kind: "search" | "fetch" | "text"; detail: string; wait?: number };
type Ev = { level: "tested" | "documented" | "reported" | "inferred"; sourceIds: string[]; note?: string };

type Resolved = {
  name: string;
  website?: string;
  docsUrl?: string;
  developerPortalUrl?: string;
  category?: string;
  oneLiner?: string;
  supportsOAuth?: boolean | "unknown";
  authMethodsSeen?: string[];
  ambiguityNote?: string;
  confidence?: "high" | "medium" | "low";
};

type Fixture = {
  key: string;
  aliases: string[];
  resolved: Resolved;
  resolveActivity: Act[];
  investigateActivity: Act[];
  visited: VisitedSource[];
  memo: { findings: unknown[]; unknowns: string[] };
  draft: (ctx: { now: string; slug: string; retry: boolean }) => any;
};

// Fixture delays make the live log feel real. When a guide is rebuilt silently (cache miss on a fresh
// serverless instance) they are skipped so the page still loads in a couple of seconds.
let fastDepth = 0;
const delay = (ms: number) => (fastDepth > 0 ? Promise.resolve() : new Promise((r) => setTimeout(r, ms)));

/** Run fn with all fixture delays disabled. */
export async function withoutMockDelays<T>(fn: () => Promise<T>): Promise<T> {
  fastDepth++;
  try {
    return await fn();
  } finally {
    fastDepth--;
  }
}
const ev = (level: Ev["level"], sourceIds: string[] = [], note?: string): Ev => ({ level, sourceIds, ...(note ? { note } : {}) });
const src = (id: string, url: string, title: string, type: "official" | "community" = "official") => ({ id, url, title, type });

// ---------------------------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------------------------

const LINEAR_VISITED: VisitedSource[] = [
  { url: "https://linear.app/developers/oauth-2-0-authentication", title: "Linear Developers: OAuth 2.0 authentication", via: "fetch" },
  { url: "https://linear.app/developers", title: "Linear Developers", via: "search" },
  { url: "https://linear.app/settings/api/applications/new", title: "Linear: create OAuth application", via: "search" }
];

const linear: Fixture = {
  key: "linear",
  aliases: ["linear", "linear.app", "linear app"],
  resolved: {
    name: "Linear",
    website: "https://linear.app",
    docsUrl: "https://linear.app/developers",
    developerPortalUrl: "https://linear.app/settings/api/applications/new",
    category: "Project management",
    oneLiner: "Issue tracking for software teams.",
    supportsOAuth: true,
    authMethodsSeen: ["oauth2", "api_key"],
    confidence: "high"
  },
  resolveActivity: [
    { kind: "search", detail: "Linear developer docs OAuth", wait: 500 },
    { kind: "text", detail: "Developer docs at linear.app/developers; OAuth apps are created in workspace settings.", wait: 300 }
  ],
  investigateActivity: [
    { kind: "search", detail: "Linear OAuth application create redirect URL scopes", wait: 500 },
    { kind: "fetch", detail: "https://linear.app/developers/oauth-2-0-authentication", wait: 900 },
    { kind: "search", detail: "Linear OAuth app review approval public application", wait: 600 },
    { kind: "search", detail: "Linear OAuth token expiry actor application", wait: 500 },
    { kind: "text", detail: "No review or approval process mentioned anywhere; scopes are flat.", wait: 300 }
  ],
  visited: LINEAR_VISITED,
  memo: {
    findings: [
      { topic: "registration", claim: "OAuth applications are created from workspace settings under API > Applications; any workspace member with access can create one.", evidenceLevel: "documented", urls: [LINEAR_VISITED[0].url], quoteOrDetail: "Create an OAuth2 application in Linear settings" },
      { topic: "flows", claim: "Authorization code flow with client secret; access tokens do not currently expire.", evidenceLevel: "documented", urls: [LINEAR_VISITED[0].url], quoteOrDetail: "authorization code grant" },
      { topic: "productionGate", claim: "No review or approval step; a public application can be authorized by any Linear user once created.", evidenceLevel: "documented", urls: [LINEAR_VISITED[0].url], quoteOrDetail: "no approval mentioned" },
      { topic: "scopeTiers", claim: "Scopes are flat (read, write, issues:create, comments:create, admin); no tiers requiring review.", evidenceLevel: "documented", urls: [LINEAR_VISITED[0].url], quoteOrDetail: "scope list" },
      { topic: "unusual", claim: "Apps can act as an 'application' actor or as the user, which changes who comments appear from.", evidenceLevel: "documented", urls: [LINEAR_VISITED[0].url], quoteOrDetail: "actor=application" },
      { topic: "timingCost", claim: "Free.", evidenceLevel: "inferred", urls: [], quoteOrDetail: "no pricing for OAuth apps found" }
    ],
    unknowns: ["Whether Linear plans a marketplace with review"]
  },
  draft: ({ now, slug, retry }) => ({
    schemaVersion: 1,
    slug,
    app: { name: "Linear", website: "https://linear.app", docsUrl: "https://linear.app/developers", developerPortalUrl: "https://linear.app/settings/api/applications/new", category: "Project management", oneLiner: "Issue tracking for software teams." },
    generatedBy: "agent",
    generatedAt: now,
    lastVerifiedAt: now,
    oauth: { supportsOAuth: true, flows: ["authorization_code"], alternatives: ["api_key"], composioManaged: "unknown", composioToolkitSlug: "linear", dynamicClientRegistration: "unknown" },
    summary: {
      // First draft is deliberately broken (difficulty out of range, tldr missing) to exercise the retry path.
      difficulty: retry ? 1 : 9,
      difficultyReason: "Create the application in settings; no review, flat scopes, any user can authorize immediately.",
      timeToDevReady: { min: 10, max: 15, unit: "minutes", confidence: "high" },
      timeToProduction: { min: 10, max: 15, unit: "minutes", confidence: "high", note: "Same as dev-ready; no approval step found." },
      cost: "Free",
      blockers: [],
      ...(retry ? { tldr: "Linear is one of the easy ones: create an OAuth application in workspace settings, add a redirect URL, and any Linear user can authorize it right away. No review, no tiers." } : {})
    },
    prerequisites: [{ text: "A Linear workspace (the free plan works).", owner: "you", evidence: ev("documented", ["s1"]) }],
    paths: {
      dev: [
        { title: "Create the OAuth application", detail: "Settings > API > Applications > New. Enter the app name, developer name, URLs and the redirect URL. The client ID and secret are shown on the application page.", owner: "you", effort: "5 min", consoleLocation: "Settings > API > Applications", values: [{ field: "Redirect URL", value: "https://YOUR_DOMAIN/oauth/callback/linear" }, { field: "Public", value: "on, so users outside your workspace can authorize" }], evidence: ev("documented", ["s1", "s3"]) },
        { title: "Choose scopes", detail: "read, write, issues:create and comments:create cover most agents; admin only if you manage workspace settings. Scopes go in the authorize URL.", owner: "agent", effort: "2 min", values: [{ field: "scope", value: "read write issues:create comments:create" }], evidence: ev("documented", ["s1"]) },
        { title: "Pick the actor", detail: "Add actor=application to the authorize URL if comments and issues should appear as the app rather than the connecting user.", owner: "agent", effort: "1 min", evidence: ev("documented", ["s1"]) },
        { title: "Run the authorization code flow once", detail: "Redirect to https://linear.app/oauth/authorize, exchange the code at https://api.linear.app/oauth/token. Tokens do not currently expire, so store them carefully.", owner: "agent", effort: "10 min", evidence: ev("documented", ["s1"]) },
        // Deliberately wrong: owned by the agent, cites a page the pipeline never visited. Verify must remove it.
        { title: "Submit the app for Linear review", detail: "Wait for Linear to approve the application.", owner: "agent", effort: "1 week", evidence: ev("documented", ["s4"]) }
      ],
      production: []
    },
    requirements: [
      { item: "Redirect URL (HTTPS, exact match)", required: true, evidence: ev("documented", ["s1"]) },
      { item: "App name and developer name shown on the consent screen", required: true, evidence: ev("documented", ["s1"]) },
      { item: "Privacy policy or terms URL", required: false, notes: "Not required to create the app.", evidence: ev("inferred", [], "Form fields seen in docs; not listed as mandatory.") }
    ],
    gotchas: [
      { title: "Actor setting", detail: "Choose whether actions appear as the app or the user; it affects comment attribution and cannot be changed per request after the fact.", evidence: ev("documented", ["s1"]) },
      { title: "Non-expiring tokens", detail: "Access tokens do not expire, so revocation is on you: users revoke from Settings > API, or you call the revoke endpoint.", evidence: ev("documented", ["s1"]) }
    ],
    whenStuck: [
      { situation: "Redirect mismatch error", action: "The redirect URL must match exactly, including scheme and trailing slash.", evidence: ev("inferred") },
      { situation: "Users outside your workspace cannot authorize", action: "Mark the application as Public in its settings; private applications only work inside the creating workspace.", evidence: ev("documented", ["s1"]) }
    ],
    sources: [
      src("s1", LINEAR_VISITED[0].url, LINEAR_VISITED[0].title!),
      src("s2", LINEAR_VISITED[1].url, LINEAR_VISITED[1].title!),
      src("s3", LINEAR_VISITED[2].url, LINEAR_VISITED[2].title!),
      src("s4", "https://linear.app/developers/app-review-process", "Invented page that was never visited")
    ],
    verification: { status: "unverified", checkedClaims: 0, corrected: [], unverifiable: [] },
    openQuestions: ["Whether Linear plans a marketplace with review"]
  })
};

const NOTION_VISITED: VisitedSource[] = [
  { url: "https://developers.notion.com/docs/authorization", title: "Notion Developers: Authorization (public integrations and OAuth)", via: "fetch" },
  { url: "https://developers.notion.com/docs/create-a-notion-integration", title: "Notion Developers: Build your first integration", via: "fetch" },
  { url: "https://www.notion.so/profile/integrations", title: "Notion: My integrations", via: "search" },
  { url: "https://developers.notion.com/docs/getting-started", title: "Notion Developers: Getting started", via: "search" }
];

const notion: Fixture = {
  key: "notion",
  aliases: ["notion", "notion.so", "notion.com"],
  resolved: {
    name: "Notion",
    website: "https://www.notion.so",
    docsUrl: "https://developers.notion.com",
    developerPortalUrl: "https://www.notion.so/profile/integrations",
    category: "Docs and knowledge base",
    oneLiner: "Connected workspace for docs, wikis and databases.",
    supportsOAuth: true,
    authMethodsSeen: ["oauth2", "internal_integration_token"],
    confidence: "high"
  },
  resolveActivity: [
    { kind: "search", detail: "Notion public integration OAuth developer docs", wait: 500 },
    { kind: "text", detail: "Developer docs at developers.notion.com; integrations are created at notion.so/profile/integrations.", wait: 300 }
  ],
  investigateActivity: [
    { kind: "search", detail: "Notion public integration requirements privacy policy redirect URI", wait: 500 },
    { kind: "fetch", detail: "https://developers.notion.com/docs/authorization", wait: 1000 },
    { kind: "fetch", detail: "https://developers.notion.com/docs/create-a-notion-integration", wait: 800 },
    { kind: "search", detail: "Notion integration gallery listing review", wait: 600 },
    { kind: "search", detail: "Notion OAuth access token expiry refresh token", wait: 500 },
    { kind: "text", detail: "Public integrations need company details and policy URLs; no review before users can authorize.", wait: 300 }
  ],
  visited: NOTION_VISITED,
  memo: {
    findings: [
      { topic: "registration", claim: "Integrations are created at notion.so/profile/integrations and start as internal (one workspace). Switching the type to Public enables OAuth.", evidenceLevel: "documented", urls: [NOTION_VISITED[1].url, NOTION_VISITED[0].url], quoteOrDetail: "Internal vs public integrations" },
      { topic: "reviewRequirements", claim: "Making an integration public requires company name, website, tagline, privacy policy URL, terms of use URL, support email, logo and redirect URIs.", evidenceLevel: "documented", urls: [NOTION_VISITED[0].url], quoteOrDetail: "Public integration settings form" },
      { topic: "productionGate", claim: "Once public, any Notion user can authorize the integration through the OAuth URL; no Notion review is required for that.", evidenceLevel: "documented", urls: [NOTION_VISITED[0].url], quoteOrDetail: "Authorization flow for public integrations" },
      { topic: "unusual", claim: "During authorization the user picks which pages to share; the integration only sees pages explicitly granted.", evidenceLevel: "documented", urls: [NOTION_VISITED[0].url], quoteOrDetail: "Page selection at consent" },
      { topic: "flows", claim: "Authorization code flow; the token exchange uses HTTP basic auth with client ID and secret.", evidenceLevel: "documented", urls: [NOTION_VISITED[0].url], quoteOrDetail: "POST /v1/oauth/token" },
      { topic: "productionGate", claim: "A listing in the Notion integration gallery is optional and goes through Notion's own submission and review.", evidenceLevel: "reported", urls: [NOTION_VISITED[3].url], quoteOrDetail: "Gallery submission" },
      { topic: "timingCost", claim: "Creating integrations is free; no paid developer tier.", evidenceLevel: "inferred", urls: [], quoteOrDetail: "No pricing found for integrations" }
    ],
    unknowns: ["Current gallery review duration", "Whether access tokens expire for new integrations"]
  },
  draft: ({ now, slug }) => ({
    schemaVersion: 1,
    slug,
    app: { name: "Notion", website: "https://www.notion.so", docsUrl: "https://developers.notion.com", developerPortalUrl: "https://www.notion.so/profile/integrations", category: "Docs and knowledge base", oneLiner: "Connected workspace for docs, wikis and databases." },
    generatedBy: "agent",
    generatedAt: now,
    lastVerifiedAt: now,
    oauth: { supportsOAuth: true, flows: ["authorization_code"], alternatives: ["internal_integration_token"], composioManaged: "unknown", composioToolkitSlug: "notion", dynamicClientRegistration: "unknown" },
    summary: {
      difficulty: 2,
      difficultyReason: "Create an integration, switch it to Public and fill in company details plus privacy and terms URLs. No review before users can connect; only the optional gallery listing is reviewed.",
      timeToDevReady: { min: 15, max: 30, unit: "minutes", confidence: "high" },
      timeToProduction: { min: 1, max: 2, unit: "hours", confidence: "medium", note: "The extra time is writing a privacy policy and terms page if you do not have one. A gallery listing is optional and reviewed separately." },
      cost: "Free",
      blockers: [{ text: "Public integrations require a privacy policy URL and terms of use URL before you can save the Public setting.", severity: "soft", evidence: ev("documented", ["s1"]) }],
      tldr: "Notion is easy: create an integration, switch it to Public, add your company details, policy URLs and redirect URI, and any Notion user can authorize it. Users choose which pages to share at consent time, so plan for an empty workspace view until they do."
    },
    prerequisites: [
      { text: "A Notion account; workspace admin is needed only to install internal integrations, not to create a public one.", owner: "you", evidence: ev("documented", ["s2"]) },
      { text: "A public privacy policy page and terms of use page on your domain.", owner: "agent", evidence: ev("documented", ["s1"], "Agent can draft both; you host and approve them.") }
    ],
    paths: {
      dev: [
        { title: "Create an integration", detail: "Sign in, open My integrations and create a new integration. It starts as internal, scoped to one workspace, with an internal token you can use immediately for testing.", owner: "you", effort: "5 min", consoleLocation: "notion.so/profile/integrations > New integration", values: [{ field: "Name", value: "YOUR_PRODUCT (shown on the consent screen)" }, { field: "Capabilities", value: "Read content, Update content, Insert content; add Read user information only if you need identities" }], evidence: ev("documented", ["s2", "s3"]) },
        { title: "Test against your own workspace", detail: "Share a page with the internal integration and call the API with the internal token to confirm the capabilities you picked are enough.", owner: "agent", effort: "10 min", evidence: ev("documented", ["s2"]) },
        { title: "Switch the integration to Public", detail: "Change the type to Public and fill in the form: company name, website, tagline, privacy policy and terms URLs, support email, logo and redirect URIs. Save to get the OAuth client ID and secret.", owner: "you", effort: "10 min", consoleLocation: "Integration settings > Distribution > Public", values: [{ field: "Redirect URI", value: "https://YOUR_DOMAIN/oauth/callback/notion" }], evidence: ev("documented", ["s1"]) },
        { title: "Run the authorization code flow", detail: "Send users to the authorization URL with owner=user; exchange the code at /v1/oauth/token using basic auth with the client ID and secret. The response includes the workspace and bot IDs you should store.", owner: "agent", effort: "15 min", evidence: ev("documented", ["s1"]) }
      ],
      production: [
        { title: "Nothing else is required for any user to connect", detail: "Public integrations are live as soon as they are saved. Optional: submit to the integration gallery for discoverability, which Notion reviews.", owner: "either", effort: "0 min (gallery: weeks, reported)", evidence: ev("reported", ["s4"], "Gallery review duration is not published.") }
      ]
    },
    requirements: [
      { item: "Privacy policy URL", required: true, evidence: ev("documented", ["s1"]) },
      { item: "Terms of use URL", required: true, evidence: ev("documented", ["s1"]) },
      { item: "Support email", required: true, evidence: ev("documented", ["s1"]) },
      { item: "Company name, website and logo", required: true, evidence: ev("documented", ["s1"]) },
      { item: "Redirect URI(s)", required: true, notes: "HTTPS in production; localhost allowed for development.", evidence: ev("documented", ["s1"]) }
    ],
    gotchas: [
      { title: "Users pick pages at consent", detail: "The integration only sees pages and databases the user selects during authorization. Many support tickets are really 'the user did not share the page'.", evidence: ev("documented", ["s1"]) },
      { title: "Capabilities are fixed at creation", detail: "Read, update, insert and user-information capabilities are set on the integration, not requested per user. Adding one later means users re-authorize.", evidence: ev("documented", ["s2"]) },
      { title: "Token lifetime", detail: "Historically Notion access tokens did not expire and no refresh token was issued. Check the current authorization page before assuming that for a new integration.", evidence: ev("inferred", [], "Flagged as an open question by the investigation.") }
    ],
    whenStuck: [
      { situation: "Cannot save the Public setting", action: "Every field in the public form is required, including the privacy and terms URLs; they must be reachable.", evidence: ev("documented", ["s1"]) },
      { situation: "API returns an empty list of pages", action: "The user has not shared any page with the integration. Ask them to re-run authorization and select pages, or share pages via the page menu.", evidence: ev("documented", ["s1"]) }
    ],
    sources: [
      src("s1", NOTION_VISITED[0].url, NOTION_VISITED[0].title!),
      src("s2", NOTION_VISITED[1].url, NOTION_VISITED[1].title!),
      src("s3", NOTION_VISITED[2].url, NOTION_VISITED[2].title!),
      src("s4", NOTION_VISITED[3].url, NOTION_VISITED[3].title!)
    ],
    verification: { status: "unverified", checkedClaims: 0, corrected: [], unverifiable: [] },
    openQuestions: ["Current gallery review duration", "Whether access tokens expire for new integrations"]
  })
};

const HUBSPOT_VISITED: VisitedSource[] = [
  { url: "https://developers.hubspot.com/docs/guides/apps/authentication/working-with-oauth", title: "HubSpot Developers: Working with OAuth", via: "fetch" },
  { url: "https://developers.hubspot.com/docs/guides/apps/public-apps/overview", title: "HubSpot Developers: Public apps overview", via: "fetch" },
  { url: "https://developers.hubspot.com/docs/apps/developer-platform/list-apps/listing-your-app/listing-your-app/", title: "HubSpot Developers: Listing your app on the App Marketplace", via: "fetch" },
  { url: "https://developers.hubspot.com/docs/guides/apps/authentication/scopes", title: "HubSpot Developers: Scopes", via: "search" },
  { url: "https://app.hubspot.com/signup-hubspot/developers", title: "HubSpot: create a developer account", via: "search" },
  { url: "https://community.hubspot.com/t5/APIs-Integrations/bd-p/integrations", title: "HubSpot Community: APIs and Integrations forum", via: "search" }
];

const hubspot: Fixture = {
  key: "hubspot",
  aliases: ["hubspot", "hubspot.com", "hub spot"],
  resolved: {
    name: "HubSpot",
    website: "https://www.hubspot.com",
    docsUrl: "https://developers.hubspot.com/docs",
    developerPortalUrl: "https://app.hubspot.com/signup-hubspot/developers",
    category: "CRM",
    oneLiner: "CRM and marketing platform with a public app marketplace.",
    supportsOAuth: true,
    authMethodsSeen: ["oauth2", "private_app_token"],
    confidence: "high"
  },
  resolveActivity: [
    { kind: "search", detail: "HubSpot developer account public app OAuth", wait: 500 },
    { kind: "text", detail: "Public apps live in a free developer account; private apps use a token and are workspace-only.", wait: 300 }
  ],
  investigateActivity: [
    { kind: "search", detail: "HubSpot public app create client id redirect URL scopes", wait: 500 },
    { kind: "fetch", detail: "https://developers.hubspot.com/docs/guides/apps/authentication/working-with-oauth", wait: 1000 },
    { kind: "fetch", detail: "https://developers.hubspot.com/docs/guides/apps/public-apps/overview", wait: 900 },
    { kind: "search", detail: "HubSpot app marketplace listing requirements review time", wait: 600 },
    { kind: "fetch", detail: "https://developers.hubspot.com/docs/apps/developer-platform/list-apps/listing-your-app/listing-your-app/", wait: 900 },
    { kind: "search", detail: "HubSpot marketplace review how long days community", wait: 600 },
    { kind: "text", detail: "Unlisted public apps install via URL with no review; the Marketplace listing is the reviewed path.", wait: 300 }
  ],
  visited: HUBSPOT_VISITED,
  memo: {
    findings: [
      { topic: "registration", claim: "Public apps are created inside a free developer account; the app gets a client ID, client secret, redirect URLs and an install URL.", evidenceLevel: "documented", urls: [HUBSPOT_VISITED[1].url], quoteOrDetail: "Create a public app in your developer account" },
      { topic: "flows", claim: "Authorization code flow. Access tokens expire after 30 minutes; refresh tokens are long-lived.", evidenceLevel: "documented", urls: [HUBSPOT_VISITED[0].url], quoteOrDetail: "access tokens expire in 30 minutes" },
      { topic: "scopeTiers", claim: "Scopes are declared on the app as required, conditionally required or optional; some scopes depend on the installing account's subscription tier.", evidenceLevel: "documented", urls: [HUBSPOT_VISITED[3].url, HUBSPOT_VISITED[1].url], quoteOrDetail: "required / conditionally required / optional scopes" },
      { topic: "devLimits", claim: "Developer test accounts are free and are the normal place to install and test an app before real customers.", evidenceLevel: "documented", urls: [HUBSPOT_VISITED[1].url], quoteOrDetail: "developer test accounts" },
      { topic: "productionGate", claim: "Any HubSpot user can install an unlisted public app from its install URL; no HubSpot review is involved.", evidenceLevel: "documented", urls: [HUBSPOT_VISITED[1].url], quoteOrDetail: "install URL" },
      { topic: "reviewRequirements", claim: "A Marketplace listing is reviewed by HubSpot and requires OAuth, a minimum number of active installs on unique accounts, documentation, support contact and policy URLs.", evidenceLevel: "documented", urls: [HUBSPOT_VISITED[2].url], quoteOrDetail: "listing requirements" },
      { topic: "timingCost", claim: "Listing is free. Community reports put review at roughly two weeks, longer with rejections.", evidenceLevel: "reported", urls: [HUBSPOT_VISITED[5].url], quoteOrDetail: "forum threads on review wait" },
      { topic: "rateLimits", claim: "OAuth apps have per-account burst limits that scale with the account's API add-on.", evidenceLevel: "documented", urls: [HUBSPOT_VISITED[0].url], quoteOrDetail: "rate limits per account" }
    ],
    unknowns: ["Exact current install-count threshold for listing", "Official review SLA"]
  },
  draft: ({ now, slug }) => ({
    schemaVersion: 1,
    slug,
    app: { name: "HubSpot", website: "https://www.hubspot.com", docsUrl: "https://developers.hubspot.com/docs", developerPortalUrl: "https://app.hubspot.com/signup-hubspot/developers", category: "CRM", oneLiner: "CRM and marketing platform with a public app marketplace." },
    generatedBy: "agent",
    generatedAt: now,
    lastVerifiedAt: now,
    oauth: { supportsOAuth: true, flows: ["authorization_code"], alternatives: ["private_app_token"], composioManaged: "unknown", composioToolkitSlug: "hubspot", dynamicClientRegistration: "unknown" },
    summary: {
      difficulty: 3,
      difficultyReason: "Dev-ready is quick inside a free developer account and unlisted installs need no review. The Marketplace listing is a real review with install-count and policy requirements.",
      timeToDevReady: { min: 30, max: 60, unit: "minutes", confidence: "high" },
      timeToProduction: { min: 2, max: 4, unit: "weeks", confidence: "low", note: "This is the Marketplace listing path. Without a listing, any user can install from the install URL in about an hour." },
      cost: "Free. Developer account, test accounts and listing are free; customers' API limits depend on their own HubSpot tier.",
      blockers: [
        { text: "Marketplace listing requires existing active installs on unique customer accounts, so you cannot list before you have real users.", severity: "hard", evidence: ev("documented", ["s3"], "Threshold number not confirmed in this run; check the requirements page.") },
        { text: "Review feedback loops: each rejection adds a cycle, and community reports put a cycle at about two weeks.", severity: "soft", evidence: ev("reported", ["s6"]) }
      ],
      tldr: "HubSpot is a two-speed provider. Create a public app in a free developer account and anyone can install it from the install URL within the hour. Getting listed on the App Marketplace is a separate review that needs active installs, docs and policy pages, and takes weeks."
    },
    prerequisites: [
      { text: "A HubSpot developer account (free, separate from a customer account).", owner: "you", evidence: ev("documented", ["s5"]) },
      { text: "Decide public app vs private app: private apps are single-account tokens and cannot be installed by other customers.", owner: "agent", evidence: ev("documented", ["s2"]) }
    ],
    paths: {
      dev: [
        { title: "Create a developer account", detail: "Sign up for the developer account type. It comes with the Apps dashboard and the ability to create free test accounts.", owner: "you", effort: "5 min", consoleLocation: "app.hubspot.com/signup-hubspot/developers", evidence: ev("documented", ["s5"]) },
        { title: "Create the public app", detail: "Apps > Create app. Fill in the name, description and logo, then open Auth to set redirect URLs and scopes. Copy the client ID and secret.", owner: "agent", effort: "10 min", consoleLocation: "Developer account > Apps > Create app > Auth", values: [{ field: "Redirect URL", value: "https://YOUR_DOMAIN/oauth/callback/hubspot" }, { field: "Required scopes", value: "crm.objects.contacts.read crm.objects.contacts.write oauth" }], evidence: ev("documented", ["s2", "s4"]) },
        { title: "Create a test account and install the app", detail: "Testing > Create app test account, then open the install URL from the Auth tab and authorize into the test account.", owner: "you", effort: "5 min", consoleLocation: "Developer account > Testing", evidence: ev("documented", ["s2"]) },
        { title: "Exchange the code and handle refresh", detail: "POST the code to the token endpoint. Access tokens last 30 minutes; store the refresh token and refresh before expiry.", owner: "agent", effort: "15 min", evidence: ev("documented", ["s1"]) }
      ],
      production: [
        { title: "Ship unlisted first", detail: "Share the install URL with customers; it works for any HubSpot account without review. Mark scopes that depend on tier as optional so lower-tier accounts can still install.", owner: "agent", effort: "15 min", evidence: ev("documented", ["s2", "s4"]) },
        { title: "Prepare the listing", detail: "Write setup documentation, a support page, privacy policy and terms; collect screenshots and a short demo. Confirm you meet the active-install threshold.", owner: "agent", effort: "1-2 days", evidence: ev("documented", ["s3"]) },
        { title: "Submit the Marketplace listing", detail: "Create the listing in the developer account and submit for review. Respond to reviewer feedback in the listing thread.", owner: "you", effort: "30 min + 2-4 weeks waiting (reported)", consoleLocation: "Developer account > App Marketplace > Create listing", evidence: ev("reported", ["s3", "s6"]) }
      ]
    },
    requirements: [
      { item: "Redirect URL(s)", required: true, evidence: ev("documented", ["s1"]) },
      { item: "Scopes declared as required / conditionally required / optional", required: true, evidence: ev("documented", ["s4"]) },
      { item: "Active installs on unique accounts (listing only)", required: false, notes: "Required for a Marketplace listing, not for unlisted installs.", evidence: ev("documented", ["s3"]) },
      { item: "Documentation URL, support contact, privacy policy and terms (listing only)", required: false, evidence: ev("documented", ["s3"]) },
      { item: "OAuth (private app tokens are not accepted for listings)", required: true, evidence: ev("documented", ["s3"]) }
    ],
    gotchas: [
      { title: "30-minute access tokens", detail: "Integrations that forget to refresh break half an hour after install. Refresh proactively and store the refresh token per account.", evidence: ev("documented", ["s1"]) },
      { title: "Tier-dependent scopes block installs", detail: "If a required scope is only available on a higher subscription, lower-tier accounts cannot install at all. Make those scopes conditional or optional.", evidence: ev("documented", ["s4"]) },
      { title: "Listing needs users before listing", detail: "The install threshold means the Marketplace cannot be your first distribution channel; plan an unlisted phase.", evidence: ev("documented", ["s3"]) }
    ],
    whenStuck: [
      { situation: "Install fails with a scope error", action: "The installing account's tier does not include a required scope. Move it to optional and handle its absence in code.", evidence: ev("documented", ["s4"]) },
      { situation: "Listing rejected", action: "Reviewer notes arrive in the listing; fix and resubmit. Ask in the APIs and Integrations community forum if the note is unclear.", link: "https://community.hubspot.com/t5/APIs-Integrations/bd-p/integrations", evidence: ev("reported", ["s6"]) }
    ],
    sources: [
      src("s1", HUBSPOT_VISITED[0].url, HUBSPOT_VISITED[0].title!),
      src("s2", HUBSPOT_VISITED[1].url, HUBSPOT_VISITED[1].title!),
      src("s3", HUBSPOT_VISITED[2].url, HUBSPOT_VISITED[2].title!),
      src("s4", HUBSPOT_VISITED[3].url, HUBSPOT_VISITED[3].title!),
      src("s5", HUBSPOT_VISITED[4].url, HUBSPOT_VISITED[4].title!),
      src("s6", HUBSPOT_VISITED[5].url, HUBSPOT_VISITED[5].title!, "community")
    ],
    verification: { status: "unverified", checkedClaims: 0, corrected: [], unverifiable: [] },
    openQuestions: ["Exact current install-count threshold for listing", "Official review SLA, if HubSpot publishes one"]
  })
};

const CAL_VISITED: VisitedSource[] = [
  { url: "https://cal.com/docs/platform/introduction", title: "Cal.com Docs: Platform introduction (OAuth clients, atoms, managed users)", via: "fetch" },
  { url: "https://cal.com/docs/platform/quickstart", title: "Cal.com Docs: Platform quickstart", via: "fetch" },
  { url: "https://cal.com/pricing", title: "Cal.com pricing", via: "search" },
  { url: "https://cal.com/docs/api-reference/v2/introduction", title: "Cal.com Docs: API v2 introduction", via: "search" }
];

const calcom: Fixture = {
  key: "cal",
  aliases: ["cal", "cal.com", "calcom", "cal com"],
  resolved: {
    name: "Cal.com",
    website: "https://cal.com",
    docsUrl: "https://cal.com/docs",
    developerPortalUrl: "https://app.cal.com/settings/platform",
    category: "Scheduling",
    oneLiner: "Open-source scheduling; third-party access goes through the Platform OAuth clients or API keys.",
    supportsOAuth: true,
    authMethodsSeen: ["oauth2_platform_client", "api_key"],
    confidence: "medium"
  },
  resolveActivity: [
    { kind: "search", detail: "cal.com developer docs OAuth client", wait: 500 },
    { kind: "text", detail: "URL input: using the domain cal.com. Docs mention Platform OAuth clients and API keys; the shape of OAuth is unusual.", wait: 300 }
  ],
  investigateActivity: [
    { kind: "search", detail: "Cal.com platform OAuth client create managed users", wait: 500 },
    { kind: "fetch", detail: "https://cal.com/docs/platform/introduction", wait: 1000 },
    { kind: "fetch", detail: "https://cal.com/docs/platform/quickstart", wait: 900 },
    { kind: "search", detail: "Cal.com platform pricing OAuth client limits", wait: 600 },
    { kind: "search", detail: "Cal.com connect existing user account OAuth consent screen", wait: 600 },
    { kind: "text", detail: "Platform OAuth clients create managed users; a classic consent flow for existing cal.com users was not found.", wait: 300 }
  ],
  visited: CAL_VISITED,
  memo: {
    findings: [
      { topic: "registration", claim: "OAuth clients are created in the Platform section of the Cal.com settings; each client has a client ID, secret, redirect URIs and permissions.", evidenceLevel: "documented", urls: [CAL_VISITED[1].url], quoteOrDetail: "Create an OAuth client in settings > platform" },
      { topic: "unusual", claim: "Platform OAuth clients provision 'managed users' owned by your app rather than asking an existing Cal.com user for consent.", evidenceLevel: "documented", urls: [CAL_VISITED[0].url], quoteOrDetail: "managed users" },
      { topic: "flows", claim: "Alternative access is an API key per user for the REST API.", evidenceLevel: "documented", urls: [CAL_VISITED[3].url], quoteOrDetail: "API keys" },
      { topic: "timingCost", claim: "Platform access is tiered on the pricing page; higher usage requires a paid Platform plan.", evidenceLevel: "reported", urls: [CAL_VISITED[2].url], quoteOrDetail: "Platform plans" },
      { topic: "productionGate", claim: "No review process was found for OAuth clients; the gate is the plan you are on.", evidenceLevel: "inferred", urls: [], quoteOrDetail: "Nothing in docs about review" }
    ],
    unknowns: ["Whether a classic consent flow exists for existing Cal.com users", "Current Platform plan limits and prices"]
  },
  draft: ({ now, slug }) => ({
    schemaVersion: 1,
    slug,
    app: { name: "Cal.com", website: "https://cal.com", docsUrl: "https://cal.com/docs", developerPortalUrl: "https://app.cal.com/settings/platform", category: "Scheduling", oneLiner: "Open-source scheduling; third-party access goes through the Platform OAuth clients or API keys." },
    generatedBy: "agent",
    generatedAt: now,
    lastVerifiedAt: now,
    oauth: { supportsOAuth: true, flows: ["authorization_code"], alternatives: ["api_key"], composioManaged: "unknown", composioToolkitSlug: "calcom", dynamicClientRegistration: "unknown", notes: "Cal.com's OAuth is built for its Platform product: your OAuth client creates and owns 'managed users'. If you need existing Cal.com users to connect their own accounts, confirm the path with Cal.com before you build." },
    summary: {
      difficulty: 3,
      difficultyReason: "No review, but the OAuth model is unusual (managed users, not consent for existing accounts) and production usage sits behind the Platform plan.",
      timeToDevReady: { min: 1, max: 2, unit: "hours", confidence: "medium" },
      timeToProduction: { min: 1, max: 7, unit: "days", confidence: "low", note: "Mostly choosing and paying for a Platform plan and confirming the managed-user model fits your product. No approval queue was found." },
      cost: "Free to try; a paid Platform plan for production usage (reported, check the pricing page)",
      blockers: [
        { text: "If your users already have Cal.com accounts, the Platform OAuth client may not be the right tool: it provisions managed users instead of connecting existing ones.", severity: "hard", evidence: ev("inferred", [], "No classic consent flow found in docs; confirm with Cal.com.") },
        { text: "Production volume requires a paid Platform plan.", severity: "soft", evidence: ev("reported", ["s3"]) }
      ],
      tldr: "Cal.com has no approval queue, but its OAuth is not the usual 'connect your account' flow: a Platform OAuth client creates managed users that your app owns. Dev-ready in an hour or two; production is a plan decision, not a review. If you need existing Cal.com users to connect, ask Cal.com first."
    },
    prerequisites: [
      { text: "A Cal.com account with Platform enabled.", owner: "you", evidence: ev("documented", ["s2"]) },
      { text: "Decide between managed users (OAuth client) and per-user API keys.", owner: "agent", evidence: ev("documented", ["s1", "s4"]) }
    ],
    paths: {
      dev: [
        { title: "Create an OAuth client", detail: "Settings > Platform > OAuth clients > New. Set the name, redirect URIs and the permissions your app needs. Copy the client ID and secret.", owner: "you", effort: "10 min", consoleLocation: "app.cal.com/settings/platform", values: [{ field: "Redirect URI", value: "https://YOUR_DOMAIN/oauth/callback/calcom" }, { field: "Permissions", value: "booking read/write, event type read, schedule read" }], evidence: ev("documented", ["s2"]) },
        { title: "Create a managed user and exchange tokens", detail: "Call the managed users endpoint with your client credentials to provision a user; it returns access and refresh tokens for that user.", owner: "agent", effort: "30 min", evidence: ev("documented", ["s1", "s2"]) },
        { title: "Embed or call the API", detail: "Use the Platform atoms (React components) or API v2 with the managed user's token to list availability and create bookings.", owner: "agent", effort: "1 hour", evidence: ev("documented", ["s1", "s4"]) }
      ],
      production: [
        { title: "Confirm the user model fits", detail: "Managed users live inside your OAuth client; they are not your customers' existing Cal.com accounts. If that is wrong for you, contact Cal.com about alternatives before launch.", owner: "you", effort: "1 day", evidence: ev("inferred", [], "No classic consent flow found.") },
        { title: "Choose a Platform plan", detail: "Pick the plan that covers your expected bookings and seats; billing is in the Cal.com dashboard.", owner: "you", effort: "30 min", evidence: ev("reported", ["s3"]) }
      ]
    },
    requirements: [
      { item: "Redirect URI(s)", required: true, evidence: ev("documented", ["s2"]) },
      { item: "Platform plan for production usage", required: true, evidence: ev("reported", ["s3"]) },
      { item: "Privacy policy or terms", required: false, notes: "Not requested when creating an OAuth client.", evidence: ev("inferred") }
    ],
    gotchas: [
      { title: "Managed users, not your users", detail: "Every managed user is created by your client. Calendar connections (Google, Outlook) happen per managed user and need their own OAuth with those providers.", evidence: ev("documented", ["s1"]) },
      { title: "Two APIs", detail: "API v1 (API keys) and API v2 (Platform tokens) differ; the docs for v2 are the ones that match OAuth clients.", evidence: ev("documented", ["s4"]) }
    ],
    whenStuck: [
      { situation: "Need existing Cal.com users to connect", action: "Ask Cal.com support whether a consent-based OAuth flow is available for your use case; per-user API keys are the documented fallback.", evidence: ev("inferred") },
      { situation: "Token refresh fails for a managed user", action: "Use the refresh endpoint documented in the Platform quickstart with your client secret; managed-user tokens are short-lived.", evidence: ev("documented", ["s2"]) }
    ],
    sources: [
      src("s1", CAL_VISITED[0].url, CAL_VISITED[0].title!),
      src("s2", CAL_VISITED[1].url, CAL_VISITED[1].title!),
      src("s3", CAL_VISITED[2].url, CAL_VISITED[2].title!),
      src("s4", CAL_VISITED[3].url, CAL_VISITED[3].title!)
    ],
    verification: { status: "unverified", checkedClaims: 0, corrected: [], unverifiable: [] },
    openQuestions: ["Whether a classic consent flow exists for existing Cal.com users", "Current Platform plan limits and prices"]
  })
};

const MERCURY_VISITED: VisitedSource[] = [
  { url: "https://docs.mercury.com/docs/getting-started", title: "Mercury API docs: Getting started (API tokens)", via: "fetch" },
  { url: "https://mercury.com", title: "Mercury: banking for startups", via: "search" },
  { url: "https://docs.mercury.com/docs/integrations-with-oauth2", title: "Mercury API docs: Integrations with OAuth2 (request credentials, sandbox client)", via: "fetch" }
];

const mercury: Fixture = {
  key: "mercury",
  aliases: ["mercury", "mercury.com", "mercury bank", "mercury banking"],
  resolved: {
    name: "Mercury",
    website: "https://mercury.com",
    docsUrl: "https://docs.mercury.com",
    developerPortalUrl: "https://app.mercury.com/settings/tokens",
    category: "Banking / fintech",
    oneLiner: "Business banking for startups with a REST API for accounts, transactions and payments.",
    supportsOAuth: true,
    authMethodsSeen: ["api_token", "oauth2_partner"],
    ambiguityNote: "'Mercury' is ambiguous (the bank, the mail client, a rendering engine, a Unity framework). Chose Mercury (mercury.com) because it is the one with a public developer API that integrations connect to.",
    confidence: "medium"
  },
  resolveActivity: [
    { kind: "search", detail: "Mercury API developer docs", wait: 500 },
    { kind: "search", detail: "Mercury bank API OAuth third-party integration", wait: 500 },
    { kind: "text", detail: "Ambiguous name. Picking Mercury the bank (mercury.com): it is the candidate with a developer API and an OAuth path.", wait: 300 }
  ],
  investigateActivity: [
    { kind: "fetch", detail: "https://docs.mercury.com/docs/getting-started", wait: 900 },
    { kind: "search", detail: "Mercury API token permissions read only read write custom", wait: 600 },
    { kind: "search", detail: "Mercury OAuth2 client registration partner contact", wait: 600 },
    { kind: "fetch", detail: "https://docs.mercury.com/docs/integrations-with-oauth2", wait: 900 },
    { kind: "search", detail: "Mercury API OAuth approval how long", wait: 500 },
    { kind: "text", detail: "Personal API tokens are self-serve. OAuth for third-party apps requires contacting Mercury; no self-serve client registration found.", wait: 300 }
  ],
  visited: MERCURY_VISITED,
  memo: {
    findings: [
      { topic: "registration", claim: "Account holders create API tokens themselves in Settings; tokens carry a permission level and can be restricted by IP.", evidenceLevel: "documented", urls: [MERCURY_VISITED[0].url], quoteOrDetail: "API tokens in settings" },
      { topic: "flows", claim: "An OAuth2 flow exists for third-party applications so Mercury customers can connect without sharing tokens.", evidenceLevel: "documented", urls: [MERCURY_VISITED[2].url], quoteOrDetail: "OAuth2 reference page" },
      { topic: "productionGate", claim: "OAuth2 integration access requires prior approval: you submit a request form, Mercury reviews security, use-case fit and regulatory factors, and may ask for more information. There is no self-serve 'create app' form.", evidenceLevel: "documented", urls: [MERCURY_VISITED[2].url], quoteOrDetail: "requires prior approval; submit a request form" },
      { topic: "reviewRequirements", claim: "After approval you provide production and development redirect URIs, terms of service, privacy policy, logo and a GPG public key; Mercury then securely shares the client ID and secret.", evidenceLevel: "documented", urls: [MERCURY_VISITED[2].url], quoteOrDetail: "redirect URIs, terms, privacy policy, logo, GPG public key" },
      { topic: "timingCost", claim: "Approval timelines vary depending on integration complexity; no figure is published.", evidenceLevel: "documented", urls: [MERCURY_VISITED[2].url], quoteOrDetail: "Approval timelines vary depending on integration complexity" },
      { topic: "devLimits", claim: "Mercury provides credentials for a test OAuth client that works against its sandbox hosts.", evidenceLevel: "documented", urls: [MERCURY_VISITED[2].url], quoteOrDetail: "test client for the sandbox" },
            { topic: "unusual", claim: "Money-movement endpoints are more restricted than read endpoints; expect extra scrutiny for apps that initiate payments.", evidenceLevel: "inferred", urls: [], quoteOrDetail: "inferred from permission levels" }
    ],
    unknowns: ["How long Mercury's OAuth2 approval takes in practice", "Whether OAuth clients can initiate payments or are read-only"]
  },
  draft: ({ now, slug }) => ({
    schemaVersion: 1,
    slug,
    app: { name: "Mercury", website: "https://mercury.com", docsUrl: "https://docs.mercury.com", developerPortalUrl: "https://app.mercury.com/settings/tokens", category: "Banking / fintech", oneLiner: "Business banking for startups with a REST API for accounts, transactions and payments." },
    generatedBy: "agent",
    generatedAt: now,
    lastVerifiedAt: now,
    oauth: { supportsOAuth: true, flows: ["authorization_code"], alternatives: ["api_token"], composioManaged: "unknown", dynamicClientRegistration: "unknown", notes: "Resolved from an ambiguous name: this guide is for Mercury the bank (mercury.com), not the mail client or rendering engine." },
    summary: {
      difficulty: 4,
      difficultyReason: "Dev-ready with a personal API token in minutes, but third-party OAuth access needs prior approval through a request form, a review of security and use-case fit, and a credential exchange over GPG. No published timeline.",
      timeToDevReady: { min: 10, max: 20, unit: "minutes", confidence: "high", note: "Using your own account's API token." },
      timeToProduction: { min: 2, max: 8, unit: "weeks", confidence: "low", note: "Mercury says approval timelines vary with integration complexity and publishes no figure; the range is an inference from similar fintech partner programs." },
      cost: "Free as far as documented; partner terms are not published.",
      blockers: [
        { text: "OAuth2 integration access requires prior approval via a request form; Mercury reviews security, use-case fit and regulatory factors before issuing credentials.", severity: "hard", evidence: ev("documented", ["s3"]) },
        { text: "Credentials are exchanged over GPG, so you need a public key ready, plus terms, privacy policy and logo.", severity: "soft", evidence: ev("documented", ["s3"]) }
      ],
      tldr: "Mercury (the bank) is an approval-first provider. You can hit the API in minutes with your own account's token, but letting other Mercury customers connect needs OAuth2 access that Mercury grants after a request form and a security and use-case review, with credentials sent over GPG and no published wait. Treat production as a partnership conversation, not a console task."
    },
    prerequisites: [
      { text: "A Mercury business account to test against (yours or a design partner's).", owner: "you", evidence: ev("documented", ["s1"]) },
      { text: "A one-paragraph description of your use case, data needs and security practices for the partner request.", owner: "agent", evidence: ev("inferred") }
    ],
    paths: {
      dev: [
        { title: "Create an API token", detail: "Settings > API tokens. Pick the narrowest permission level that covers your calls and restrict by IP if your backend has a static egress.", owner: "you", effort: "5 min", consoleLocation: "app.mercury.com > Settings > API tokens", values: [{ field: "Permission", value: "Read Only for reporting agents; Read and Write only if you initiate payments" }], evidence: ev("documented", ["s1"]) },
        { title: "Call the accounts and transactions endpoints", detail: "Bearer-token requests against the documented REST API to confirm the data you need is exposed.", owner: "agent", effort: "15 min", evidence: ev("documented", ["s1"]) }
      ],
      production: [
        { title: "Submit the OAuth2 access request form", detail: "Describe your company, the intended API use and the data you need. Mercury reviews security, use-case fit and regulatory factors and may ask follow-up questions.", owner: "agent", effort: "30 min + review of unknown length", evidence: ev("documented", ["s3"]) },
        { title: "Send redirect URIs, policies, logo and a GPG key", detail: "After approval, provide the production redirect URI, any development redirect URIs, links to terms of service and privacy policy, a logo, and your GPG public key. Mercury securely shares the client ID and secret plus sandbox test-client credentials.", owner: "you", effort: "30 min", values: [{ field: "Production redirect URI", value: "https://YOUR_DOMAIN/oauth/callback/mercury" }, { field: "GPG public key", value: "export with gpg --armor --export YOUR_KEY_ID" }], evidence: ev("documented", ["s3"]) },
        { title: "Implement the authorization code flow", detail: "Once credentials arrive, wire the documented authorize and token endpoints; store refresh tokens per connected account.", owner: "agent", effort: "2 hours", evidence: ev("documented", ["s3"]) },
        { title: "Build against the sandbox while you wait", detail: "Use the test client credentials against the sandbox hosts so the integration is ready the day production credentials arrive.", owner: "agent", effort: "2 hours", evidence: ev("documented", ["s3"]) }
      ]
    },
    requirements: [
      { item: "Redirect URI", required: true, evidence: ev("documented", ["s3"]) },
      { item: "Access request form with use-case description", required: true, evidence: ev("documented", ["s3"]) },
      { item: "Terms of service and privacy policy URLs", required: true, evidence: ev("documented", ["s3"]) },
      { item: "Logo", required: true, evidence: ev("documented", ["s3"]) },
      { item: "GPG public key for receiving credentials", required: true, evidence: ev("documented", ["s3"]) }
    ],
    gotchas: [
      { title: "The name is ambiguous", detail: "Searches for 'Mercury OAuth' return results for unrelated products. Use docs.mercury.com as the only source of truth.", evidence: ev("documented", ["s1"]) },
      { title: "Token permission levels are coarse", detail: "There is no fine-grained scope list for personal tokens; a Read and Write token can move money. Prefer Read Only for anything that does not pay.", evidence: ev("documented", ["s1"]) }
    ],
    whenStuck: [
      { situation: "No reply to the OAuth request", action: "Mercury says timelines vary with integration complexity and that it may request more information; follow up through your account's support channel with any detail you left out of the form.", evidence: ev("documented", ["s3"], "Timeline wording is documented; the follow-up advice is inferred.") },
      { situation: "Need to demo before credentials arrive", action: "Use your own account token behind a feature flag so the integration logic is ready when OAuth lands.", evidence: ev("inferred") }
    ],
    sources: [
      src("s1", MERCURY_VISITED[0].url, MERCURY_VISITED[0].title!),
      src("s2", MERCURY_VISITED[1].url, MERCURY_VISITED[1].title!),
      src("s3", MERCURY_VISITED[2].url, MERCURY_VISITED[2].title!)
    ],
    verification: { status: "unverified", checkedClaims: 0, corrected: [], unverifiable: [] },
    openQuestions: ["How long Mercury's OAuth2 approval takes in practice (docs only say it varies)", "Whether OAuth clients can initiate payments or are read-only"]
  })
};

const RESEND_VISITED: VisitedSource[] = [
  { url: "https://resend.com/docs/dashboard/api-keys/introduction", title: "Resend Docs: API keys", via: "fetch" },
  { url: "https://resend.com/docs/dashboard/domains/introduction", title: "Resend Docs: Domains (verification with DNS records)", via: "fetch" },
  { url: "https://resend.com/pricing", title: "Resend pricing", via: "search" },
  { url: "https://resend.com/docs/send-with-nodejs", title: "Resend Docs: Send with Node.js", via: "search" }
];

const resend: Fixture = {
  key: "resend",
  aliases: ["resend", "resend.com", "resend.dev"],
  resolved: {
    name: "Resend",
    website: "https://resend.com",
    docsUrl: "https://resend.com/docs",
    developerPortalUrl: "https://resend.com/api-keys",
    category: "Transactional email",
    oneLiner: "Email API for developers.",
    supportsOAuth: false,
    authMethodsSeen: ["api_key"],
    confidence: "high"
  },
  resolveActivity: [
    { kind: "search", detail: "Resend API OAuth app", wait: 500 },
    { kind: "search", detail: "Resend docs authentication API key", wait: 400 },
    { kind: "text", detail: "No OAuth anywhere in the docs: authentication is an API key created in the dashboard.", wait: 300 }
  ],
  investigateActivity: [
    { kind: "fetch", detail: "https://resend.com/docs/dashboard/api-keys/introduction", wait: 900 },
    { kind: "search", detail: "Resend domain verification DNS SPF DKIM time", wait: 500 },
    { kind: "fetch", detail: "https://resend.com/docs/dashboard/domains/introduction", wait: 900 },
    { kind: "search", detail: "Resend free tier limits emails per day", wait: 500 },
    { kind: "text", detail: "The real production gate is DNS: a verified sending domain, not an approval.", wait: 300 }
  ],
  visited: RESEND_VISITED,
  memo: {
    findings: [
      { topic: "flows", claim: "Authentication is an API key sent as a bearer token; there is no OAuth flow and no concept of a third-party app.", evidenceLevel: "documented", urls: [RESEND_VISITED[0].url], quoteOrDetail: "API keys" },
      { topic: "registration", claim: "Keys are created in the dashboard with Full access or Sending access, and can be restricted to one domain.", evidenceLevel: "documented", urls: [RESEND_VISITED[0].url], quoteOrDetail: "Permission: full access / sending access; domain restriction" },
      { topic: "productionGate", claim: "To send from your own domain you add DNS records (SPF, DKIM, optionally DMARC) and wait for verification.", evidenceLevel: "documented", urls: [RESEND_VISITED[1].url], quoteOrDetail: "add the DNS records and click verify" },
      { topic: "timingCost", claim: "A free tier exists with a monthly and daily sending cap; paid plans raise limits.", evidenceLevel: "documented", urls: [RESEND_VISITED[2].url], quoteOrDetail: "pricing page" },
      { topic: "devLimits", claim: "Before a domain is verified you can only send test email to your own address from the onboarding domain.", evidenceLevel: "documented", urls: [RESEND_VISITED[1].url], quoteOrDetail: "onboarding domain restrictions" }
    ],
    unknowns: ["Exact current free-tier caps (they change)"]
  },
  draft: ({ now, slug }) => ({
    schemaVersion: 1,
    slug,
    app: { name: "Resend", website: "https://resend.com", docsUrl: "https://resend.com/docs", developerPortalUrl: "https://resend.com/api-keys", category: "Transactional email", oneLiner: "Email API for developers." },
    generatedBy: "agent",
    generatedAt: now,
    lastVerifiedAt: now,
    oauth: { supportsOAuth: false, flows: [], alternatives: ["api_key"], composioManaged: "unknown", composioToolkitSlug: "resend", dynamicClientRegistration: "unknown", notes: "There is no OAuth app to register. Each customer creates an API key in their own Resend dashboard and gives it to your integration." },
    summary: {
      difficulty: 1,
      difficultyReason: "API key only. Nothing to register, nothing to approve. The only wait is DNS verification of a sending domain.",
      timeToDevReady: { min: 5, max: 10, unit: "minutes", confidence: "high" },
      timeToProduction: { min: 1, max: 48, unit: "hours", confidence: "medium", note: "Time for DNS records to propagate and the domain to verify. Not an approval." },
      cost: "Free tier; paid plans for volume",
      blockers: [{ text: "Email from your own domain needs DNS records you may not control (ask whoever owns the zone).", severity: "soft", evidence: ev("documented", ["s2"]) }],
      tldr: "Resend has no OAuth app to create and nothing to get approved. Your users (or you) create an API key in the Resend dashboard and paste it in. The only clock that matters is DNS: verifying a sending domain takes anywhere from minutes to a couple of days."
    },
    prerequisites: [
      { text: "A Resend account (free).", owner: "you", evidence: ev("documented", ["s1"]) },
      { text: "Access to the DNS zone of the domain you want to send from.", owner: "you", evidence: ev("documented", ["s2"]) }
    ],
    paths: {
      dev: [
        { title: "Create an API key", detail: "Dashboard > API Keys > Create. Choose Sending access unless your integration also manages domains or audiences, and restrict it to one domain if you can.", owner: "you", effort: "2 min", consoleLocation: "resend.com/api-keys", values: [{ field: "Permission", value: "Sending access" }, { field: "Domain", value: "YOUR_DOMAIN (restrict if possible)" }], evidence: ev("documented", ["s1"]) },
        { title: "Send a test email", detail: "Call the send endpoint with the key as a bearer token; before domain verification only your own address receives mail.", owner: "agent", effort: "5 min", evidence: ev("documented", ["s2", "s4"]) }
      ],
      production: [
        { title: "Add a sending domain", detail: "Dashboard > Domains > Add. Resend shows the SPF and DKIM records to create; add a DMARC record while you are there.", owner: "you", effort: "10 min", consoleLocation: "resend.com/domains", evidence: ev("documented", ["s2"]) },
        { title: "Wait for verification", detail: "Click Verify once the records are live. Propagation is usually minutes but can take up to 48 hours depending on the DNS host.", owner: "you", effort: "minutes to 48 hours", evidence: ev("documented", ["s2"]) },
        { title: "Check plan limits", detail: "Confirm the free tier's daily and monthly caps cover your launch volume; upgrade in the dashboard if not.", owner: "agent", effort: "5 min", evidence: ev("documented", ["s3"]) }
      ]
    },
    requirements: [
      { item: "API key with the right permission", required: true, evidence: ev("documented", ["s1"]) },
      { item: "Verified sending domain (SPF + DKIM)", required: true, notes: "Only for sending from your own domain.", evidence: ev("documented", ["s2"]) },
      { item: "Privacy policy, demo video, business verification", required: false, notes: "Not applicable: there is no app review.", evidence: ev("documented", ["s1"]) }
    ],
    gotchas: [
      { title: "Keys are per customer, not per app", detail: "Because there is no OAuth app, each customer who connects must create and share their own key. Design the connect screen around a key paste, not a redirect.", evidence: ev("documented", ["s1"]) },
      { title: "Full-access keys can delete domains", detail: "Ask customers for Sending access keys; a leaked full-access key is a bigger blast radius.", evidence: ev("documented", ["s1"]) }
    ],
    whenStuck: [
      { situation: "Domain stuck on pending", action: "Re-check the DKIM record name and value for copy errors, then wait for the TTL to expire before clicking Verify again.", evidence: ev("documented", ["s2"]) },
      { situation: "403 on send", action: "The key is restricted to a different domain or has the wrong permission. Create a new key with the right scope.", evidence: ev("inferred") }
    ],
    sources: [
      src("s1", RESEND_VISITED[0].url, RESEND_VISITED[0].title!),
      src("s2", RESEND_VISITED[1].url, RESEND_VISITED[1].title!),
      src("s3", RESEND_VISITED[2].url, RESEND_VISITED[2].title!),
      src("s4", RESEND_VISITED[3].url, RESEND_VISITED[3].title!)
    ],
    verification: { status: "unverified", checkedClaims: 0, corrected: [], unverifiable: [] },
    openQuestions: ["Exact current free-tier caps (they change)"]
  })
};

const FIXTURES: Fixture[] = [linear, notion, hubspot, calcom, mercury, resend];

// ---------------------------------------------------------------------------------------------
// Generic fallback: the honest low-confidence guide a real run produces for an obscure app.
// ---------------------------------------------------------------------------------------------

function prettyName(query: string): { name: string; website?: string } {
  const q = query.trim();
  if (/^https?:\/\//i.test(q) || /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(q)) {
    try {
      const url = new URL(/^https?:\/\//i.test(q) ? q : `https://${q}`);
      const host = url.hostname.replace(/^www\./, "");
      const base = host.split(".")[0];
      return { name: base.charAt(0).toUpperCase() + base.slice(1), website: `${url.protocol}//${url.hostname}` };
    } catch {
      /* fall through */
    }
  }
  const name = q
    .split(/\s+/)
    .map((w) => (w.length > 2 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
  return { name };
}

function genericFixture(query: string): Fixture {
  const { name, website } = prettyName(query);
  const visited: VisitedSource[] = website ? [{ url: website, title: `${name} website`, via: "search" }] : [];
  return {
    key: "generic",
    aliases: [],
    resolved: {
      name,
      website,
      category: "Unknown",
      oneLiner: `Treated as a SaaS product named "${name}".`,
      supportsOAuth: "unknown",
      authMethodsSeen: [],
      ambiguityNote: `Demo mode: no live web search ran, so "${query}" was not resolved against the web. Everything below is inferred from how typical SaaS providers behave; a live run replaces this with sourced findings.`,
      confidence: "low"
    },
    resolveActivity: [
      { kind: "search", detail: `${name} developer docs OAuth`, wait: 500 },
      { kind: "search", detail: `${name} API authentication`, wait: 400 },
      { kind: "text", detail: `Demo mode: no fixture for "${name}". Producing the low-confidence shape a thinly documented app gets.`, wait: 300 }
    ],
    investigateActivity: [
      { kind: "search", detail: `${name} create OAuth app client id redirect URI`, wait: 500 },
      { kind: "search", detail: `${name} app review approval marketplace`, wait: 500 },
      { kind: "search", detail: `${name} API scopes permissions`, wait: 500 },
      { kind: "search", detail: `${name} OAuth app review time`, wait: 400 },
      { kind: "text", detail: "No official pages read in demo mode; findings are marked inferred.", wait: 300 }
    ],
    visited,
    memo: {
      findings: [
        { topic: "registration", claim: "Most SaaS providers expose an app or integration settings page where an OAuth client is created; location unknown for this app.", evidenceLevel: "inferred", urls: [], quoteOrDetail: "not checked" },
        { topic: "productionGate", claim: "Whether a review exists before any user can connect is unknown.", evidenceLevel: "inferred", urls: [], quoteOrDetail: "not checked" }
      ],
      unknowns: [
        "Whether the API supports OAuth at all, or only API keys",
        "Where an OAuth app is registered and what account type is needed",
        "Whether a review, verification or listing step gates production",
        "Token lifetime, scopes and rate limits"
      ]
    },
    draft: ({ now, slug }) => ({
      schemaVersion: 1,
      slug,
      app: { name, website, category: "Unknown", oneLiner: `Treated as a SaaS product named "${name}".` },
      generatedBy: "agent",
      generatedAt: now,
      lastVerifiedAt: now,
      oauth: { supportsOAuth: true, flows: ["authorization_code"], alternatives: ["api_key"], composioManaged: "unknown", dynamicClientRegistration: "unknown", notes: "Assumed, not confirmed: demo mode did not check whether this app supports OAuth." },
      summary: {
        difficulty: 3,
        difficultyReason: "Unknown provider with no sourced findings. 3/5 is the prior for a SaaS app with an OAuth console and no known review; confidence is low in both directions.",
        timeToDevReady: { min: 1, max: 4, unit: "hours", confidence: "low", note: "Prior for a typical self-serve developer console; unverified." },
        timeToProduction: { min: 1, max: 4, unit: "weeks", confidence: "low", note: "Prior that allows for a possible review or verification step; unverified." },
        cost: "Unknown",
        blockers: [{ text: "Nothing about this provider was verified. Confirm OAuth support and any review step before planning a launch date.", severity: "soft", evidence: ev("inferred") }],
        tldr: `No sourced findings for ${name}: this guide is the low-confidence shape, every claim is inferred, and the open questions are the real deliverable. Confirm whether OAuth exists and whether a review gates production before promising a date.`
      },
      prerequisites: [
        { text: `An account on ${name} with permission to manage integrations or developer settings.`, owner: "you", evidence: ev("inferred") },
        { text: "A redirect URI on your domain and a draft privacy policy, in case the console asks for them.", owner: "agent", evidence: ev("inferred") }
      ],
      paths: {
        dev: [
          { title: "Find the developer documentation", detail: `Search for "${name} API" and "${name} OAuth"; look for a developers or integrations section and an authentication page.`, owner: "agent", effort: "15 min", evidence: ev("inferred") },
          { title: "Locate the app registration page", detail: "Usually under account or workspace settings (Developer, Integrations, API, Apps). Note the account type it asks for.", owner: "agent", effort: "15 min", evidence: ev("inferred") },
          { title: "Register the app", detail: "Create the app with a name, homepage and redirect URI. Copy the client ID and secret.", owner: "you", effort: "10 min", values: [{ field: "Redirect URI", value: `https://YOUR_DOMAIN/oauth/callback/${slug}` }, { field: "Homepage", value: "https://YOUR_DOMAIN" }], evidence: ev("inferred") },
          { title: "Request minimum scopes and run the flow once", detail: "Start with read scopes; add write scopes only when a feature needs them. Confirm the token endpoint and refresh behaviour.", owner: "agent", effort: "30 min", evidence: ev("inferred") }
        ],
        production: [
          { title: "Check for a distribution, review or verification step", detail: "Look for words like 'publish', 'public app', 'verification', 'marketplace' or 'partner' in the docs and console. If none exist, the dev path is production.", owner: "agent", effort: "20 min", evidence: ev("inferred") },
          { title: "Prepare what a review usually asks for", detail: "Privacy policy, terms, support email, logo, short description, demo video script. Having them ready turns a multi-week loop into one submission.", owner: "agent", effort: "1-2 hours", evidence: ev("inferred") },
          { title: "Submit and wait, if a review exists", detail: "Only you can accept terms and click submit. Record the submission date and the stated SLA, if any.", owner: "you", effort: "unknown", evidence: ev("inferred") }
        ]
      },
      requirements: [
        { item: "Redirect URI", required: true, evidence: ev("inferred") },
        { item: "Privacy policy URL", required: false, notes: "Commonly required for public apps; unknown here.", evidence: ev("inferred") },
        { item: "Verified domain or business verification", required: false, notes: "Unknown; typical of larger providers.", evidence: ev("inferred") }
      ],
      gotchas: [
        { title: "Do not trust this difficulty score", detail: "It is a prior, not a finding. The same prior would be wrong for Google (5) and GitHub (1).", evidence: ev("inferred") },
        { title: "API-key-only providers are common", detail: "If the docs only mention API keys, there is no OAuth app to register and the production clock collapses to minutes.", evidence: ev("inferred") }
      ],
      whenStuck: [
        { situation: "Cannot find any OAuth documentation", action: "Check whether Composio lists the app in its managed-auth directory; otherwise email the provider's developer support and ask whether third-party OAuth clients are supported.", link: "https://docs.composio.dev/toolkits/managed-auth", evidence: ev("inferred") },
        { situation: "Console asks for a company or business verification", action: "Stop and estimate the wait before continuing; this is the kind of gate that turns hours into weeks.", evidence: ev("inferred") }
      ],
      sources: visited.map((v, i) => src(`s${i + 1}`, v.url, v.title!)),
      verification: { status: "unverified", checkedClaims: 0, corrected: [], unverifiable: [] },
      openQuestions: [
        "Whether the API supports OAuth at all, or only API keys",
        "Where an OAuth app is registered and what account type is needed",
        "Whether a review, verification or listing step gates production",
        "Token lifetime, scopes and rate limits"
      ]
    })
  };
}

// ---------------------------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------------------------

function normalise(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
}

function findFixture(query: string): Fixture {
  const n = normalise(query);
  const bare = n.replace(/\.(com|io|dev|app|ai|co|org|net|so)$/, "").replace(/[^a-z0-9]+/g, " ").trim();
  for (const f of FIXTURES) {
    if (f.aliases.includes(n) || f.aliases.includes(bare) || f.key === bare || f.resolved.name.toLowerCase() === bare) return f;
  }
  return genericFixture(query);
}

async function play(acts: Act[], onEvent?: (e: { kind: "search" | "fetch" | "text"; detail: string }) => void) {
  for (const a of acts) {
    onEvent?.({ kind: a.kind, detail: a.detail });
    await delay(a.wait ?? 400);
  }
}

// ---------------------------------------------------------------------------------------------
// Entry points used by client.ts
// ---------------------------------------------------------------------------------------------

export async function mockResearch(opts: {
  system: string;
  user: string;
  onEvent?: (e: { kind: "search" | "fetch" | "text"; detail: string }) => void;
}): Promise<ResearchResult> {
  const isResolve = /identify the app/i.test(opts.system);
  if (isResolve) {
    const query = opts.user.match(/The developer typed: "([^"]+)"/)?.[1] ?? "";
    const f = findFixture(query);
    await play(f.resolveActivity, opts.onEvent);
    return {
      text: JSON.stringify(f.resolved),
      visited: f.visited.slice(0, 1),
      usage: { input: 900, output: 150, searches: f.resolveActivity.filter((a) => a.kind === "search").length, fetches: 0 }
    };
  }
  const provider = opts.user.match(/^Provider: (.+)$/m)?.[1] ?? "";
  const f = findFixture(provider);
  await play(f.investigateActivity, opts.onEvent);
  return {
    text: JSON.stringify({
      findings: f.memo.findings,
      sourcesSeen: f.visited.map((v) => ({ url: v.url, title: v.title, type: "official" })),
      unknowns: f.memo.unknowns
    }),
    visited: f.visited,
    usage: {
      input: 6000,
      output: 900,
      searches: f.investigateActivity.filter((a) => a.kind === "search").length,
      fetches: f.investigateActivity.filter((a) => a.kind === "fetch").length
    }
  };
}

/** Pull the live probe results and the Composio check out of the synthesis prompt so the fixture guide reflects reality. */
function parseProbes(user: string): { probes: any[]; composio: any } {
  const m = user.match(/LIVE PROBES[^\n]*\n([\s\S]*?)\n\nCOMPOSIO MANAGED-AUTH CHECK:\n([\s\S]*?)\n\nURLS THE PIPELINE/);
  if (!m) return { probes: [], composio: null };
  try {
    return { probes: JSON.parse(m[1]), composio: JSON.parse(m[2]) };
  } catch {
    return { probes: [], composio: null };
  }
}

function foldProbesIntoGuide(guide: any, probes: any[], composio: any) {
  let n = 0;
  for (const p of probes) {
    if (!p?.url) continue;
    n++;
    const id = `p${n}`;
    guide.sources.push({ id, url: p.url, title: `Live probe: ${p.label}`, type: "probe", fetchedAt: new Date().toISOString().slice(0, 10) });
    if (p.id === "probe-dcr") {
      guide.oauth.dynamicClientRegistration = p.outcome;
      if (p.outcome === "yes") {
        guide.gotchas.unshift({ title: "Dynamic client registration advertised", detail: `The discovery metadata advertises a registration endpoint, so an MCP-style client may register itself without a manual app. ${p.detail}`, evidence: ev("tested", [id]) });
      }
    } else if (/discovery/i.test(p.label) && p.outcome === "no" && guide.oauth.dynamicClientRegistration === "unknown") {
      guide.oauth.dynamicClientRegistration = "no";
      guide.gotchas.push({ title: "No OAuth discovery metadata", detail: `${p.url} returned ${p.detail}. There is no RFC 8414 metadata to read endpoints or dynamic registration from; the app must be registered by hand.`, evidence: ev("tested", [id]) });
    } else if (p.id === "probe-portal") {
      guide.gotchas.push({ title: "Developer portal check", detail: p.detail, evidence: ev("tested", [id]) });
    }
  }
  if (composio?.outcome === "yes") {
    guide.oauth.composioManaged = "yes";
    guide.oauth.composioToolkitSlug = composio.slug || guide.oauth.composioToolkitSlug;
    guide.summary.tldr = `Composio already provides a managed OAuth app for ${guide.app.name} (toolkit ${composio.slug}); you only need your own app for custom branding, scopes or quota. ${guide.summary.tldr}`;
  } else if (composio?.outcome === "no") {
    guide.oauth.composioManaged = "no";
    guide.oauth.composioToolkitSlug = composio.slug || guide.oauth.composioToolkitSlug;
  }
}

export async function mockComplete(opts: { system: string; user: string }): Promise<string> {
  const isVerify = /audit a generated guide/i.test(opts.system);
  await delay(isVerify ? 1400 : 1200);

  if (!isVerify) {
    const retry = /Your previous output failed validation/.test(opts.user);
    const resolvedJson = opts.user.match(/RESOLVED APP:\n([\s\S]*?)\n\nRESEARCH MEMO/)?.[1] ?? "{}";
    let resolved: Resolved = { name: "" };
    try {
      resolved = JSON.parse(resolvedJson);
    } catch {
      /* ignore */
    }
    const slug = opts.user.match(/^Slug to use: (.+)$/m)?.[1]?.trim() || "app";
    const now = opts.user.match(/^Today: (.+)$/m)?.[1]?.trim() || new Date().toISOString();
    const f = findFixture(resolved.name || slug);
    const guide = f.draft({ now, slug, retry });
    if (f.key === "generic" && resolved.name) {
      guide.app.name = resolved.name;
      guide.app.website = resolved.website;
    }
    const { probes, composio } = parseProbes(opts.user);
    foldProbesIntoGuide(guide, probes, composio);
    return "```json\n" + JSON.stringify(guide) + "\n```";
  }

  // ---- verify: the skeptic. Only downgrades, reassigns or removes; never adds facts.
  const m = opts.user.match(/GUIDE TO AUDIT:\n([\s\S]*?)\n\nRESEARCH MEMO/);
  const guide = JSON.parse(m![1]);
  const corrected: string[] = [];
  const auditLog: string[] = [];
  const humanOnly = /sign in|log in|create (a |an )?account|accept|pay|submit|contact|request .*credentials|record a|verify your|dns|due-diligence|choose a .*plan/i;

  // A review or approval step whose only source was dropped by the pipeline has no support in the memo: remove it.
  for (const path of ["dev", "production"] as const) {
    guide.paths[path] = guide.paths[path].filter((s: any) => {
      const unsupported = /review|approval/i.test(s.title) && s.evidence?.level === "inferred" && /could not be confirmed/i.test(s.evidence?.note ?? "");
      if (unsupported) {
        corrected.push(`Removed "${s.title}": no finding in the memo supports a review step, and its source was never visited.`);
        auditLog.push(`removed unsupported step: ${s.title}`);
      }
      return !unsupported;
    });
  }
  const steps: any[] = [...guide.paths.dev, ...guide.paths.production];
  let checked = 0;
  for (const s of steps) {
    checked++;
    if (s.owner === "agent" && humanOnly.test(s.title)) {
      s.owner = "you";
      corrected.push(`"${s.title}": owner changed from agent to you (needs a login, payment, legal acceptance or contact from your company).`);
      auditLog.push(`owner reassigned: ${s.title}`);
    } else auditLog.push(`owner ok: ${s.title}`);
  }
  const collections = [guide.summary.blockers, guide.prerequisites, guide.requirements, guide.gotchas, guide.whenStuck];
  const unverifiable: string[] = [];
  for (const c of collections) {
    for (const item of c) {
      checked++;
      if (item.evidence?.level === "inferred") unverifiable.push(item.text || item.item || item.title || item.situation);
    }
  }
  for (const s of [...guide.paths.dev, ...guide.paths.production]) if (s.evidence?.level === "inferred") unverifiable.push(s.title);
  auditLog.push(`${unverifiable.length} item(s) left as inferred`);

  const generic = guide.verification?.status === "unverified" && guide.sources.every((s: any) => s.type === "probe" || /website$/i.test(s.title));
  guide.verification = {
    status: generic ? "unverified" : "agent-verified",
    checkedClaims: checked,
    corrected,
    unverifiable: unverifiable.slice(0, 8),
    notes: generic
      ? "DEMO MODE: no fixture exists for this app and no live search ran, so nothing could be checked. Probe results are real; everything else is a prior. Add ANTHROPIC_API_KEY to replace this with sourced findings."
      : "DEMO MODE: this guide was produced from fixture responses, not live research. Probe results are real HTTP checks run at generation time. Add ANTHROPIC_API_KEY and remove MOCK_AGENT to generate from live sources."
  };
  return JSON.stringify({ guide, auditLog });
}
