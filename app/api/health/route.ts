import { loadLibrary } from "@/lib/store";
import { DEMO_APPS } from "@/lib/agent/mock";
import pkg from "@/package.json";

export const dynamic = "force-dynamic";

/**
 * Operational and evaluator-facing status: which mode the deployment runs in, what is configured,
 * and which apps have demo fixtures. Never returns secret values.
 */
export async function GET() {
  const demo = process.env.MOCK_AGENT === "1";
  const body = {
    ok: true,
    name: pkg.name,
    version: pkg.version,
    time: new Date().toISOString(),
    mode: demo ? "demo" : process.env.ANTHROPIC_API_KEY ? "live" : "unconfigured",
    modeHelp: demo
      ? "Live generation runs on fixture responses; probes are real HTTP checks. Set ANTHROPIC_API_KEY and remove MOCK_AGENT for live research."
      : process.env.ANTHROPIC_API_KEY
        ? "Live research with Anthropic web_search and web_fetch."
        : "No ANTHROPIC_API_KEY and MOCK_AGENT is not set: /api/generate will refuse requests.",
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5",
    cache: process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN ? "upstash" : "memory",
    composioCheck: Boolean(process.env.COMPOSIO_API_KEY),
    generateKeyRequired: Boolean(process.env.GENERATE_KEY),
    rateLimitPerHourPerIp: Number(process.env.GENERATE_RATE_LIMIT || 6),
    curatedGuides: loadLibrary().map((g) => g.slug),
    demoFixtureApps: demo ? DEMO_APPS : [],
    endpoints: {
      guidesIndex: "/api/guides",
      guide: "/api/guides/{slug}",
      guideMarkdown: "/api/guides/{slug}?format=md",
      generate: "POST /api/generate {\"query\": \"<app name or url>\", \"force\"?: boolean} (text/event-stream)",
      health: "/api/health",
      llms: "/llms.txt"
    },
    docs: {
      repo: "https://github.com/bhuvan0808/oauth-pathfinder",
      readme: "https://github.com/bhuvan0808/oauth-pathfinder#readme",
      api: "https://github.com/bhuvan0808/oauth-pathfinder/blob/main/docs/API.md",
      architecture: "https://github.com/bhuvan0808/oauth-pathfinder/blob/main/docs/ARCHITECTURE.md"
    }
  };
  return new Response(JSON.stringify(body, null, 2), { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
}
