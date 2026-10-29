/** Validate every curated guide against the schema and integrity rules. Run in CI and before commits. */
import fs from "node:fs";
import path from "node:path";
import { parseGuide } from "../lib/schema";

const dir = path.join(process.cwd(), "data", "guides");
let failed = 0;
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json")).sort()) {
  try {
    const g = parseGuide(JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));
    const steps = g.paths.dev.length + g.paths.production.length;
    console.log(`ok   ${f}  difficulty=${g.summary.difficulty} steps=${steps} sources=${g.sources.length} verification=${g.verification.status}`);
  } catch (e) {
    failed++;
    console.error(`FAIL ${f}\n${(e as Error).message}\n`);
  }
}
process.exit(failed ? 1 : 0);
