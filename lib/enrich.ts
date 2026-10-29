import type { Guide } from "./schema";
import { probeComposio } from "./agent/probe";

/**
 * Curated guides ship with composioManaged = "unknown" so the file never asserts something it did not check.
 * At render time, if COMPOSIO_API_KEY is configured, ask Composio and fill it in (3s budget, never blocks the page).
 */
export async function enrichWithComposio(guide: Guide): Promise<Guide> {
  if (guide.oauth.composioManaged !== "unknown" || !process.env.COMPOSIO_API_KEY) return guide;
  try {
    const result = await Promise.race([
      probeComposio(guide.oauth.composioToolkitSlug || guide.app.name, guide.app.website),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000))
    ]);
    if (!result || result.outcome === "unknown") return guide;
    return {
      ...guide,
      oauth: { ...guide.oauth, composioManaged: result.outcome, composioToolkitSlug: result.slug || guide.oauth.composioToolkitSlug, notes: [guide.oauth.notes, result.detail].filter(Boolean).join(" ") }
    };
  } catch {
    return guide;
  }
}
