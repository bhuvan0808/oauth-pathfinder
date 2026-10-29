"use client";

import { useState } from "react";

export function CopyButton({ text, label, doneLabel = "Copied" }: { text: string; label: string; doneLabel?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        } catch {
          // Clipboard can be blocked in some embedded contexts; fall back to a prompt.
          window.prompt("Copy this:", text);
        }
      }}
      className={`btn btn-secondary btn-sm ${done ? "!border-ok/40 !bg-okSoft !text-ok" : ""}`}
    >
      {done ? (
        <>
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m5 12 5 5L20 7" />
          </svg>
          {doneLabel}
        </>
      ) : (
        <>
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="9" y="9" width="11" height="11" rx="2" />
            <path d="M5 15V5a2 2 0 0 1 2-2h10" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}
