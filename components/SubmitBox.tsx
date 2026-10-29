"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SubmitBox({ examples }: { examples: string[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const go = (value: string) => {
    const v = value.trim();
    if (!v) return;
    setBusy(true);
    router.push(`/generate?q=${encodeURIComponent(v)}`);
  };
  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go(q);
        }}
        className="group flex items-center gap-2 rounded-full border border-ink/10 bg-card p-1.5 pl-4 shadow-card transition-shadow focus-within:border-brand focus-within:shadow-glow"
      >
        <label className="sr-only" htmlFor="app-query">
          App name or website
        </label>
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-inkSoft" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          id="app-query"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="App name or website, e.g. Pipedrive or https://cal.com"
          className="min-w-0 flex-1 bg-transparent py-2 text-base text-ink outline-none placeholder:text-inkSoft/70"
          autoComplete="off"
          maxLength={200}
        />
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-lime animate-pulse-dot" /> Opening
            </span>
          ) : (
            <>
              <span className="hidden sm:inline">Investigate</span>
              <span className="sm:hidden">Go</span>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </>
          )}
        </button>
      </form>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-inkSoft">
        <span className="mono-xs">Try</span>
        {examples.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => go(ex)}
            className="rounded-full border border-ink/10 bg-card px-3 py-1 text-[13px] text-ink transition-colors hover:border-ink/30 hover:bg-panel"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
