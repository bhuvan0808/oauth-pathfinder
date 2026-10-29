import type { Duration, EvidenceLevel, Owner } from "./schema";

export const DIFFICULTY_LABEL: Record<number, string> = {
  1: "Trivial",
  2: "Easy",
  3: "Moderate",
  4: "Hard",
  5: "Gated"
};

export const DIFFICULTY_HINT: Record<number, string> = {
  1: "Create the app and you're done. No review.",
  2: "A few settings and a URL or two. No review for most use.",
  3: "A distribution or review step, or tricky scopes.",
  4: "A verification process with real waiting.",
  5: "A paid tier, security assessment, business verification or partner program stands between you and production."
};

export function difficultyTone(d: number): "ok" | "warn" | "bad" {
  if (d <= 2) return "ok";
  if (d === 3) return "warn";
  return "bad";
}

export const EVIDENCE_LABEL: Record<EvidenceLevel, string> = {
  tested: "Tested",
  documented: "Documented",
  reported: "Reported",
  inferred: "Inferred"
};

export const EVIDENCE_HINT: Record<EvidenceLevel, string> = {
  tested: "Someone actually attempted this and recorded the result.",
  documented: "Stated in official provider documentation (linked).",
  reported: "From community posts, vendor blogs or forums. Typical for timing and cost.",
  inferred: "The agent's best reading of indirect evidence. Verify before relying on it."
};

export const OWNER_LABEL: Record<Owner, string> = {
  agent: "Agent can do this",
  you: "You must do this",
  either: "Either"
};

const UNIT_MINUTES: Record<Duration["unit"], number> = {
  minutes: 1,
  hours: 60,
  days: 60 * 24,
  weeks: 60 * 24 * 7,
  months: 60 * 24 * 30
};

export function durationToMinutes(d: Duration, which: "min" | "max" = "max"): number {
  return d[which] * UNIT_MINUTES[d.unit];
}

export function formatDuration(d: Duration): string {
  const unit = d.max === 1 && d.min === d.max ? d.unit.replace(/s$/, "") : d.unit;
  if (d.min === d.max) return `${d.min} ${unit}`;
  if (d.min === 0) return `up to ${d.max} ${d.unit}`;
  return `${d.min}–${d.max} ${d.unit}`;
}

/**
 * Position on a log scale from 10 minutes to 6 months, 0..1. Used by the two-clocks bar.
 */
export function clockPosition(minutes: number): number {
  const lo = Math.log(10);
  const hi = Math.log(60 * 24 * 30 * 6);
  const v = Math.log(Math.max(10, Math.min(minutes, 60 * 24 * 30 * 6)));
  return (v - lo) / (hi - lo);
}

export const CLOCK_TICKS: { label: string; minutes: number }[] = [
  { label: "10 min", minutes: 10 },
  { label: "1 hr", minutes: 60 },
  { label: "1 day", minutes: 60 * 24 },
  { label: "1 wk", minutes: 60 * 24 * 7 },
  { label: "1 mo", minutes: 60 * 24 * 30 },
  { label: "6 mo", minutes: 60 * 24 * 30 * 6 }
];

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\.(com|io|dev|app|ai|co|org|net)(\/.*)?$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}
