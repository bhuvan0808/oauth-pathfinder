/**
 * CLI: generate a guide and write it to data/candidates/<slug>.json for human review.
 *   npx tsx scripts/generate.ts "Pipedrive"
 *   npx tsx scripts/generate.ts https://cal.com --promote   (writes straight to data/guides, marks generatedBy "curated" only after you edit it)
 *
 * This is how the 100-app library would be built: generate in batch, review the diff, promote.
 */
import fs from "node:fs";
import path from "node:path";
import { generateGuide } from "../lib/agent/pipeline";

async function main() {
  const args = process.argv.slice(2);
  const promote = args.includes("--promote");
  const query = args.filter((a) => !a.startsWith("--")).join(" ").trim();
  if (!query) {
    console.error('Usage: npx tsx scripts/generate.ts "<app name or url>" [--promote]');
    process.exit(1);
  }
  const t0 = Date.now();
  const { guide, auditLog } = await generateGuide(query, (e) => {
    if (e.type === "stage") console.log(`\n== ${e.stage}: ${e.message}`);
    else if (e.type === "activity") console.log(`   [${e.kind}] ${e.detail}`);
    else if (e.type === "error") console.error(`!! ${e.message}`);
  });
  const dir = path.join(process.cwd(), "data", promote ? "guides" : "candidates");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${guide.slug}.json`);
  fs.writeFileSync(file, JSON.stringify(guide, null, 2));
  fs.writeFileSync(file.replace(/\.json$/, ".audit.txt"), auditLog.join("\n"));
  console.log(`\nWrote ${file} in ${Math.round((Date.now() - t0) / 1000)}s`);
  console.log(`Difficulty ${guide.summary.difficulty}/5. Dev ${guide.summary.timeToDevReady.min}-${guide.summary.timeToDevReady.max} ${guide.summary.timeToDevReady.unit}; prod ${guide.summary.timeToProduction.min}-${guide.summary.timeToProduction.max} ${guide.summary.timeToProduction.unit}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
