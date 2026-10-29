/**
 * Probes are the "attempt as much of the setup as practical" part that needs no account:
 * cheap, deterministic HTTP checks whose results become "probe" sources with evidence level
 * "tested". They never guess; a probe either observed something or reports "unknown".
 */

export type ProbeResult = {
  id: string;
  label: string;
  url: string;
  outcome: "yes" | "no" | "unknown";
  detail: string;
};

export type ComposioStatus = {
  outcome: "yes" | "no" | "unknown";
  slug?: string;
  name?: string;
  authSchemes?: string[];
  managedSchemes?: string[];
  authGuideUrl?: string | null;
  detail: string;
};

const TIMEOUT_MS = 6000;

async function timedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "user-agent": "oauth-pathfinder-probe/0.1 (+https://github.com)", ...(init.headers || {}) }
    });
  } finally {
    clearTimeout(t);
  }
}

function originOf(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/** RFC 8414 / OIDC discovery + RFC 7591 dynamic client registration. If present, no manual OAuth app may be needed (MCP-style). */
export async function probeOAuthMetadata(website?: string): Promise<ProbeResult[]> {
  const origin = website ? originOf(website) : null;
  if (!origin) return [];
  const results: ProbeResult[] = [];
  const candidates = [
    `${origin}/.well-known/oauth-authorization-server`,
    `${origin}/.well-known/openid-configuration`
  ];
  for (const url of candidates) {
    try {
      const res = await timedFetch(url, { method: "GET", headers: { accept: "application/json" } });
      const ct = res.headers.get("content-type") || "";
      if (res.ok && ct.includes("json")) {
        const json: any = await res.json().catch(() => null);
        const reg = json?.registration_endpoint;
        results.push({
          id: `probe-meta-${results.length}`,
          label: "OAuth/OIDC discovery document",
          url,
          outcome: "yes",
          detail: `Found discovery metadata (issuer: ${json?.issuer ?? "n/a"}). ${reg ? `Dynamic client registration endpoint advertised: ${reg}` : "No registration_endpoint, so an OAuth app must still be registered manually."}`
        });
        results.push({
          id: `probe-dcr`,
          label: "Dynamic client registration",
          url: reg || url,
          outcome: reg ? "yes" : "no",
          detail: reg ? "registration_endpoint present in metadata" : "registration_endpoint absent from metadata"
        });
        return results;
      }
      results.push({
        id: `probe-meta-${results.length}`,
        label: "OAuth/OIDC discovery document",
        url,
        outcome: "no",
        detail: `HTTP ${res.status}, content-type ${ct || "none"}`
      });
    } catch (e) {
      results.push({
        id: `probe-meta-${results.length}`,
        label: "OAuth/OIDC discovery document",
        url,
        outcome: "unknown",
        detail: `Request failed: ${(e as Error).message}`
      });
    }
  }
  return results;
}

/** Is the developer portal reachable without auth, or does it redirect to a login/signup wall? */
export async function probeDeveloperPortal(portalUrl?: string): Promise<ProbeResult | null> {
  if (!portalUrl) return null;
  try {
    const res = await timedFetch(portalUrl, { method: "GET" });
    const finalUrl = res.url || portalUrl;
    const walled = /login|signin|sign-in|auth|account|signup|register/i.test(finalUrl) && finalUrl !== portalUrl;
    return {
      id: "probe-portal",
      label: "Developer portal reachability",
      url: portalUrl,
      outcome: res.ok ? "yes" : "no",
      detail: `HTTP ${res.status}${walled ? `, redirected to a sign-in page (${finalUrl})` : ""}. ${walled ? "Creating an app requires an account; expect to sign in before you see the form." : "Portal loads without authentication."}`
    };
  } catch (e) {
    return {
      id: "probe-portal",
      label: "Developer portal reachability",
      url: portalUrl,
      outcome: "unknown",
      detail: `Request failed: ${(e as Error).message}`
    };
  }
}

/**
 * Ask Composio whether it already provides a managed OAuth app for this toolkit.
 * API: GET https://backend.composio.dev/api/v3/toolkits?search=... and /api/v3/toolkits/{slug}
 * Fields: auth_schemes, composio_managed_auth_schemes, auth_guide_url.
 * Needs COMPOSIO_API_KEY; without it we return "unknown" and link the docs page.
 */
export async function probeComposio(appName: string, website?: string): Promise<ComposioStatus> {
  const key = process.env.COMPOSIO_API_KEY;
  if (!key) {
    return { outcome: "unknown", detail: "COMPOSIO_API_KEY not configured; check https://docs.composio.dev/toolkits/managed-auth manually." };
  }
  try {
    const q = encodeURIComponent(appName);
    const list = await timedFetch(`https://backend.composio.dev/api/v3/toolkits?search=${q}&limit=5`, {
      headers: { "x-api-key": key, accept: "application/json" }
    });
    if (!list.ok) return { outcome: "unknown", detail: `Composio API returned HTTP ${list.status}` };
    const data: any = await list.json();
    const items: any[] = data?.items ?? [];
    if (!items.length) return { outcome: "unknown", detail: `No Composio toolkit matched "${appName}". It may not be in the catalog, or the name differs.` };

    // Prefer exact name/slug match, else domain match, else first result.
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const host = website ? new URL(website).hostname.replace(/^www\./, "").split(".")[0] : "";
    const pick =
      items.find((t) => norm(t.name) === norm(appName) || norm(t.slug) === norm(appName)) ||
      items.find((t) => host && (norm(t.slug) === norm(host) || norm(t.name) === norm(host))) ||
      items[0];

    const detail = await timedFetch(`https://backend.composio.dev/api/v3/toolkits/${encodeURIComponent(pick.slug)}`, {
      headers: { "x-api-key": key, accept: "application/json" }
    });
    const tk: any = detail.ok ? await detail.json() : pick;
    const authSchemes: string[] = tk.auth_schemes ?? tk.auth_config_details?.map((a: any) => a.mode) ?? [];
    const managed: string[] = tk.composio_managed_auth_schemes ?? [];
    const managesOAuth = managed.some((m) => /oauth/i.test(m));
    return {
      outcome: managesOAuth ? "yes" : "no",
      slug: tk.slug,
      name: tk.name,
      authSchemes,
      managedSchemes: managed,
      authGuideUrl: tk.auth_guide_url ?? null,
      detail: managesOAuth
        ? `Composio provides a managed OAuth app for toolkit "${tk.slug}" (${managed.join(", ")}). You can skip registering your own unless you need your brand on the consent screen, custom scopes, or your own rate-limit quota.`
        : `Toolkit "${tk.slug}" exists but Composio does not manage its OAuth (managed: ${managed.join(", ") || "none"}; supported: ${authSchemes.join(", ") || "n/a"}). You must bring your own OAuth app.`
    };
  } catch (e) {
    return { outcome: "unknown", detail: `Composio lookup failed: ${(e as Error).message}` };
  }
}
