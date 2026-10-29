import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getGuide } from "@/lib/store";
import { guideToMarkdown } from "@/lib/markdown";
import { GuideView } from "@/components/GuideView";
import { enrichWithComposio } from "@/lib/enrich";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const found = await getGuide(params.slug);
  if (!found) return { title: "Guide not found" };
  const g = found.guide;
  return {
    title: `${g.app.name} OAuth app: ${g.summary.difficulty}/5, production in ${g.summary.timeToProduction.min}-${g.summary.timeToProduction.max} ${g.summary.timeToProduction.unit}`,
    description: g.summary.tldr
  };
}

export default async function GuidePage({ params }: { params: { slug: string } }) {
  const found = await getGuide(params.slug);
  if (!found) notFound();
  const h = headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const shareUrl = `${proto}://${host}/guide/${found.guide.slug}`;
  const guide = await enrichWithComposio(found.guide);
  const markdown = guideToMarkdown(guide, shareUrl);
  return <GuideView guide={guide} tier={found.tier} markdown={markdown} shareUrl={shareUrl} />;
}
