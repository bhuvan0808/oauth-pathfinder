import { NextRequest } from "next/server";
import { generateGuide, type PipelineEvent } from "@/lib/agent/pipeline";
import { getGuide, saveGeneratedGuide } from "@/lib/store";
import { slugify } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // Vercel Pro allows up to 300s for Node functions; Hobby is 60s (see README)

// ---- naive in-memory rate limit (per instance). Good enough for a demo; swap for Upstash Ratelimit in prod.
const hits = new Map<string, number[]>();
function allowed(ip: string): boolean {
  const limit = Number(process.env.GENERATE_RATE_LIMIT || 6);
  const now = Date.now();
  const windowStart = now - 60 * 60 * 1000;
  const arr = (hits.get(ip) || []).filter((t) => t > windowStart);
  if (arr.length >= limit) return false;
  arr.push(now);
  hits.set(ip, arr);
  return true;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const query = String(body?.query || "").trim();
  const force = Boolean(body?.force);
  if (!query || query.length > 200) {
    return new Response(JSON.stringify({ error: "Give me an app name or website (1-200 chars)." }), { status: 400 });
  }
  const requiredKey = process.env.GENERATE_KEY;
  if (requiredKey) {
    const provided = req.headers.get("x-generate-key") || req.nextUrl.searchParams.get("key");
    if (provided !== requiredKey) return new Response(JSON.stringify({ error: "Generation is key-protected on this deployment." }), { status: 401 });
  }
  // Serve cached guides instantly unless forced. Cache hits are free: no rate limit, no API key needed.
  if (!force) {
    const existing = await getGuide(slugify(query));
    if (existing) {
      return new Response(JSON.stringify({ cached: true, slug: existing.guide.slug, tier: existing.tier }), {
        headers: { "content-type": "application/json" }
      });
    }
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!allowed(ip)) {
    return new Response(JSON.stringify({ error: "Rate limit: too many generations from this network this hour. Try the library, or wait." }), { status: 429 });
  }
  if (!process.env.ANTHROPIC_API_KEY && process.env.MOCK_AGENT !== "1") {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured on the server." }), { status: 500 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: PipelineEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
      };
      // keep-alive comments so proxies don't drop the connection during long model calls
      const ka = setInterval(() => controller.enqueue(encoder.encode(`: keep-alive\n\n`)), 15000);
      try {
        const { guide } = await generateGuide(query, send);
        await saveGeneratedGuide(guide);
      } catch (e) {
        send({ type: "error", stage: "error", message: (e as Error).message });
      } finally {
        clearInterval(ka);
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no"
    }
  });
}
