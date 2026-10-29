"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Activity = { stage: string; kind: string; detail: string; t: number };
type Stage = { stage: string; message: string; t: number };

const STAGE_ORDER = ["resolve", "investigate", "probe", "synthesize", "verify", "done"];
const STAGE_LABEL: Record<string, string> = {
  resolve: "Identify the app",
  investigate: "Read the docs",
  probe: "Live checks",
  synthesize: "Write the guide",
  verify: "Audit every claim",
  done: "Ready"
};

const KIND_STYLE: Record<string, string> = {
  search: "text-brand",
  fetch: "text-lime",
  probe: "text-[#5ee39a]",
  note: "text-white/60"
};
const KIND_LABEL: Record<string, string> = { search: "search", fetch: "read", probe: "probe", note: "note" };

export function ProgressLog({ query, force }: { query: string; force?: boolean }) {
  const router = useRouter();
  const [stages, setStages] = useState<Stage[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const started = useRef(Date.now());
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.round((Date.now() - started.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [activity.length, error, slug]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ query, force })
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || `Request failed (${res.status})`);
        }
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("application/json")) {
          const j = await res.json();
          if (j.cached && j.slug) {
            router.replace(`/guide/${j.slug}`);
            return;
          }
          throw new Error("Unexpected response");
        }
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        while (!cancelled) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const parts = buf.split("\n\n");
          buf = parts.pop() || "";
          for (const part of parts) {
            const line = part.split("\n").find((l) => l.startsWith("data: "));
            if (!line) continue;
            const e = JSON.parse(line.slice(6));
            const t = Date.now() - started.current;
            if (e.type === "stage") setStages((s) => [...s, { stage: e.stage, message: e.message, t }]);
            else if (e.type === "activity") setActivity((a) => [...a, { stage: e.stage, kind: e.kind, detail: e.detail, t }]);
            else if (e.type === "done") {
              setSlug(e.guide.slug);
              setStats(e.stats);
            } else if (e.type === "error") setError(e.message);
          }
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, force]);

  useEffect(() => {
    if (slug) {
      const t = setTimeout(() => router.push(`/guide/${slug}`), 1100);
      return () => clearTimeout(t);
    }
  }, [slug, router]);

  const current = stages[stages.length - 1]?.stage;
  const reached = new Set(stages.map((s) => s.stage));
  const running = !slug && !error;
  // investigate and probe run in parallel: while probe is current, investigate is still active.
  const isActive = (st: string) => running && (current === st || (current === "probe" && st === "investigate"));

  return (
    <div className="grid gap-5 lg:grid-cols-[19rem_1fr]">
      <aside className="surface fade-up min-w-0 self-start p-5">
        <p className="eyebrow">{running ? "Investigating" : error ? "Stopped" : "Done"}</p>
        <h2 className={`mt-1 truncate text-lg font-medium tracking-tight ${running ? "shimmer" : "text-ink"}`}>{query}</h2>
        <p className="mt-1 mono-xs text-inkSoft">{elapsed}s elapsed · usually 1-3 minutes live</p>
        <ol className="relative mt-5 space-y-4">
          <span className="absolute left-[5px] top-2 bottom-2 w-px bg-ink/10" aria-hidden />
          {STAGE_ORDER.map((st) => {
            const finished = (reached.has(st) && !isActive(st) && current !== st) || (slug && st !== "done") || (slug && st === "done");
            const active = isActive(st) || (running && current === st);
            const pending = !finished && !active;
            return (
              <li key={st} className="relative flex items-start gap-3 pl-5 text-sm">
                <span className="absolute left-0 top-1.5 flex h-[11px] w-[11px] items-center justify-center" aria-hidden>
                  {active && <span className="absolute inline-flex h-full w-full rounded-full bg-brand/60 animate-ping" />}
                  <span
                    className={`relative inline-block h-[11px] w-[11px] rounded-full border-2 border-fog ${
                      finished ? "bg-ok" : active ? "bg-brand animate-pulse-dot" : "bg-line"
                    }`}
                  />
                </span>
                <div className="min-w-0">
                  <div className={pending ? "text-inkSoft" : "font-medium text-ink"}>{STAGE_LABEL[st]}</div>
                  {stages.find((s) => s.stage === st)?.message && st !== "done" && (
                    <div className="mt-0.5 text-xs leading-relaxed text-inkSoft">{stages.find((s) => s.stage === st)?.message}</div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
        {stats && (
          <p className="panel mt-5 px-3 py-2 mono-xs text-inkSoft">
            {stats.searches} searches · {stats.fetches} pages read · {Math.round((stats.inputTokens + stats.outputTokens) / 1000)}k tokens
          </p>
        )}
      </aside>

      <section className="terminal fade-up min-w-0 overflow-hidden" style={{ ["--d" as string]: "80ms" }}>
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
          <div className="flex items-center gap-1.5" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          </div>
          <span className="mono-xs text-white/50">agent · live log</span>
          <span className={`mono-xs ${running ? "text-lime" : error ? "text-[#ff7b72]" : "text-[#5ee39a]"}`}>{running ? "running" : error ? "error" : "done"}</span>
        </div>
        <div ref={logRef} className="scrollbar-thin h-[28rem] overflow-y-auto px-4 py-3 font-mono text-[13px] leading-6">
          {activity.length === 0 && !error && (
            <p className="text-white/50">
              <span className="text-lime">$</span> investigate &quot;{query}&quot;
              <span className="cursor" />
            </p>
          )}
          <ul className="space-y-0.5">
            {activity.map((a, i) => (
              <li key={i} className="flex gap-3 animate-fade-up">
                <span className="w-10 shrink-0 text-right text-white/35 tabular-nums">{(a.t / 1000).toFixed(0)}s</span>
                <span className={`w-12 shrink-0 ${KIND_STYLE[a.kind] ?? "text-white/60"}`}>{KIND_LABEL[a.kind] ?? a.kind}</span>
                <span className="min-w-0 text-white/90 [overflow-wrap:anywhere]">{a.detail}</span>
              </li>
            ))}
          </ul>
          {running && activity.length > 0 && (
            <p className="mt-1 pl-[6.25rem] text-white/50">
              <span className="cursor" />
            </p>
          )}
          {error && (
            <div className="mt-3 rounded-xl border border-[#ff7b72]/40 bg-[#ff7b72]/10 p-3 text-[#ffb3ad]">
              <div className="font-medium">Generation stopped</div>
              <div className="mt-1">{error}</div>
              <div className="mt-2 text-sm">
                <Link href="/" className="underline">
                  Back to the library
                </Link>{" "}
                or try a more specific name (the website URL works best).
              </div>
            </div>
          )}
          {slug && (
            <div className="mt-3 animate-fade-up rounded-xl border border-lime/40 bg-lime/10 p-3 text-lime">
              <span className="text-lime">✓</span> Guide ready. Opening{" "}
              <Link href={`/guide/${slug}`} className="underline">
                /guide/{slug}
              </Link>
              …
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
