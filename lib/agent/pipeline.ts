import { parseGuide, type Guide } from "../schema";
import { slugify } from "../format";
import { research, complete, type VisitedSource } from "./client";
import { extractJson } from "./json";
import { probeComposio, probeDeveloperPortal, probeOAuthMetadata, type ProbeResult } from "./probe";
import {
  INVESTIGATE_SYSTEM,
  RESOLVE_SYSTEM,
  SYNTHESIZE_SYSTEM,
  VERIFY_SYSTEM,
  investigateUser,
  resolveUser,
  synthesizeUser,
  verifyUser
} from "./prompts";

export type StageName = "resolve" | "investigate" | "probe" | "synthesize" | "verify" | "done" | "error";

export type PipelineEvent =
  | { type: "stage"; stage: StageName; message: string }
  | { type: "activity"; stage: StageName; kind: "search" | "fetch" | "probe" | "note"; detail: string }
  | { type: "result"; stage: StageName; data: unknown }
  | { type: "done"; guide: Guide; auditLog: string[]; stats: Record<string, number> }
  | { type: "error"; message: string; stage: StageName };

export type Emit = (e: PipelineEvent) => void;

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

function cleanUrl(u?: string): string | undefined {
  if (!u || typeof u !== "string") return undefined;
  try {
    const url = new URL(u.trim());
    return url.toString();
  } catch {
    return undefined;
  }
}

/**
 * Runs the whole thing. Roughly 60-150 seconds depending on how much the model reads.
 * Budget per run: ~12 searches, ~8 fetches, 4-5 model calls.
 */
export async function generateGuide(query: string, emit: Emit): Promise<{ guide: Guide; auditLog: string[] }> {
  const now = new Date().toISOString();
  const stats: Record<string, number> = { searches: 0, fetches: 0, inputTokens: 0, outputTokens: 0 };
  const visited = new Map<string, VisitedSource>();
  const track = (vs: VisitedSource[]) => {
    for (const v of vs) {
      const prev = visited.get(v.url);
      if (!prev || (prev.via === "search" && v.via === "fetch")) visited.set(v.url, v);
    }
  };

  // ---- 1. resolve -----------------------------------------------------------
  emit({ type: "stage", stage: "resolve", message: `Working out what "${query}" is and where its developer docs live` });
  const r1 = await research({
    system: RESOLVE_SYSTEM,
    user: resolveUser(query),
    maxSearches: 3,
    maxFetches: 1,
    maxTokens: 1500,
    onEvent: (e) => emit({ type: "activity", stage: "resolve", kind: e.kind === "text" ? "note" : e.kind, detail: e.detail })
  });
  track(r1.visited);
  stats.searches += r1.usage.searches;
  stats.fetches += r1.usage.fetches;
  stats.inputTokens += r1.usage.input;
  stats.outputTokens += r1.usage.output;

  let resolved: Resolved;
  try {
    resolved = extractJson<Resolved>(r1.text);
  } catch (e) {
    throw new Error(`Could not resolve "${query}": ${(e as Error).message}`);
  }
  resolved.website = cleanUrl(resolved.website);
  resolved.docsUrl = cleanUrl(resolved.docsUrl);
  resolved.developerPortalUrl = cleanUrl(resolved.developerPortalUrl);
  if (!resolved.name) resolved.name = query;
  emit({ type: "result", stage: "resolve", data: resolved });
  emit({
    type: "activity",
    stage: "resolve",
    kind: "note",
    detail: `Resolved to ${resolved.name}${resolved.website ? ` (${resolved.website})` : ""}. OAuth support: ${String(resolved.supportsOAuth ?? "unknown")}.${resolved.ambiguityNote ? " " + resolved.ambiguityNote : ""}`
  });

  // ---- 2. investigate (model) and 3. probe (deterministic) run in parallel ----
  emit({ type: "stage", stage: "investigate", message: `Reading ${resolved.name}'s docs on app registration, review and scopes` });
  emit({ type: "stage", stage: "probe", message: "Running live checks: discovery metadata, developer portal, Composio managed auth" });

  const investigateP = research({
    system: INVESTIGATE_SYSTEM,
    user: investigateUser(resolved),
    maxSearches: 8,
    maxFetches: 6,
    maxTokens: 7000,
    onEvent: (e) => emit({ type: "activity", stage: "investigate", kind: e.kind === "text" ? "note" : e.kind, detail: e.detail })
  });

  const probeP = (async () => {
    const results: ProbeResult[] = [];
    const meta = await probeOAuthMetadata(resolved.website);
    for (const m of meta) {
      results.push(m);
      emit({ type: "activity", stage: "probe", kind: "probe", detail: `${m.label}: ${m.outcome} (${m.url})` });
    }
    const portal = await probeDeveloperPortal(resolved.developerPortalUrl);
    if (portal) {
      results.push(portal);
      emit({ type: "activity", stage: "probe", kind: "probe", detail: `${portal.label}: ${portal.detail}` });
    }
    const composio = await probeComposio(resolved.name, resolved.website);
    emit({ type: "activity", stage: "probe", kind: "probe", detail: `Composio managed OAuth: ${composio.outcome}. ${composio.detail}` });
    return { results, composio };
  })();

  const [inv, probes] = await Promise.all([investigateP, probeP]);
  track(inv.visited);
  stats.searches += inv.usage.searches;
  stats.fetches += inv.usage.fetches;
  stats.inputTokens += inv.usage.input;
  stats.outputTokens += inv.usage.output;

  let memo: any;
  try {
    memo = extractJson(inv.text);
  } catch (e) {
    throw new Error(`Investigation produced no usable memo: ${(e as Error).message}`);
  }
  // Memo may list sources the model saw in search results; keep them as visited (via search).
  for (const s of memo?.sourcesSeen ?? []) {
    const u = cleanUrl(s?.url);
    if (u && !visited.has(u)) visited.set(u, { url: u, title: s.title, via: "search" });
  }
  emit({ type: "result", stage: "investigate", data: { findings: memo?.findings?.length ?? 0, unknowns: memo?.unknowns ?? [] } });
  emit({
    type: "activity",
    stage: "investigate",
    kind: "note",
    detail: `${memo?.findings?.length ?? 0} findings from ${visited.size} pages. ${memo?.unknowns?.length ? `${memo.unknowns.length} open question(s).` : ""}`
  });
  emit({ type: "result", stage: "probe", data: probes });

  // ---- 4. synthesize ---------------------------------------------------------
  emit({ type: "stage", stage: "synthesize", message: "Writing the guide: two clocks, owners, requirements, gotchas" });
  const slug = slugify(resolved.name || query) || slugify(query) || "app";
  const visitedList = [...visited.values()];
  const synthInput = synthesizeUser({
    resolved,
    memo,
    probes: probes.results,
    composio: probes.composio,
    visitedUrls: visitedList,
    now,
    slug
  });

  let draft: Guide | null = null;
  let lastErr = "";
  for (let attempt = 0; attempt < 2 && !draft; attempt++) {
    const text = await complete({
      system: SYNTHESIZE_SYSTEM,
      user: attempt === 0 ? synthInput : `${synthInput}\n\nYour previous output failed validation with:\n${lastErr}\nFix every issue and return the full JSON again.`,
      maxTokens: 9000
    });
    try {
      const json = extractJson<any>(text);
      // Normalise a few things the model gets wrong often, before strict parsing.
      json.schemaVersion = 1;
      json.slug = slug;
      json.generatedBy = "agent";
      json.generatedAt = json.generatedAt || now;
      json.lastVerifiedAt = json.lastVerifiedAt || now;
      json.verification = json.verification || { status: "unverified", checkedClaims: 0, corrected: [], unverifiable: [] };
      json.openQuestions = json.openQuestions || [];
      if (json.app) {
        json.app.website = cleanUrl(json.app.website) ?? resolved.website;
        json.app.docsUrl = cleanUrl(json.app.docsUrl) ?? resolved.docsUrl;
        json.app.developerPortalUrl = cleanUrl(json.app.developerPortalUrl) ?? resolved.developerPortalUrl;
      }
      // Drop sources with URLs we never saw, unless they are probes.
      const seen = new Set(visitedList.map((v) => v.url));
      const probeUrls = new Set(probes.results.map((p) => p.url));
      const kept = (json.sources || []).filter((s: any) => {
        const u = cleanUrl(s?.url);
        if (!u) return false;
        s.url = u;
        if (s.type === "probe") return true; // probes are ours; keep them even if the model mangled the URL
        return seen.has(u) || seen.has(u.replace(/\/$/, "")) || seen.has(u + "/") || probeUrls.has(u);
      });
      const droppedIds = new Set<string>((json.sources || []).filter((s: any) => !kept.includes(s)).map((s: any) => String(s.id)));
      json.sources = kept;
      relevelEvidence(json, droppedIds);
      draft = parseGuide(json);
    } catch (e) {
      lastErr = (e as Error).message;
      emit({ type: "activity", stage: "synthesize", kind: "note", detail: `Draft failed validation, retrying: ${lastErr.split("\n")[0]}` });
    }
  }
  if (!draft) throw new Error(`Synthesis failed validation twice: ${lastErr}`);
  emit({ type: "activity", stage: "synthesize", kind: "note", detail: `Draft ready: difficulty ${draft.summary.difficulty}/5, ${draft.paths.dev.length} dev steps, ${draft.paths.production.length} production steps, ${draft.sources.length} sources.` });

  // ---- 5. verify -------------------------------------------------------------
  emit({ type: "stage", stage: "verify", message: "Auditing every claim against the memo and visited pages; downgrading anything unsupported" });
  let final: Guide = draft;
  let auditLog: string[] = [];
  try {
    const text = await complete({
      system: VERIFY_SYSTEM,
      user: verifyUser({ guide: draft, memo, visitedUrls: visitedList.map((v) => v.url) }),
      maxTokens: 9000
    });
    const out = extractJson<{ guide: any; auditLog?: string[] }>(text);
    out.guide.schemaVersion = 1;
    out.guide.slug = slug;
    out.guide.generatedBy = "agent";
    out.guide.generatedAt = draft.generatedAt;
    out.guide.lastVerifiedAt = now;
    final = parseGuide(out.guide);
    auditLog = out.auditLog ?? [];
    emit({
      type: "activity",
      stage: "verify",
      kind: "note",
      detail: `Checked ${final.verification.checkedClaims} claims. Corrected ${final.verification.corrected.length}, left ${final.verification.unverifiable.length} as inferred.`
    });
  } catch (e) {
    // Verification is additive; if it fails we ship the draft but say so.
    final = {
      ...draft,
      verification: {
        status: "unverified",
        checkedClaims: 0,
        corrected: [],
        unverifiable: [],
        notes: `Automatic verification pass failed (${(e as Error).message.split("\n")[0]}). Treat documented claims with extra care.`
      }
    };
    emit({ type: "activity", stage: "verify", kind: "note", detail: "Verification pass failed; shipping the unverified draft with a warning." });
  }

  emit({ type: "stage", stage: "done", message: "Guide ready" });
  emit({ type: "done", guide: final, auditLog, stats });
  return { guide: final, auditLog };
}

/** When sources are dropped, any evidence referencing them loses the reference and, if left with none, becomes inferred. */
function relevelEvidence(guide: any, droppedIds: Set<string>) {
  const fix = (e: any) => {
    if (!e || typeof e !== "object") return;
    e.sourceIds = (e.sourceIds || []).filter((id: string) => !droppedIds.has(id));
    if (e.sourceIds.length === 0 && e.level !== "inferred" && e.level !== "tested") {
      e.level = "inferred";
      e.note = [e.note, "source could not be confirmed by the pipeline"].filter(Boolean).join("; ");
    }
  };
  for (const b of guide?.summary?.blockers ?? []) fix(b.evidence);
  for (const p of guide?.prerequisites ?? []) fix(p.evidence);
  for (const s of guide?.paths?.dev ?? []) fix(s.evidence);
  for (const s of guide?.paths?.production ?? []) fix(s.evidence);
  for (const r of guide?.requirements ?? []) fix(r.evidence);
  for (const g of guide?.gotchas ?? []) fix(g.evidence);
  for (const w of guide?.whenStuck ?? []) fix(w.evidence);
}
