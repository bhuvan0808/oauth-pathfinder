import type { Evidence, Guide, Owner } from "@/lib/schema";
import { DIFFICULTY_LABEL, EVIDENCE_HINT, EVIDENCE_LABEL, OWNER_LABEL, difficultyTone } from "@/lib/format";

const EVIDENCE_DOT: Record<Evidence["level"], string> = {
  tested: "bg-ok",
  documented: "bg-signal",
  reported: "bg-warn",
  inferred: "bg-inkSoft/50"
};

/** Evidence badge with source refs as superscript links into the sources list. */
export function EvidenceBadge({ evidence, guide }: { evidence: Evidence; guide: Guide }) {
  const refs = evidence.sourceIds
    .map((id) => ({ id, n: guide.sources.findIndex((s) => s.id === id) + 1 }))
    .filter((r) => r.n > 0);
  return (
    <span
      className="inline-flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-0.5 mono-xs text-inkSoft"
      title={`${EVIDENCE_HINT[evidence.level]}${evidence.note ? "\n" + evidence.note : ""}`}
    >
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${EVIDENCE_DOT[evidence.level]}`} aria-hidden />
      <span className="uppercase tracking-wide">{EVIDENCE_LABEL[evidence.level]}</span>
      {refs.length > 0 && (
        <sup className="flex gap-0.5">
          {refs.map((r) => (
            <a key={r.id} href={`#src-${r.n}`} className="text-signal hover:underline">
              {r.n}
            </a>
          ))}
        </sup>
      )}
      {evidence.note && <span className="hidden font-sans normal-case tracking-normal text-inkSoft/80 sm:inline">· {evidence.note}</span>}
    </span>
  );
}

const OWNER_STYLE: Record<Owner, string> = {
  agent: "bg-lime text-ink border-lime",
  you: "bg-ink text-white border-ink",
  either: "bg-card text-inkSoft border-ink/15"
};
const OWNER_SHORT: Record<Owner, string> = { agent: "Agent", you: "You", either: "Either" };

export function OwnerPill({ owner, long = false }: { owner: Owner; long?: boolean }) {
  return (
    <span className={`pill ${OWNER_STYLE[owner]}`} title={OWNER_LABEL[owner]}>
      {long ? OWNER_LABEL[owner] : OWNER_SHORT[owner]}
    </span>
  );
}

const TONE_STYLE = {
  ok: "bg-okSoft text-ok border-ok/20",
  warn: "bg-warnSoft text-warn border-warn/20",
  bad: "bg-badSoft text-bad border-bad/20"
};

export function DifficultyMark({ level, compact = false, animate = false }: { level: number; compact?: boolean; animate?: boolean }) {
  const tone = difficultyTone(level);
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 ${TONE_STYLE[tone]} ${compact ? "text-xs" : "text-sm"}`}>
      <span className="flex gap-[3px]" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={`inline-block w-1.5 rounded-sm ${compact ? "h-2.5" : "h-3"} ${i <= level ? "bg-current" : "bg-current opacity-20"} ${animate && i <= level ? "animate-pop" : ""}`}
            style={animate ? { animationDelay: `${120 + i * 70}ms` } : undefined}
          />
        ))}
      </span>
      <span className="font-medium">
        {level}/5 {DIFFICULTY_LABEL[level]}
      </span>
    </span>
  );
}
