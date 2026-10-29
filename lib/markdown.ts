import type { Evidence, Guide, Step } from "./schema";
import { DIFFICULTY_LABEL, EVIDENCE_LABEL, OWNER_LABEL, formatDate, formatDuration } from "./format";

function ev(e: Evidence, guide: Guide): string {
  const refs = e.sourceIds
    .map((id) => guide.sources.findIndex((s) => s.id === id) + 1)
    .filter((n) => n > 0)
    .map((n) => `[${n}]`)
    .join("");
  const note = e.note ? ` — ${e.note}` : "";
  return `_${EVIDENCE_LABEL[e.level]}${refs ? " " + refs : ""}${note}_`;
}

function step(s: Step, i: number, guide: Guide): string {
  const lines = [`${i + 1}. **${s.title}** · ${OWNER_LABEL[s.owner]} · ${s.effort}`];
  lines.push(`   ${s.detail}`);
  if (s.consoleLocation) lines.push(`   Where: ${s.consoleLocation}`);
  if (s.values?.length) {
    lines.push("   Values:");
    for (const v of s.values) lines.push(`   - ${v.field}: \`${v.value}\``);
  }
  lines.push(`   ${ev(s.evidence, guide)}`);
  return lines.join("\n");
}

export function guideToMarkdown(guide: Guide, shareUrl?: string): string {
  const s = guide.summary;
  const out: string[] = [];
  out.push(`# ${guide.app.name}: OAuth app readiness guide`);
  if (shareUrl) out.push(`Live version: ${shareUrl}`);
  out.push(
    `Generated ${formatDate(guide.generatedAt)} (${guide.generatedBy}) · last verified ${formatDate(guide.lastVerifiedAt)} · verification: ${guide.verification.status}`
  );
  out.push("");
  out.push(`> ${s.tldr}`);
  out.push("");
  out.push("## At a glance");
  out.push("");
  out.push(`| | |`);
  out.push(`|---|---|`);
  out.push(`| Difficulty | **${s.difficulty}/5 ${DIFFICULTY_LABEL[s.difficulty]}** — ${s.difficultyReason} |`);
  out.push(`| Time to dev-ready | ${formatDuration(s.timeToDevReady)} (${s.timeToDevReady.confidence} confidence)${s.timeToDevReady.note ? " — " + s.timeToDevReady.note : ""} |`);
  out.push(`| Time to production | ${formatDuration(s.timeToProduction)} (${s.timeToProduction.confidence} confidence)${s.timeToProduction.note ? " — " + s.timeToProduction.note : ""} |`);
  out.push(`| Cost | ${s.cost} |`);
  out.push(`| OAuth flows | ${guide.oauth.flows.join(", ") || "n/a"} |`);
  out.push(`| Composio-managed OAuth | ${guide.oauth.composioManaged}${guide.oauth.composioToolkitSlug ? ` (toolkit: ${guide.oauth.composioToolkitSlug})` : ""} |`);
  out.push(`| Dynamic client registration | ${guide.oauth.dynamicClientRegistration} |`);
  out.push("");
  if (s.blockers.length) {
    out.push("## Blockers");
    out.push("");
    for (const b of s.blockers) out.push(`- **${b.severity === "hard" ? "Hard" : "Soft"}:** ${b.text} ${ev(b.evidence, guide)}`);
    out.push("");
  }
  if (guide.prerequisites.length) {
    out.push("## Before you start");
    out.push("");
    for (const p of guide.prerequisites) out.push(`- ${p.text} · ${OWNER_LABEL[p.owner]} ${ev(p.evidence, guide)}`);
    out.push("");
  }
  out.push("## Path 1: dev-ready (get a token for yourself / test users)");
  out.push("");
  guide.paths.dev.forEach((st, i) => out.push(step(st, i, guide), ""));
  out.push("## Path 2: production (any user can connect)");
  out.push("");
  if (guide.paths.production.length === 0) out.push("_No extra steps: the dev path is already production._", "");
  guide.paths.production.forEach((st, i) => out.push(step(st, i, guide), ""));
  if (guide.requirements.length) {
    out.push("## Requirements checklist");
    out.push("");
    for (const r of guide.requirements) out.push(`- [ ] ${r.item}${r.required ? "" : " (optional)"}${r.notes ? " — " + r.notes : ""} ${ev(r.evidence, guide)}`);
    out.push("");
  }
  if (guide.gotchas.length) {
    out.push("## Gotchas");
    out.push("");
    for (const g of guide.gotchas) out.push(`- **${g.title}.** ${g.detail} ${ev(g.evidence, guide)}`);
    out.push("");
  }
  if (guide.whenStuck.length) {
    out.push("## When you're stuck");
    out.push("");
    for (const w of guide.whenStuck) out.push(`- **${w.situation}:** ${w.action}${w.link ? ` (${w.link})` : ""} ${ev(w.evidence, guide)}`);
    out.push("");
  }
  if (guide.openQuestions.length) {
    out.push("## Still uncertain");
    out.push("");
    for (const q of guide.openQuestions) out.push(`- ${q}`);
    out.push("");
  }
  out.push("## Verification");
  out.push("");
  out.push(`Status: ${guide.verification.status}. Claims checked: ${guide.verification.checkedClaims}.`);
  if (guide.verification.corrected.length) {
    out.push("Corrected during verification:");
    for (const c of guide.verification.corrected) out.push(`- ${c}`);
  }
  if (guide.verification.unverifiable.length) {
    out.push("Could not verify:");
    for (const c of guide.verification.unverifiable) out.push(`- ${c}`);
  }
  if (guide.verification.notes) out.push(guide.verification.notes);
  out.push("");
  out.push("## Sources");
  out.push("");
  guide.sources.forEach((src, i) => out.push(`${i + 1}. [${src.title}](${src.url}) (${src.type})`));
  out.push("");
  out.push("_Evidence levels: Tested = actually attempted; Documented = official docs; Reported = community/vendor posts; Inferred = agent's best reading. Provider policies change; re-check before you commit a launch date._");
  return out.join("\n");
}
