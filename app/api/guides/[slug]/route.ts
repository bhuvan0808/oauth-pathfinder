import { NextRequest } from "next/server";
import { getGuide } from "@/lib/store";
import { guideToMarkdown } from "@/lib/markdown";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const found = await getGuide(params.slug);
  if (!found) return new Response(JSON.stringify({ error: "No guide with that slug" }), { status: 404 });
  const format = req.nextUrl.searchParams.get("format");
  if (format === "md" || format === "markdown") {
    const origin = req.nextUrl.origin;
    return new Response(guideToMarkdown(found.guide, `${origin}/guide/${found.guide.slug}`), {
      headers: {
        "content-type": "text/markdown; charset=utf-8",
        "content-disposition": `inline; filename="${found.guide.slug}-oauth-guide.md"`
      }
    });
  }
  return new Response(JSON.stringify({ tier: found.tier, guide: found.guide }, null, 2), {
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}
