import Link from "next/link";
import type { Guide } from "@/lib/schema";
import { formatDuration } from "@/lib/format";
import { DifficultyMark } from "./Badges";

export function LibraryGrid({ guides, emptyText }: { guides: Guide[]; emptyText?: string }) {
  if (guides.length === 0) return <p className="text-sm text-inkSoft">{emptyText ?? "Nothing here yet."}</p>;
  return (
    <ul className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {guides.map((g) => {
        const hard = g.summary.blockers.filter((b) => b.severity === "hard").length;
        const demo = /^(DEMO|MOCK) MODE/.test(g.verification.notes ?? "");
        return (
          <li key={g.slug}>
            <Link href={`/guide/${g.slug}`} className="surface surface-hover group block h-full p-5 no-underline">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-medium tracking-tight text-ink">{g.app.name}</h3>
                <DifficultyMark level={g.summary.difficulty} compact />
              </div>
              <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-inkSoft">{g.summary.difficultyReason}</p>
              <dl className="mt-4 grid grid-cols-2 gap-2">
                <div className="panel px-3 py-2">
                  <dt className="eyebrow flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-ok" /> Dev-ready
                  </dt>
                  <dd className="mt-0.5 text-sm font-medium text-ink">{formatDuration(g.summary.timeToDevReady)}</dd>
                </div>
                <div className="panel px-3 py-2">
                  <dt className="eyebrow flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand" /> Production
                  </dt>
                  <dd className="mt-0.5 text-sm font-medium text-ink">{formatDuration(g.summary.timeToProduction)}</dd>
                </div>
              </dl>
              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                {hard > 0 && (
                  <span className="pill border-bad/20 bg-badSoft text-bad">
                    {hard} hard blocker{hard === 1 ? "" : "s"}
                  </span>
                )}
                {g.oauth.composioManaged === "yes" && <span className="pill border-ok/20 bg-okSoft text-ok">Composio-managed</span>}
                {!g.oauth.supportsOAuth && <span className="pill border-ink/10 bg-panel text-inkSoft">No OAuth</span>}
                <span className="pill border-ink/10 bg-panel text-inkSoft">{g.generatedBy === "curated" ? "Curated" : demo ? "Demo" : "Generated"}</span>
                <span className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-full border border-ink/10 text-inkSoft transition-all group-hover:border-ink group-hover:bg-ink group-hover:text-white">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M7 17 17 7M9 7h8v8" />
                  </svg>
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
