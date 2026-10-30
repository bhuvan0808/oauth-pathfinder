/**
 * Additional demo fixtures (MOCK_AGENT=1): Zoom, Discord, Dropbox, Salesforce, Stripe.
 * Same contract as the fixtures in mock.ts. Every URL was checked to resolve on 30 Oct 2026;
 * the claims are written from knowledge of each provider's docs, not fetched by a model, and the
 * resulting guides are labelled DEMO MODE. See VERIFICATION.md section 5.
 */
import type { Fixture } from "./mock";
import type { VisitedSource } from "./client";

type Ev = { level: "tested" | "documented" | "reported" | "inferred"; sourceIds: string[]; note?: string };
const ev = (level: Ev["level"], sourceIds: string[] = [], note?: string): Ev => ({ level, sourceIds, ...(note ? { note } : {}) });
const src = (id: string, url: string, title: string, type: "official" | "community" = "official") => ({ id, url, title, type });

// ---------------------------------------------------------------------------------------------
// Zoom: Marketplace review gates external users
// ---------------------------------------------------------------------------------------------

const ZOOM_VISITED: VisitedSource[] = [
  { url: "https://developers.zoom.us/docs/integrations/oauth/", title: "Zoom Developers: OAuth for user-authorized apps", via: "fetch" },
  { url: "https://developers.zoom.us/docs/integrations/create/", title: "Zoom Developers: Create an app", via: "fetch" },
  { url: "https://developers.zoom.us/docs/distribute/", title: "Zoom Developers: Distribute and publish your app", via: "fetch" },
  { url: "https://marketplace.zoom.us/develop/create", title: "Zoom App Marketplace: Build app", via: "search" },
  { url: "https://devforum.zoom.us/", title: "Zoom Developer Forum", via: "search" }
];

export const zoom: Fixture = {
  key: "zoom",
  aliases: ["zoom", "zoom.us", "zoom video"],
  resolved: {
    name: "Zoom",
    website: "https://zoom.us",
    docsUrl: "https://developers.zoom.us/docs/",
    developerPortalUrl: "https://marketplace.zoom.us/develop/create",
    category: "Video meetings",
    oneLiner: "Meetings, webinars and phone, with an App Marketplace that reviews every published app.",
    supportsOAuth: true,
    authMethodsSeen: ["oauth2", "server_to_server_oauth"],
    confidence: "high"
  },
  resolveActivity: [
    { kind: "search", detail: "Zoom OAuth app create marketplace developer docs", wait: 500 },
    { kind: "text", detail: "Apps are built in the Zoom App Marketplace; developers.zoom.us has the OAuth and distribution guides.", wait: 300 }
  ],
  investigateActivity: [
    { kind: "search", detail: "Zoom general app user-managed admin-managed OAuth redirect scopes", wait: 500 },
    { kind: "fetch", detail: "https://developers.zoom.us/docs/integrations/create/", wait: 900 },
    { kind: "fetch", detail: "https://developers.zoom.us/docs/integrations/oauth/", wait: 900 },
    { kind: "search", detail: "Zoom unpublished app external users install beta test", wait: 600 },
    { kind: "fetch", detail: "https://developers.zoom.us/docs/distribute/", wait: 900 },
    { kind: "search", detail: "Zoom marketplace app review how long devforum", wait: 600 },
    { kind: "text", detail: "Unpublished apps are limited to the developer's own account; publishing means a Marketplace review with security questions.", wait: 300 }
  ],
  visited: ZOOM_VISITED,
  memo: {
    findings: [
      { topic: "registration", claim: "Apps are created in the App Marketplace (Develop > Build App) with a Zoom account; a General app can be user-managed or admin-managed.", evidenceLevel: "documented", urls: [ZOOM_VISITED[1].url], quoteOrDetail: "Build App > General App" },
      { topic: "flows", claim: "Authorization code flow; access tokens last one hour and refresh tokens are issued.", evidenceLevel: "documented", urls: [ZOOM_VISITED[0].url], quoteOrDetail: "access_token expires in 3600 s" },
      { topic: "devLimits", claim: "An unpublished app can only be added by users inside the developer's own Zoom account; external testing needs the app's test/beta sharing option.", evidenceLevel: "documented", urls: [ZOOM_VISITED[2].url], quoteOrDetail: "unpublished vs published apps" },
      { topic: "productionGate", claim: "To let any Zoom user install the app it must be submitted and approved for the App Marketplace.", evidenceLevel: "documented", urls: [ZOOM_VISITED[2].url], quoteOrDetail: "Submit for review" },
      { topic: "reviewRequirements", claim: "Submission asks for listing details, privacy policy and terms URLs, support and documentation links, a demo video, and a security questionnaire covering data handling.", evidenceLevel: "documented", urls: [ZOOM_VISITED[2].url], quoteOrDetail: "App submission requirements" },
      { topic: "scopeTiers", claim: "Granular scopes replaced classic scopes; some scopes require a written justification at submission.", evidenceLevel: "documented", urls: [ZOOM_VISITED[0].url, ZOOM_VISITED[1].url], quoteOrDetail: "granular scopes" },
      { topic: "timingCost", claim: "Developers on the forum report two to six weeks for a first review, longer with security follow-ups. Listing is free.", evidenceLevel: "reported", urls: [ZOOM_VISITED[4].url], quoteOrDetail: "forum threads on review wait" }
    ],
    unknowns: ["Current cap on external beta testers", "Whether an unlisted published state exists for enterprise customers"]
  },
  draft: ({ now, slug }) => ({
    schemaVersion: 1,
    slug,
    app: { name: "Zoom", website: "https://zoom.us", docsUrl: "https://developers.zoom.us/docs/", developerPortalUrl: "https://marketplace.zoom.us/develop/create", category: "Video meetings", oneLiner: "Meetings, webinars and phone, with an App Marketplace that reviews every published app." },
    generatedBy: "agent",
    generatedAt: now,
    lastVerifiedAt: now,
    oauth: { supportsOAuth: true, flows: ["authorization_code"], alternatives: ["server_to_server_oauth"], composioManaged: "unknown", composioToolkitSlug: "zoom", dynamicClientRegistration: "unknown" },
    summary: {
      difficulty: 4,
      difficultyReason: "Creating the app is quick, but only users in your own Zoom account can install it until the App Marketplace review approves it. The review is real: policies, a demo video and a security questionnaire.",
      timeToDevReady: { min: 30, max: 60, unit: "minutes", confidence: "high" },
      timeToProduction: { min: 2, max: 6, unit: "weeks", confidence: "low", note: "Marketplace review; reported, not published. Expect a follow-up round on security answers." },
      cost: "Free. A Zoom account is enough to build; listing is free.",
      blockers: [
        { text: "Unpublished apps cannot be installed by users outside your Zoom account, so production for external customers means passing Marketplace review.", severity: "hard", evidence: ev("documented", ["s3"]) },
        { text: "The security questionnaire asks about data storage, encryption and retention; answers that are vague trigger follow-ups and resets.", severity: "soft", evidence: ev("reported", ["s5"]) }
      ],
      tldr: "Zoom is a review-gated provider. You get a working OAuth app for your own account in under an hour, but any other Zoom customer can only install it after the App Marketplace review, which wants a privacy policy, terms, a demo video and a security questionnaire and is reported to take weeks."
    },
    prerequisites: [
      { text: "A Zoom account; an admin-managed app also needs account-admin rights to install.", owner: "you", evidence: ev("documented", ["s2"]) },
      { text: "Privacy policy, terms of use and support pages on your domain, plus a short demo video script.", owner: "agent", evidence: ev("documented", ["s3"], "Agent drafts; you host and record.") }
    ],
    paths: {
      dev: [
        { title: "Create a General app", detail: "Develop > Build App > General App. Pick user-managed (each user authorizes) or admin-managed (an account admin authorizes for everyone).", owner: "you", effort: "5 min", consoleLocation: "marketplace.zoom.us > Develop > Build App", values: [{ field: "App type", value: "General App, user-managed for agents that act as one person" }], evidence: ev("documented", ["s2", "s4"]) },
        { title: "Set OAuth redirect and allow lists", detail: "Add the redirect URL and the OAuth allow list; copy the development client ID and secret.", owner: "agent", effort: "5 min", consoleLocation: "App > Basic Information > OAuth", values: [{ field: "Redirect URL", value: "https://YOUR_DOMAIN/oauth/callback/zoom" }], evidence: ev("documented", ["s1"]) },
        { title: "Pick granular scopes", detail: "Add only the granular scopes your features need; write the justification text now, it is reused at submission.", owner: "agent", effort: "15 min", consoleLocation: "App > Scopes", values: [{ field: "Typical read scopes", value: "meeting:read:meeting user:read:user" }], evidence: ev("documented", ["s1", "s2"]) },
        { title: "Add the app to your account and run the flow", detail: "Use Local Test to install on your own account, then exchange the code. Refresh the one-hour access token with the refresh token.", owner: "agent", effort: "20 min", evidence: ev("documented", ["s1", "s3"]) }
      ],
      production: [
        { title: "Share with beta testers if you need outside feedback", detail: "The distribution settings let you share an unpublished app with a limited set of external users for testing before review.", owner: "you", effort: "10 min", evidence: ev("documented", ["s3"], "Tester cap not confirmed in this run.") },
        { title: "Prepare the listing and security answers", detail: "Listing text, screenshots, privacy policy, terms, support URL, documentation URL, demo video, and the security questionnaire about data handling.", owner: "agent", effort: "1-2 days", evidence: ev("documented", ["s3"]) },
        { title: "Submit for Marketplace review and respond to feedback", detail: "Submit from the app's Submit tab. Zoom reviews functionality and security; answer follow-ups quickly because each round adds time.", owner: "you", effort: "30 min + 2-6 weeks waiting (reported)", consoleLocation: "App > Submit", evidence: ev("reported", ["s3", "s5"]) }
      ]
    },
    requirements: [
      { item: "Redirect URL and OAuth allow list", required: true, evidence: ev("documented", ["s1"]) },
      { item: "Privacy policy, terms of use, support and documentation URLs", required: true, notes: "Required at submission.", evidence: ev("documented", ["s3"]) },
      { item: "Demo video", required: true, notes: "Required at submission.", evidence: ev("documented", ["s3"]) },
      { item: "Security questionnaire", required: true, evidence: ev("documented", ["s3"]) },
      { item: "Scope justifications", required: true, evidence: ev("documented", ["s1"]) }
    ],
    gotchas: [
      { title: "One-hour access tokens", detail: "Integrations that forget refresh break after an hour. Store the refresh token and rotate it on every refresh.", evidence: ev("documented", ["s1"]) },
      { title: "User-managed vs admin-managed is permanent", detail: "The choice shapes scopes and who can install; changing it later means a new app.", evidence: ev("documented", ["s2"]) },
      { title: "Development and production credentials differ", detail: "Published apps get production credentials; make sure your config switches when the listing goes live.", evidence: ev("documented", ["s3"]) }
    ],
    whenStuck: [
      { situation: "External user cannot install", action: "The app is unpublished. Either add them as a beta tester in distribution settings or wait for the review.", evidence: ev("documented", ["s3"]) },
      { situation: "Review rejected on security answers", action: "Rewrite answers with specifics (where data lives, encryption at rest and in transit, retention period) and resubmit; the forum has examples of accepted wording.", link: "https://devforum.zoom.us/", evidence: ev("reported", ["s5"]) }
    ],
    sources: [
      src("s1", ZOOM_VISITED[0].url, ZOOM_VISITED[0].title!),
      src("s2", ZOOM_VISITED[1].url, ZOOM_VISITED[1].title!),
      src("s3", ZOOM_VISITED[2].url, ZOOM_VISITED[2].title!),
      src("s4", ZOOM_VISITED[3].url, ZOOM_VISITED[3].title!),
      src("s5", ZOOM_VISITED[4].url, ZOOM_VISITED[4].title!, "community")
    ],
    verification: { status: "unverified", checkedClaims: 0, corrected: [], unverifiable: [] },
    openQuestions: ["Current cap on external beta testers", "Whether an unlisted published state exists for enterprise customers"]
  })
};

// ---------------------------------------------------------------------------------------------
// Discord: OAuth is instant; the long clock is bot verification, not OAuth
// ---------------------------------------------------------------------------------------------

const DISCORD_VISITED: VisitedSource[] = [
  { url: "https://discord.com/developers/docs/topics/oauth2", title: "Discord Developers: OAuth2", via: "fetch" },
  { url: "https://discord.com/developers/docs/quick-start/getting-started", title: "Discord Developers: Getting started", via: "fetch" },
  { url: "https://discord.com/developers/applications", title: "Discord Developer Portal: Applications", via: "search" },
  { url: "https://support-dev.discord.com/hc/en-us", title: "Discord Developer Support: verification and intents articles", via: "search" }
];

export const discord: Fixture = {
  key: "discord",
  aliases: ["discord", "discord.com", "discordapp"],
  resolved: {
    name: "Discord",
    website: "https://discord.com",
    docsUrl: "https://discord.com/developers/docs",
    developerPortalUrl: "https://discord.com/developers/applications",
    category: "Community chat",
    oneLiner: "Chat for communities; apps combine OAuth2 user authorization with bots installed into servers.",
    supportsOAuth: true,
    authMethodsSeen: ["oauth2", "bot_token"],
    confidence: "high"
  },
  resolveActivity: [
    { kind: "search", detail: "Discord developer portal OAuth2 application", wait: 500 },
    { kind: "text", detail: "Applications are created in the Developer Portal; OAuth2 docs cover user authorization, bot installs are a separate concern.", wait: 300 }
  ],
  investigateActivity: [
    { kind: "fetch", detail: "https://discord.com/developers/docs/topics/oauth2", wait: 900 },
    { kind: "search", detail: "Discord app verification server threshold identity", wait: 600 },
    { kind: "fetch", detail: "https://discord.com/developers/docs/quick-start/getting-started", wait: 800 },
    { kind: "search", detail: "Discord privileged intents approval message content", wait: 600 },
    { kind: "text", detail: "OAuth2 needs no review. Verification and privileged intents only matter once a bot grows across many servers.", wait: 300 }
  ],
  visited: DISCORD_VISITED,
  memo: {
    findings: [
      { topic: "registration", claim: "Create an application in the Developer Portal; the OAuth2 page gives the client ID, secret and redirect list immediately.", evidenceLevel: "documented", urls: [DISCORD_VISITED[2].url, DISCORD_VISITED[1].url], quoteOrDetail: "New Application" },
      { topic: "flows", claim: "Authorization code (with optional PKCE), implicit, and client credentials for testing; scopes such as identify, email, guilds, bot and applications.commands.", evidenceLevel: "documented", urls: [DISCORD_VISITED[0].url], quoteOrDetail: "OAuth2 scopes table" },
      { topic: "productionGate", claim: "There is no review before any Discord user can authorize the OAuth2 app.", evidenceLevel: "documented", urls: [DISCORD_VISITED[0].url], quoteOrDetail: "no approval step in the flow" },
      { topic: "unusual", claim: "Bots that grow across many servers must be verified (identity check of the developer) and need approval for privileged intents such as message content.", evidenceLevel: "reported", urls: [DISCORD_VISITED[3].url], quoteOrDetail: "verification and privileged intents articles" },
      { topic: "timingCost", claim: "Free. Verification turnaround is reported in days to a few weeks.", evidenceLevel: "reported", urls: [DISCORD_VISITED[3].url], quoteOrDetail: "support articles and community reports" }
    ],
    unknowns: ["The current server-count threshold that triggers mandatory bot verification", "Verification turnaround"]
  },
  draft: ({ now, slug }) => ({
    schemaVersion: 1,
    slug,
    app: { name: "Discord", website: "https://discord.com", docsUrl: "https://discord.com/developers/docs", developerPortalUrl: "https://discord.com/developers/applications", category: "Community chat", oneLiner: "Chat for communities; apps combine OAuth2 user authorization with bots installed into servers." },
    generatedBy: "agent",
    generatedAt: now,
    lastVerifiedAt: now,
    oauth: { supportsOAuth: true, flows: ["authorization_code", "pkce", "client_credentials"], alternatives: ["bot_token"], composioManaged: "unknown", composioToolkitSlug: "discord", dynamicClientRegistration: "unknown" },
    summary: {
      difficulty: 2,
      difficultyReason: "OAuth2 for user identity and guild access works for everyone the moment the app exists. The only gates are for bots at scale: developer verification and privileged intents.",
      timeToDevReady: { min: 10, max: 20, unit: "minutes", confidence: "high" },
      timeToProduction: { min: 10, max: 20, unit: "minutes", confidence: "high", note: "Same as dev-ready for OAuth2. If you ship a bot, plan for verification once it spreads across many servers (reported days to weeks)." },
      cost: "Free",
      blockers: [
        { text: "Bots in many servers need developer verification and, for message content or member lists, privileged-intent approval.", severity: "soft", evidence: ev("reported", ["s4"]) }
      ],
      tldr: "Discord is quick for OAuth2: create an application, add a redirect, request identify or guilds scopes, and any user can authorize today. The long clock belongs to bots, not OAuth: once a bot spreads across many servers it needs verification and privileged-intent approval."
    },
    prerequisites: [
      { text: "A Discord account with the Developer Portal enabled (any account).", owner: "you", evidence: ev("documented", ["s3"]) },
      { text: "Decide whether you need a bot in servers or only user authorization; a bot adds the verification path.", owner: "agent", evidence: ev("documented", ["s2"]) }
    ],
    paths: {
      dev: [
        { title: "Create the application", detail: "Developer Portal > New Application. The General Information page sets the name and icon users see on the consent screen.", owner: "you", effort: "3 min", consoleLocation: "discord.com/developers/applications", evidence: ev("documented", ["s3", "s2"]) },
        { title: "Configure OAuth2", detail: "Add redirect URIs and copy the client ID and secret. Use the URL generator to assemble the authorize link with scopes.", owner: "agent", effort: "5 min", consoleLocation: "Application > OAuth2", values: [{ field: "Redirect", value: "https://YOUR_DOMAIN/oauth/callback/discord" }, { field: "Scopes", value: "identify email guilds" }], evidence: ev("documented", ["s1"]) },
        { title: "Run the authorization code flow", detail: "Exchange the code at the token endpoint; refresh tokens are issued. Use PKCE for public clients.", owner: "agent", effort: "10 min", evidence: ev("documented", ["s1"]) }
      ],
      production: [
        { title: "Nothing extra for OAuth2 users", detail: "Any Discord user can authorize immediately. Only continue if your app includes a bot.", owner: "either", effort: "0 min", evidence: ev("documented", ["s1"]) },
        { title: "Bot only: request privileged intents and plan verification", detail: "Enable only the intents you need. When the bot approaches the server threshold, submit the verification form with your identity documents and a description of what the bot does.", owner: "you", effort: "30 min + days to weeks waiting (reported)", consoleLocation: "Application > Bot", evidence: ev("reported", ["s4"]) }
      ]
    },
    requirements: [
      { item: "Redirect URI(s)", required: true, evidence: ev("documented", ["s1"]) },
      { item: "Privacy policy and terms URLs", required: false, notes: "Shown on the app page and asked for at bot verification; not needed for OAuth2 alone.", evidence: ev("reported", ["s4"]) },
      { item: "Developer identity verification (bots at scale only)", required: false, evidence: ev("reported", ["s4"]) }
    ],
    gotchas: [
      { title: "Scopes decide the consent screen", detail: "Adding the bot scope turns the consent screen into a server-install dialog with permissions; keep user-only flows separate from bot installs.", evidence: ev("documented", ["s1"]) },
      { title: "guilds does not read channels", detail: "guilds lists the user's servers only; reading messages or members needs a bot with the right intents and permissions.", evidence: ev("documented", ["s1"]) }
    ],
    whenStuck: [
      { situation: "Invalid redirect_uri", action: "The URI must match one in the OAuth2 redirect list exactly, including scheme and path.", evidence: ev("documented", ["s1"]) },
      { situation: "Bot cannot join more servers", action: "The verification threshold was reached; submit the verification form from the Bot page.", link: "https://support-dev.discord.com/hc/en-us", evidence: ev("reported", ["s4"]) }
    ],
    sources: [
      src("s1", DISCORD_VISITED[0].url, DISCORD_VISITED[0].title!),
      src("s2", DISCORD_VISITED[1].url, DISCORD_VISITED[1].title!),
      src("s3", DISCORD_VISITED[2].url, DISCORD_VISITED[2].title!),
      src("s4", DISCORD_VISITED[3].url, DISCORD_VISITED[3].title!)
    ],
    verification: { status: "unverified", checkedClaims: 0, corrected: [], unverifiable: [] },
    openQuestions: ["The current server-count threshold that triggers mandatory bot verification", "Verification turnaround"]
  })
};

// ---------------------------------------------------------------------------------------------
// Dropbox: development status caps users; production approval is a real but short review
// ---------------------------------------------------------------------------------------------

const DROPBOX_VISITED: VisitedSource[] = [
  { url: "https://developers.dropbox.com/oauth-guide", title: "Dropbox Developers: OAuth guide", via: "fetch" },
  { url: "https://www.dropbox.com/developers/reference/developer-guide", title: "Dropbox Developers: Developer guide (app status, production approval)", via: "fetch" },
  { url: "https://www.dropbox.com/developers/apps", title: "Dropbox App Console", via: "search" },
  { url: "https://www.dropboxforum.com/", title: "Dropbox Community forum", via: "search" }
];

export const dropbox: Fixture = {
  key: "dropbox",
  aliases: ["dropbox", "dropbox.com"],
  resolved: {
    name: "Dropbox",
    website: "https://www.dropbox.com",
    docsUrl: "https://www.dropbox.com/developers/documentation",
    developerPortalUrl: "https://www.dropbox.com/developers/apps",
    category: "File storage",
    oneLiner: "Cloud file storage with scoped apps that start in a capped development status.",
    supportsOAuth: true,
    authMethodsSeen: ["oauth2"],
    confidence: "high"
  },
  resolveActivity: [
    { kind: "search", detail: "Dropbox app console OAuth developer guide", wait: 500 },
    { kind: "text", detail: "Apps are created in the App Console; the developer guide explains development vs production status.", wait: 300 }
  ],
  investigateActivity: [
    { kind: "fetch", detail: "https://developers.dropbox.com/oauth-guide", wait: 900 },
    { kind: "search", detail: "Dropbox development status 50 users apply for production", wait: 600 },
    { kind: "fetch", detail: "https://www.dropbox.com/developers/reference/developer-guide", wait: 900 },
    { kind: "search", detail: "Dropbox production approval how long forum", wait: 600 },
    { kind: "text", detail: "Development apps are capped at a small number of users; production approval is reviewed by Dropbox.", wait: 300 }
  ],
  visited: DROPBOX_VISITED,
  memo: {
    findings: [
      { topic: "registration", claim: "Apps are created in the App Console with an access type (App folder or Full Dropbox) and a scoped permission set.", evidenceLevel: "documented", urls: [DROPBOX_VISITED[2].url, DROPBOX_VISITED[1].url], quoteOrDetail: "Create app > Scoped access" },
      { topic: "flows", claim: "Authorization code flow with PKCE for public clients; short-lived access tokens with refresh tokens when offline access is requested.", evidenceLevel: "documented", urls: [DROPBOX_VISITED[0].url], quoteOrDetail: "token_access_type=offline" },
      { topic: "devLimits", claim: "A new app is in development status and only a limited number of users can link it; the cap is shown in the App Console.", evidenceLevel: "documented", urls: [DROPBOX_VISITED[1].url], quoteOrDetail: "Development vs production status" },
      { topic: "productionGate", claim: "To remove the cap you apply for production from the App Console and Dropbox reviews the app.", evidenceLevel: "documented", urls: [DROPBOX_VISITED[1].url], quoteOrDetail: "Apply for production" },
      { topic: "reviewRequirements", claim: "The review checks naming and branding rules, that requested scopes match the described use, and that the app is functional.", evidenceLevel: "documented", urls: [DROPBOX_VISITED[1].url], quoteOrDetail: "production approval checklist" },
      { topic: "timingCost", claim: "Free. Community reports put approval at a few business days to about two weeks.", evidenceLevel: "reported", urls: [DROPBOX_VISITED[3].url], quoteOrDetail: "forum reports" }
    ],
    unknowns: ["The exact current development-user cap", "Official review SLA"]
  },
  draft: ({ now, slug }) => ({
    schemaVersion: 1,
    slug,
    app: { name: "Dropbox", website: "https://www.dropbox.com", docsUrl: "https://www.dropbox.com/developers/documentation", developerPortalUrl: "https://www.dropbox.com/developers/apps", category: "File storage", oneLiner: "Cloud file storage with scoped apps that start in a capped development status." },
    generatedBy: "agent",
    generatedAt: now,
    lastVerifiedAt: now,
    oauth: { supportsOAuth: true, flows: ["authorization_code", "pkce"], alternatives: [], composioManaged: "unknown", composioToolkitSlug: "dropbox", dynamicClientRegistration: "unknown" },
    summary: {
      difficulty: 3,
      difficultyReason: "Dev-ready in minutes, but a development-status app can only be linked by a small number of users. Production approval is a short, real review of scopes, naming and function.",
      timeToDevReady: { min: 15, max: 30, unit: "minutes", confidence: "high" },
      timeToProduction: { min: 3, max: 14, unit: "days", confidence: "low", note: "Production approval review; reported range, no published SLA." },
      cost: "Free",
      blockers: [
        { text: "Development status caps how many users can link the app; production approval is required before launch.", severity: "hard", evidence: ev("documented", ["s2"]) },
        { text: "Apps whose name or branding suggests Dropbox made them are rejected; check the naming rules before submitting.", severity: "soft", evidence: ev("documented", ["s2"]) }
      ],
      tldr: "Dropbox is a two-step provider. Create a scoped app in the App Console and you can link your own accounts within minutes, but the app stays in development status with a small user cap until you apply for production. That review is real but short, reported at days to two weeks."
    },
    prerequisites: [
      { text: "A Dropbox account (Basic is fine) to own the app.", owner: "you", evidence: ev("documented", ["s3"]) },
      { text: "Decide App folder vs Full Dropbox access; App folder avoids the broadest scopes and simplifies review.", owner: "agent", evidence: ev("documented", ["s2"]) }
    ],
    paths: {
      dev: [
        { title: "Create a scoped app", detail: "App Console > Create app > Scoped access. Choose the access type and give the app a name that does not include 'Dropbox'.", owner: "you", effort: "5 min", consoleLocation: "dropbox.com/developers/apps", values: [{ field: "Access type", value: "App folder unless you must read the whole account" }], evidence: ev("documented", ["s3", "s2"]) },
        { title: "Pick permissions and redirect URIs", detail: "On the Permissions tab select the minimum scopes; on Settings add the redirect URIs and copy the app key and secret.", owner: "agent", effort: "10 min", consoleLocation: "App > Settings and Permissions", values: [{ field: "Redirect URI", value: "https://YOUR_DOMAIN/oauth/callback/dropbox" }, { field: "Scopes", value: "files.metadata.read files.content.read" }], evidence: ev("documented", ["s1", "s2"]) },
        { title: "Run the flow with offline access", detail: "Request token_access_type=offline so you receive a refresh token; access tokens are short-lived.", owner: "agent", effort: "10 min", evidence: ev("documented", ["s1"]) }
      ],
      production: [
        { title: "Describe the app and confirm branding rules", detail: "Fill in the app description and icon, and make sure the name and visuals follow the branding guidelines.", owner: "agent", effort: "30 min", evidence: ev("documented", ["s2"]) },
        { title: "Apply for production", detail: "Click Apply for production in the App Console, answer the questions about how the app uses each scope, and submit.", owner: "you", effort: "20 min + 3-14 days waiting (reported)", consoleLocation: "App > Settings > Apply for production", evidence: ev("reported", ["s2", "s4"]) }
      ]
    },
    requirements: [
      { item: "Redirect URI(s)", required: true, evidence: ev("documented", ["s1"]) },
      { item: "Minimal scope set matching the described use", required: true, evidence: ev("documented", ["s2"]) },
      { item: "App name and branding that comply with Dropbox rules", required: true, evidence: ev("documented", ["s2"]) },
      { item: "Privacy policy", required: false, notes: "Not confirmed as mandatory in this run.", evidence: ev("inferred") }
    ],
    gotchas: [
      { title: "Short-lived access tokens", detail: "Without offline access you get no refresh token and the integration stops after the access token expires.", evidence: ev("documented", ["s1"]) },
      { title: "Changing scopes after approval", detail: "Adding scopes later means users re-authorize and may need another review pass.", evidence: ev("inferred") }
    ],
    whenStuck: [
      { situation: "A new user cannot link the app", action: "You hit the development-status cap. Apply for production, or remove unused test users from the app.", evidence: ev("documented", ["s2"]) },
      { situation: "Production application rejected", action: "The usual reasons are naming or branding and scopes broader than the described use. Fix and reapply; forum threads show typical wording.", link: "https://www.dropboxforum.com/", evidence: ev("reported", ["s4"]) }
    ],
    sources: [
      src("s1", DROPBOX_VISITED[0].url, DROPBOX_VISITED[0].title!),
      src("s2", DROPBOX_VISITED[1].url, DROPBOX_VISITED[1].title!),
      src("s3", DROPBOX_VISITED[2].url, DROPBOX_VISITED[2].title!),
      src("s4", DROPBOX_VISITED[3].url, DROPBOX_VISITED[3].title!, "community")
    ],
    verification: { status: "unverified", checkedClaims: 0, corrected: [], unverifiable: [] },
    openQuestions: ["The exact current development-user cap", "Official review SLA"]
  })
};

// ---------------------------------------------------------------------------------------------
// Salesforce: connected apps are self-serve; AppExchange is the long road
// ---------------------------------------------------------------------------------------------

const SALESFORCE_VISITED: VisitedSource[] = [
  { url: "https://help.salesforce.com/s/articleView?id=sf.connected_app_overview.htm&type=5", title: "Salesforce Help: Connected apps overview", via: "fetch" },
  { url: "https://help.salesforce.com/s/articleView?id=sf.connected_app_create_api_integration.htm&type=5", title: "Salesforce Help: Configure basic connected app settings and enable OAuth", via: "fetch" },
  { url: "https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/intro_oauth_and_connected_apps.htm", title: "Salesforce Developers: OAuth and connected apps (REST API guide)", via: "search" },
  { url: "https://developer.salesforce.com/docs/atlas.en-us.packagingGuide.meta/packagingGuide/security_review_overview.htm", title: "Salesforce Developers: AppExchange security review overview", via: "search" }
];

export const salesforce: Fixture = {
  key: "salesforce",
  aliases: ["salesforce", "salesforce.com", "sfdc", "force.com"],
  resolved: {
    name: "Salesforce",
    website: "https://www.salesforce.com",
    docsUrl: "https://developer.salesforce.com/docs",
    developerPortalUrl: "https://login.salesforce.com/",
    category: "CRM",
    oneLiner: "Enterprise CRM; integrations register a connected app inside a Salesforce org.",
    supportsOAuth: true,
    authMethodsSeen: ["oauth2", "jwt_bearer"],
    confidence: "high"
  },
  resolveActivity: [
    { kind: "search", detail: "Salesforce connected app OAuth create setup", wait: 500 },
    { kind: "text", detail: "OAuth apps are 'connected apps' created in Setup inside an org; no central developer portal.", wait: 300 }
  ],
  investigateActivity: [
    { kind: "fetch", detail: "https://help.salesforce.com/s/articleView?id=sf.connected_app_overview.htm&type=5", wait: 900 },
    { kind: "fetch", detail: "https://help.salesforce.com/s/articleView?id=sf.connected_app_create_api_integration.htm&type=5", wait: 900 },
    { kind: "search", detail: "Salesforce connected app admin approved users pre-authorized self-authorize", wait: 600 },
    { kind: "search", detail: "Salesforce AppExchange security review duration cost", wait: 600 },
    { kind: "text", detail: "A bespoke connected app needs no Salesforce review; AppExchange listing is the long path.", wait: 300 }
  ],
  visited: SALESFORCE_VISITED,
  memo: {
    findings: [
      { topic: "registration", claim: "A connected app is created in Setup > App Manager > New Connected App inside any org, including a free Developer Edition org.", evidenceLevel: "documented", urls: [SALESFORCE_VISITED[0].url, SALESFORCE_VISITED[1].url], quoteOrDetail: "New Connected App" },
      { topic: "flows", claim: "Authorization code (web server), PKCE, JWT bearer for server-to-server, and device flows; consumer key and secret are issued on save.", evidenceLevel: "documented", urls: [SALESFORCE_VISITED[2].url, SALESFORCE_VISITED[1].url], quoteOrDetail: "OAuth flows" },
      { topic: "unusual", claim: "After creating or editing a connected app, allow 2 to 10 minutes for the change to propagate before it works.", evidenceLevel: "documented", urls: [SALESFORCE_VISITED[1].url], quoteOrDetail: "allow 2-10 minutes" },
      { topic: "productionGate", claim: "By default all users may self-authorize; an admin can instead require pre-authorization, which blocks users until the app is approved in that org.", evidenceLevel: "documented", urls: [SALESFORCE_VISITED[0].url], quoteOrDetail: "Permitted Users: All users may self-authorize / Admin approved users are pre-authorized" },
      { topic: "productionGate", claim: "No Salesforce review is needed for a connected app you distribute yourself; an AppExchange listing requires the partner program and a security review.", evidenceLevel: "documented", urls: [SALESFORCE_VISITED[3].url], quoteOrDetail: "security review overview" },
      { topic: "timingCost", claim: "Security review timing and fees change; community reports range from several weeks to months.", evidenceLevel: "reported", urls: [SALESFORCE_VISITED[3].url], quoteOrDetail: "no SLA published" }
    ],
    unknowns: ["Current AppExchange security review fee and typical duration", "Whether External Client Apps change the propagation delay"]
  },
  draft: ({ now, slug }) => ({
    schemaVersion: 1,
    slug,
    app: { name: "Salesforce", website: "https://www.salesforce.com", docsUrl: "https://developer.salesforce.com/docs", developerPortalUrl: "https://login.salesforce.com/", category: "CRM", oneLiner: "Enterprise CRM; integrations register a connected app inside a Salesforce org." },
    generatedBy: "agent",
    generatedAt: now,
    lastVerifiedAt: now,
    oauth: { supportsOAuth: true, flows: ["authorization_code", "pkce", "jwt_bearer", "device_code"], alternatives: [], composioManaged: "unknown", composioToolkitSlug: "salesforce", dynamicClientRegistration: "unknown", notes: "The connected app lives in the org that creates it, but users of other orgs can authorize it; admins in those orgs may require pre-authorization." },
    summary: {
      difficulty: 2,
      difficultyReason: "A connected app is self-serve and needs no Salesforce review. The friction is enterprise admin policy (pre-authorization) and the propagation delay. AppExchange listing is a separate, long road.",
      timeToDevReady: { min: 20, max: 40, unit: "minutes", confidence: "high", note: "Includes the 2-10 minute propagation wait." },
      timeToProduction: { min: 20, max: 40, unit: "minutes", confidence: "medium", note: "Same as dev-ready for direct distribution. AppExchange listing with security review is reported at weeks to months." },
      cost: "Free for a connected app; the AppExchange partner program and security review have their own terms.",
      blockers: [
        { text: "Enterprise admins can set the app to admin-approved users only, so a customer's admin may have to approve before their users can connect.", severity: "soft", evidence: ev("documented", ["s1"]) },
        { text: "AppExchange listing requires the partner program and a security review with a reported multi-week wait.", severity: "soft", evidence: ev("reported", ["s4"]) }
      ],
      tldr: "Salesforce is easier than its reputation for a bespoke integration: create a connected app in any org, wait a few minutes for it to propagate, and users in other orgs can authorize it with no Salesforce review. The long clock only starts if you want an AppExchange listing, which needs the partner program and a security review."
    },
    prerequisites: [
      { text: "A Salesforce org to own the app; a free Developer Edition org works.", owner: "you", evidence: ev("documented", ["s2"]) },
      { text: "Know the login host per customer: login.salesforce.com for production, test.salesforce.com for sandboxes, or the org's My Domain.", owner: "agent", evidence: ev("documented", ["s3"]) }
    ],
    paths: {
      dev: [
        { title: "Create the connected app", detail: "Setup > App Manager > New Connected App. Enter name, API name and contact email, then enable OAuth settings.", owner: "you", effort: "10 min", consoleLocation: "Setup > App Manager > New Connected App", values: [{ field: "Callback URL", value: "https://YOUR_DOMAIN/oauth/callback/salesforce" }, { field: "Selected OAuth scopes", value: "api refresh_token offline_access" }], evidence: ev("documented", ["s2"]) },
        { title: "Wait for propagation and copy credentials", detail: "Salesforce says to allow 2 to 10 minutes before using the app. Copy the consumer key and secret from the app's Manage Consumer Details page.", owner: "you", effort: "10 min", evidence: ev("documented", ["s2"]) },
        { title: "Run the web server flow", detail: "Authorize at /services/oauth2/authorize on the right login host, exchange the code at /services/oauth2/token, and store the instance URL returned with the token.", owner: "agent", effort: "15 min", evidence: ev("documented", ["s3"]) }
      ],
      production: [
        { title: "Decide permitted-user policy and document admin steps", detail: "Leave 'All users may self-authorize' for the broadest reach, and write a one-page note for customer admins who choose pre-authorization.", owner: "agent", effort: "30 min", evidence: ev("documented", ["s1"]) },
        { title: "Optional: AppExchange listing", detail: "Join the partner program, package the app, and submit it for the security review. Only needed for marketplace distribution.", owner: "you", effort: "weeks to months (reported)", evidence: ev("reported", ["s4"]) }
      ]
    },
    requirements: [
      { item: "Callback URL", required: true, evidence: ev("documented", ["s2"]) },
      { item: "Contact email on the app", required: true, evidence: ev("documented", ["s2"]) },
      { item: "Partner program membership and security review (AppExchange only)", required: false, evidence: ev("documented", ["s4"]) }
    ],
    gotchas: [
      { title: "The 2-10 minute delay", detail: "A brand-new connected app returns invalid_client_id until it propagates. Wait before debugging.", evidence: ev("documented", ["s2"]) },
      { title: "Sandbox vs production hosts", detail: "Sandboxes authorize at test.salesforce.com; using the wrong host fails with an unhelpful error.", evidence: ev("documented", ["s3"]) },
      { title: "Instance URL per org", detail: "API calls go to the instance_url returned with the token, not a fixed host.", evidence: ev("documented", ["s3"]) }
    ],
    whenStuck: [
      { situation: "invalid_client_id right after creation", action: "Wait up to 10 minutes; the app has not propagated yet.", evidence: ev("documented", ["s2"]) },
      { situation: "A customer's users cannot authorize", action: "Their admin set the app to pre-authorized users; ask the admin to approve the app and assign profiles or permission sets.", evidence: ev("documented", ["s1"]) }
    ],
    sources: [
      src("s1", SALESFORCE_VISITED[0].url, SALESFORCE_VISITED[0].title!),
      src("s2", SALESFORCE_VISITED[1].url, SALESFORCE_VISITED[1].title!),
      src("s3", SALESFORCE_VISITED[2].url, SALESFORCE_VISITED[2].title!),
      src("s4", SALESFORCE_VISITED[3].url, SALESFORCE_VISITED[3].title!)
    ],
    verification: { status: "unverified", checkedClaims: 0, corrected: [], unverifiable: [] },
    openQuestions: ["Current AppExchange security review fee and typical duration", "Whether External Client Apps change the propagation delay"]
  })
};

// ---------------------------------------------------------------------------------------------
// Stripe: OAuth for Connect; the gate is platform activation, not a review
// ---------------------------------------------------------------------------------------------

const STRIPE_VISITED: VisitedSource[] = [
  { url: "https://docs.stripe.com/connect/oauth-standard-accounts", title: "Stripe Docs: Using OAuth with Standard accounts", via: "fetch" },
  { url: "https://docs.stripe.com/connect/oauth-reference", title: "Stripe Docs: OAuth reference", via: "fetch" },
  { url: "https://dashboard.stripe.com/settings/connect", title: "Stripe Dashboard: Connect settings", via: "search" },
  { url: "https://docs.stripe.com/connect", title: "Stripe Docs: Connect overview", via: "search" }
];

export const stripe: Fixture = {
  key: "stripe",
  aliases: ["stripe", "stripe.com"],
  resolved: {
    name: "Stripe",
    website: "https://stripe.com",
    docsUrl: "https://docs.stripe.com",
    developerPortalUrl: "https://dashboard.stripe.com/settings/connect",
    category: "Payments",
    oneLiner: "Payments platform; third-party access to other businesses' accounts goes through Stripe Connect OAuth.",
    supportsOAuth: true,
    authMethodsSeen: ["oauth2_connect", "api_key"],
    confidence: "high"
  },
  resolveActivity: [
    { kind: "search", detail: "Stripe OAuth connect standard accounts client id", wait: 500 },
    { kind: "text", detail: "OAuth exists only through Connect: your platform account authorizes against other Stripe accounts.", wait: 300 }
  ],
  investigateActivity: [
    { kind: "fetch", detail: "https://docs.stripe.com/connect/oauth-standard-accounts", wait: 900 },
    { kind: "fetch", detail: "https://docs.stripe.com/connect/oauth-reference", wait: 800 },
    { kind: "search", detail: "Stripe Connect platform activation live mode requirements", wait: 600 },
    { kind: "search", detail: "Stripe OAuth standard accounts vs account links onboarding recommendation", wait: 600 },
    { kind: "text", detail: "Test mode works immediately; live mode needs an activated platform account. No review queue.", wait: 300 }
  ],
  visited: STRIPE_VISITED,
  memo: {
    findings: [
      { topic: "registration", claim: "OAuth settings live in Dashboard > Settings > Connect: a test and a live client ID, plus the redirect URI list.", evidenceLevel: "documented", urls: [STRIPE_VISITED[2].url, STRIPE_VISITED[0].url], quoteOrDetail: "Connect settings > OAuth" },
      { topic: "flows", claim: "Authorization code flow at connect.stripe.com/oauth/authorize; the token response includes the connected stripe_user_id and keys.", evidenceLevel: "documented", urls: [STRIPE_VISITED[1].url], quoteOrDetail: "OAuth reference" },
      { topic: "devLimits", claim: "The test-mode client ID works as soon as Connect is enabled; live mode requires the platform account to be activated with business details.", evidenceLevel: "documented", urls: [STRIPE_VISITED[0].url, STRIPE_VISITED[3].url], quoteOrDetail: "activate your account" },
      { topic: "productionGate", claim: "There is no app review; the production gate is account activation and the Connect platform profile.", evidenceLevel: "documented", urls: [STRIPE_VISITED[3].url], quoteOrDetail: "platform profile" },
      { topic: "unusual", claim: "Stripe steers new platforms towards Connect onboarding with Account Links rather than OAuth for Standard accounts.", evidenceLevel: "reported", urls: [STRIPE_VISITED[0].url], quoteOrDetail: "recommendation in docs" },
      { topic: "timingCost", claim: "Free to set up; activation depends on business verification and is reported at hours to a few days.", evidenceLevel: "reported", urls: [STRIPE_VISITED[3].url], quoteOrDetail: "activation timing" }
    ],
    unknowns: ["Whether OAuth for Standard accounts is still offered to brand-new platforms in every country", "Activation turnaround for your country"]
  },
  draft: ({ now, slug }) => ({
    schemaVersion: 1,
    slug,
    app: { name: "Stripe", website: "https://stripe.com", docsUrl: "https://docs.stripe.com", developerPortalUrl: "https://dashboard.stripe.com/settings/connect", category: "Payments", oneLiner: "Payments platform; third-party access to other businesses' accounts goes through Stripe Connect OAuth." },
    generatedBy: "agent",
    generatedAt: now,
    lastVerifiedAt: now,
    oauth: { supportsOAuth: true, flows: ["authorization_code"], alternatives: ["api_key"], composioManaged: "unknown", composioToolkitSlug: "stripe", dynamicClientRegistration: "unknown", notes: "OAuth here means Stripe Connect: a platform account authorizing against other Stripe accounts. For your own account, restricted API keys are the normal path." },
    summary: {
      difficulty: 3,
      difficultyReason: "No review queue, but live OAuth needs an activated platform account with business details, and Stripe nudges new platforms to a different onboarding flow.",
      timeToDevReady: { min: 15, max: 30, unit: "minutes", confidence: "high", note: "Test mode." },
      timeToProduction: { min: 1, max: 3, unit: "days", confidence: "low", note: "Platform account activation and Connect profile; reported, varies by country." },
      cost: "Free to integrate; Connect pricing applies to payments processed through connected accounts.",
      blockers: [
        { text: "Live-mode OAuth requires an activated Stripe account with verified business details.", severity: "hard", evidence: ev("documented", ["s1", "s4"]) },
        { text: "Stripe recommends Account Links onboarding over OAuth for new Standard-account platforms; confirm OAuth is the right tool before building.", severity: "soft", evidence: ev("reported", ["s1"]) }
      ],
      tldr: "Stripe has no app review, but OAuth only exists through Connect. You can run the test-mode flow within half an hour; going live means activating your platform account with business details and completing the Connect profile, reported at a day to a few days. Check first whether Stripe wants you on Account Links instead of OAuth."
    },
    prerequisites: [
      { text: "A Stripe account with Connect enabled; activation (business details) is needed for live mode.", owner: "you", evidence: ev("documented", ["s4"]) },
      { text: "Decide whether you need access to other businesses' Stripe accounts (Connect OAuth) or only your own (restricted API key).", owner: "agent", evidence: ev("documented", ["s4"]) }
    ],
    paths: {
      dev: [
        { title: "Enable Connect and open OAuth settings", detail: "Dashboard > Settings > Connect. Complete the platform profile questions; the OAuth section shows the test client ID.", owner: "you", effort: "10 min", consoleLocation: "dashboard.stripe.com/settings/connect", evidence: ev("documented", ["s3", "s1"]) },
        { title: "Add redirect URIs and branding", detail: "Register the redirect URI and set the name and icon shown on the authorization page.", owner: "agent", effort: "5 min", values: [{ field: "Redirect URI", value: "https://YOUR_DOMAIN/oauth/callback/stripe" }, { field: "Scope", value: "read_write (or read_only for reporting)" }], evidence: ev("documented", ["s1"]) },
        { title: "Run the test-mode flow", detail: "Send the user to connect.stripe.com/oauth/authorize with the test client ID, exchange the code, and store the stripe_user_id for the connected account.", owner: "agent", effort: "15 min", evidence: ev("documented", ["s2"]) }
      ],
      production: [
        { title: "Activate the platform account", detail: "Complete business verification in the Dashboard so live mode is available; the live client ID appears once activated.", owner: "you", effort: "30 min + up to a few days (reported)", evidence: ev("reported", ["s4"]) },
        { title: "Switch to the live client ID and handle deauthorization", detail: "Use the live client ID in production and implement the deauthorize endpoint so disconnects clean up stored credentials.", owner: "agent", effort: "20 min", evidence: ev("documented", ["s2"]) }
      ]
    },
    requirements: [
      { item: "Redirect URI(s)", required: true, evidence: ev("documented", ["s1"]) },
      { item: "Activated Stripe account (live mode)", required: true, evidence: ev("documented", ["s4"]) },
      { item: "Connect platform profile", required: true, evidence: ev("documented", ["s4"]) },
      { item: "Privacy policy and terms", required: false, notes: "Shown to connecting businesses via your branding settings; not a Stripe gate.", evidence: ev("inferred") }
    ],
    gotchas: [
      { title: "Test and live client IDs differ", detail: "Tokens from the test client ID only work in test mode; a config that does not switch IDs breaks silently in production.", evidence: ev("documented", ["s1"]) },
      { title: "OAuth is not the recommended path for everyone", detail: "Stripe's docs steer new platforms to Account Links; if you only need your own account, use a restricted key.", evidence: ev("reported", ["s1"]) }
    ],
    whenStuck: [
      { situation: "Live client ID missing", action: "The account is not activated. Finish business verification in the Dashboard.", evidence: ev("documented", ["s4"]) },
      { situation: "Connected account disconnected", action: "Handle the deauthorize webhook and delete stored keys for that stripe_user_id.", evidence: ev("documented", ["s2"]) }
    ],
    sources: [
      src("s1", STRIPE_VISITED[0].url, STRIPE_VISITED[0].title!),
      src("s2", STRIPE_VISITED[1].url, STRIPE_VISITED[1].title!),
      src("s3", STRIPE_VISITED[2].url, STRIPE_VISITED[2].title!),
      src("s4", STRIPE_VISITED[3].url, STRIPE_VISITED[3].title!)
    ],
    verification: { status: "unverified", checkedClaims: 0, corrected: [], unverifiable: [] },
    openQuestions: ["Whether OAuth for Standard accounts is still offered to brand-new platforms in every country", "Activation turnaround for your country"]
  })
};

export const EXTRA_FIXTURES: Fixture[] = [zoom, discord, dropbox, salesforce, stripe];
