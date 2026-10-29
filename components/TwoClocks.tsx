import type { Duration } from "@/lib/schema";
import { CLOCK_TICKS, clockPosition, durationToMinutes, formatDuration } from "@/lib/format";

/**
 * Two ranges on one log-scale axis. Dev-ready is usually a sliver on the left; production is where the
 * story is. The gap between them is the thing a developer needs to see before promising a launch date.
 */
export function TwoClocks({ dev, prod }: { dev: Duration; prod: Duration }) {
  const range = (d: Duration) => {
    const a = clockPosition(durationToMinutes(d, "min"));
    const b = clockPosition(durationToMinutes(d, "max"));
    const left = Math.min(a, b) * 100;
    const width = Math.max(2, (Math.max(a, b) - Math.min(a, b)) * 100);
    return { left: `${left}%`, width: `${width}%` };
  };
  const devR = range(dev);
  const prodR = range(prod);
  const conf = (d: Duration) => (d.confidence === "high" ? "opacity-100" : d.confidence === "medium" ? "opacity-80" : "opacity-60");

  return (
    <div>
      <div className="relative h-[4.5rem]">
        {/* axis */}
        <div className="absolute left-0 right-0 top-8 h-px bg-ink/15" />
        {CLOCK_TICKS.map((t) => (
          <div key={t.label} className="absolute top-6" style={{ left: `${clockPosition(t.minutes) * 100}%` }}>
            <div className="h-2 w-px -translate-x-1/2 bg-ink/20" />
            <div className="mt-5 -translate-x-1/2 whitespace-nowrap mono-xs text-[10px] text-inkSoft">{t.label}</div>
          </div>
        ))}
        {/* dev-ready */}
        <div className={`grow-x absolute top-2 h-3 rounded-full bg-ok ${conf(dev)}`} style={{ ...devR, ["--d" as string]: "150ms" }} title={`Dev-ready: ${formatDuration(dev)}`} />
        {/* production */}
        <div
          className={`grow-x absolute top-[2.6rem] h-3 rounded-full bg-gradient-to-r from-brand to-signal ${conf(prod)}`}
          style={{ ...prodR, ["--d" as string]: "350ms" }}
          title={`Production: ${formatDuration(prod)}`}
        />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3">
        <div className="panel p-3">
          <dt className="flex items-center gap-2 eyebrow">
            <span className="inline-block h-2 w-2 rounded-full bg-ok" aria-hidden /> Dev-ready
          </dt>
          <dd className="mt-1 text-lg font-medium tracking-tight text-ink">{formatDuration(dev)}</dd>
          <dd className="text-xs text-inkSoft">
            {dev.confidence} confidence{dev.note ? `. ${dev.note}` : ""}
          </dd>
        </div>
        <div className="panel p-3">
          <dt className="flex items-center gap-2 eyebrow">
            <span className="inline-block h-2 w-2 rounded-full bg-brand" aria-hidden /> Production
          </dt>
          <dd className="mt-1 text-lg font-medium tracking-tight text-ink">{formatDuration(prod)}</dd>
          <dd className="text-xs text-inkSoft">
            {prod.confidence} confidence{prod.note ? `. ${prod.note}` : ""}
          </dd>
        </div>
      </dl>
    </div>
  );
}
