import { NextRequest } from "next/server";
import { loadLibrary, listGeneratedGuides } from "@/lib/store";
import { DIFFICULTY_LABEL, formatDuration } from "@/lib/format";
import type { Guide } from "@/lib/schema";

export const dynamic = "force-dynamic";

/**
 * Index of every guide this deployment can serve: curated library plus live-generated guides in the cache.
 * Each entry carries the summary fields a developer or an agent needs to decide which guide to open.
 */
export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const item = (g: Guide, tier: "library" | "live") => ({
    slug: g.slug,
    name: g.app.name,
    tier,
    generatedBy: g.generatedBy,
    demo: /^(DEMO|MOCK) MODE/.test(g.verification.notes ?? ""),
    difficulty: g.summary.difficulty,
    difficultyLabel: DIFFICULTY_LABEL[g.summary.difficulty],
    timeToDevReady: formatDuration(g.summary.timeToDevReady),
    timeToProduction: formatDuration(g.summary.timeToProduction),
    supportsOAuth: g.oauth.supportsOAuth,
    hardBlockers: g.summary.blockers.filter((b) => b.severity === "hard").length,
    verification: g.verification.status,
    lastVerifiedAt: g.lastVerifiedAt,
    tldr: g.summary.tldr,
    links: {
      page: `${origin}/guide/${g.slug}`,
      json: `${origin}/api/guides/${g.slug}`,
      markdown: `${origin}/api/guides/${g.slug}?format=md`
    }
  });
  const library = loadLibrary()
    .sort((a, b) => a.summary.difficulty - b.summary.difficulty || a.app.name.localeCompare(b.app.name))
    .map((g) => item(g, "library"));
  const live = (await listGeneratedGuides()).map((g) => item(g, "live"));
  const body = {
    mode: process.env.MOCK_AGENT === "1" ? "demo" : process.env.ANTHROPIC_API_KEY ? "live" : "unconfigured",
    count: library.length + live.length,
    generate: `POST ${origin}/api/generate with {"query": "<app name or url>"} streams a new guide as text/event-stream`,
    guides: [...library, ...live]
  };
  return new Response(JSON.stringify(body, null, 2), { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
}
