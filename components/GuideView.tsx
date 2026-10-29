import Link from "next/link";
import type { Guide, Step } from "@/lib/schema";
import { DIFFICULTY_HINT, formatDate } from "@/lib/format";
import { DifficultyMark, EvidenceBadge, OwnerPill } from "./Badges";
import { TwoClocks } from "./TwoClocks";
import { CopyButton } from "./CopyButton";

function SectionHead({ eyebrow, title, aside }: { eyebrow: string; title: string; aside?: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="mt-1 text-lg font-medium tracking-tight text-ink">{title}</h2>
      </div>
      {aside && <span className="text-xs text-inkSoft">{aside}</span>}
    </div>
  );
}

function StepItem({ step, index, guide }: { step: Step; index: number; guide: Guide }) {
  return (
    <li className="step-line relative pl-11 py-4">
      <span className="absolute left-0 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-ink mono-xs text-white">{index + 1}</span>
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="font-medium text-ink">{step.title}</h4>
        <OwnerPill owner={step.owner} />
        <span className="mono-xs text-inkSoft">{step.effort}</span>
      </div>
      <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-ink/85">{step.detail}</p>
      {step.consoleLocation && (
        <p className="mt-2 mono-xs text-inkSoft">
          <span className="text-inkSoft/70">where</span> <span className="text-ink [overflow-wrap:anywhere]">{step.consoleLocation}</span>
        </p>
      )}
      {step.values && step.values.length > 0 && (
        <dl className="panel mt-2.5 grid gap-1 px-3 py-2.5 text-xs sm:grid-cols-[max-content_1fr] sm:gap-x-4">
          {step.values.map((v, i) => (
            <div key={i} className="contents">
              <dt className="mono-xs text-inkSoft">{v.field}</dt>
              <dd className="font-mono text-[12px] text-ink [overflow-wrap:anywhere]">{v.value}</dd>
            </div>
          ))}
        </dl>
      )}
      <div className="mt-2.5">
        <EvidenceBadge evidence={step.evidence} guide={guide} />
      </div>
    </li>
  );
}

export function GuideView({ guide, tier, markdown, shareUrl }: { guide: Guide; tier: "library" | "live"; markdown: string; shareUrl: string }) {
  const s = guide.summary;
  const hard = s.blockers.filter((b) => b.severity === "hard");
  const soft = s.blockers.filter((b) => b.severity === "soft");
  const allSteps = [...guide.paths.dev, ...guide.paths.production];
  const agentSteps = allSteps.filter((x) => x.owner === "agent").length;
  const youSteps = allSteps.filter((x) => x.owner === "you").length;
  const demo = /^(DEMO|MOCK) MODE/.test(guide.verification.notes ?? "");

  return (
    <article>
      {/* Title row */}
      <div className="fade-up flex min-w-0 flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">
            <Link href="/" className="hover:text-ink">
              Library
            </Link>{" "}
            / {tier === "library" ? "Curated guide" : "Generated live"}
          </p>
          <h1 className="display mt-2 text-3xl text-ink sm:text-5xl">{guide.app.name}</h1>
          {guide.app.oneLiner && <p className="mt-2 max-w-prose text-inkSoft">{guide.app.oneLiner}</p>}
          <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 mono-xs text-inkSoft">
            <span>generated {formatDate(guide.generatedAt)}</span>
            <span>verified {formatDate(guide.lastVerifiedAt)} · {guide.verification.status}</span>
            {guide.app.developerPortalUrl && (
              <a href={guide.app.developerPortalUrl} target="_blank" rel="noreferrer" className="text-signal hover:underline">
                developer console ↗
              </a>
            )}
            {guide.app.docsUrl && (
              <a href={guide.app.docsUrl} target="_blank" rel="noreferrer" className="text-signal hover:underline">
                docs ↗
              </a>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CopyButton text={shareUrl} label="Copy link" />
          <CopyButton text={markdown} label="Copy as Markdown" />
          <a href={`/api/guides/${guide.slug}?format=md`} className="btn btn-secondary btn-sm" download>
            Download .md
          </a>
          <a href={`/api/guides/${guide.slug}`} className="btn btn-secondary btn-sm">
            JSON
          </a>
        </div>
      </div>

      {demo && (
        <div className="fade-up mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-lime bg-limeSoft px-4 py-3 text-sm text-ink" style={{ ["--d" as string]: "60ms" }}>
          <span className="pill border-lime bg-lime text-ink">Demo mode</span>
          <span className="text-ink/80">
            This guide came from fixture responses, not live research. Probe results are real HTTP checks. Add an API key to the deployment to generate from
            live sources.
          </span>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[22rem_1fr]">
        {/* Summary rail */}
        <aside className="stagger min-w-0 self-start space-y-4 lg:sticky lg:top-20">
          <section className="surface p-5">
            <p className="text-[15px] font-medium leading-snug text-ink">{s.tldr}</p>
            <div className="mt-4 flex items-center gap-3">
              <DifficultyMark level={s.difficulty} animate />
            </div>
            <p className="mt-2.5 text-sm text-inkSoft">{s.difficultyReason}</p>
            <p className="mt-1 text-xs text-inkSoft/80">{DIFFICULTY_HINT[s.difficulty]}</p>
          </section>

          <section className="surface p-5">
            <p className="eyebrow">Two clocks</p>
            <p className="mb-3 mt-1 text-xs text-inkSoft">Getting a token for yourself vs. letting any user connect.</p>
            <TwoClocks dev={s.timeToDevReady} prod={s.timeToProduction} />
          </section>

          <section className="surface divide-y divide-ink/[0.06] p-5 text-sm [&>div]:py-3 [&>div:first-child]:pt-0 [&>div:last-child]:pb-0">
            <div>
              <div className="eyebrow">Cost</div>
              <div className="mt-1 font-medium text-ink">{s.cost}</div>
            </div>
            <div>
              <div className="eyebrow">Who does the work</div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-ink">
                <OwnerPill owner="agent" />
                <span className="font-medium">{agentSteps}</span> step{agentSteps === 1 ? "" : "s"}
                <OwnerPill owner="you" />
                <span className="font-medium">{youSteps}</span>
              </div>
            </div>
            <div>
              <div className="eyebrow">OAuth</div>
              <div className="mt-1 text-ink">
                {guide.oauth.supportsOAuth ? guide.oauth.flows.join(", ") || "supported" : "Not supported"}
                {guide.oauth.alternatives.length > 0 && <span className="text-inkSoft"> · also {guide.oauth.alternatives.join(", ")}</span>}
              </div>
              {guide.oauth.notes && <p className="mt-1 text-xs text-inkSoft">{guide.oauth.notes}</p>}
            </div>
            <div>
              <div className="eyebrow">Composio-managed OAuth app</div>
              <div className="mt-1 text-ink">
                {guide.oauth.composioManaged === "yes" && (
                  <>
                    <span className="pill border-ok/20 bg-okSoft text-ok mr-1.5">Yes</span>
                    {guide.oauth.composioToolkitSlug ? `${guide.oauth.composioToolkitSlug}. ` : ""}You may not need your own app at all.
                  </>
                )}
                {guide.oauth.composioManaged === "no" && "No. Bring your own OAuth app."}
                {guide.oauth.composioManaged === "unknown" && (
                  <>
                    Unknown.{" "}
                    <a href="https://docs.composio.dev/toolkits/managed-auth" target="_blank" rel="noreferrer" className="text-signal hover:underline">
                      Check the directory ↗
                    </a>
                  </>
                )}
              </div>
            </div>
            <div>
              <div className="eyebrow">Dynamic client registration</div>
              <div className="mt-1 text-ink">
                {guide.oauth.dynamicClientRegistration === "yes"
                  ? "Advertised. MCP-style clients can self-register."
                  : guide.oauth.dynamicClientRegistration === "no"
                    ? "Not advertised"
                    : "Unknown"}
              </div>
            </div>
          </section>

          {(hard.length > 0 || soft.length > 0) && (
            <section className="surface p-5">
              <p className="eyebrow">Blockers</p>
              <ul className="mt-3 space-y-3 text-sm">
                {hard.map((b, i) => (
                  <li key={`h${i}`} className="border-l-2 border-bad pl-3">
                    <span className="pill border-bad/20 bg-badSoft text-bad mb-1">Hard</span>
                    <div className="text-ink">{b.text}</div>
                    <EvidenceBadge evidence={b.evidence} guide={guide} />
                  </li>
                ))}
                {soft.map((b, i) => (
                  <li key={`s${i}`} className="border-l-2 border-warn pl-3">
                    <span className="pill border-warn/20 bg-warnSoft text-warn mb-1">Soft</span>
                    <div className="text-ink">{b.text}</div>
                    <EvidenceBadge evidence={b.evidence} guide={guide} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>

        {/* Body */}
        <div className="stagger min-w-0 space-y-5">
          {guide.prerequisites.length > 0 && (
            <section className="surface p-5">
              <SectionHead eyebrow="Before you start" title="Prerequisites" />
              <ul className="mt-3 space-y-2.5 text-sm">
                {guide.prerequisites.map((p, i) => (
                  <li key={i} className="flex flex-wrap items-start gap-2">
                    <OwnerPill owner={p.owner} />
                    <span className="min-w-[12rem] flex-1 text-ink">{p.text}</span>
                    <EvidenceBadge evidence={p.evidence} guide={guide} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="surface p-5">
            <SectionHead eyebrow="Path 1" title="Dev-ready" aside="a token for you and test users" />
            <ol className="mt-1 divide-y divide-ink/[0.06]">
              {guide.paths.dev.map((st, i) => (
                <StepItem key={i} step={st} index={i} guide={guide} />
              ))}
            </ol>
          </section>

          <section className="surface p-5">
            <SectionHead eyebrow="Path 2" title="Production" aside="any user can connect, no caps, no warnings" />
            {guide.paths.production.length === 0 ? (
              <p className="panel mt-3 px-3 py-2.5 text-sm text-ink">No extra steps. The dev path is already production for this provider.</p>
            ) : (
              <ol className="mt-1 divide-y divide-ink/[0.06]">
                {guide.paths.production.map((st, i) => (
                  <StepItem key={i} step={st} index={i} guide={guide} />
                ))}
              </ol>
            )}
          </section>

          {guide.requirements.length > 0 && (
            <section className="surface p-5">
              <SectionHead eyebrow="Checklist" title="Requirements" />
              <ul className="mt-2 divide-y divide-ink/[0.06]">
                {guide.requirements.map((r, i) => (
                  <li key={i} className="flex flex-wrap items-start gap-2 py-2.5 text-sm">
                    <span className={`mt-0.5 inline-block h-4 w-4 rounded-[5px] border ${r.required ? "border-ink" : "border-ink/25 border-dashed"}`} aria-hidden />
                    <span className="min-w-[12rem] flex-1">
                      <span className="text-ink">{r.item}</span>
                      {!r.required && <span className="text-inkSoft"> (optional)</span>}
                      {r.notes && <span className="block text-xs text-inkSoft">{r.notes}</span>}
                    </span>
                    <EvidenceBadge evidence={r.evidence} guide={guide} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {guide.gotchas.length > 0 && (
            <section className="surface p-5">
              <SectionHead eyebrow="Watch out" title="Gotchas" />
              <ul className="mt-3 space-y-3.5 text-sm">
                {guide.gotchas.map((g, i) => (
                  <li key={i}>
                    <div className="font-medium text-ink">{g.title}</div>
                    <p className="max-w-prose text-ink/85">{g.detail}</p>
                    <EvidenceBadge evidence={g.evidence} guide={guide} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {guide.whenStuck.length > 0 && (
            <section className="surface p-5">
              <SectionHead eyebrow="Escalation" title="When you're stuck" />
              <ul className="mt-3 space-y-3.5 text-sm">
                {guide.whenStuck.map((w, i) => (
                  <li key={i}>
                    <div className="font-medium text-ink">{w.situation}</div>
                    <p className="max-w-prose text-ink/85">
                      {w.action}
                      {w.link && (
                        <>
                          {" "}
                          <a href={w.link} target="_blank" rel="noreferrer" className="text-signal hover:underline">
                            Open ↗
                          </a>
                        </>
                      )}
                    </p>
                    <EvidenceBadge evidence={w.evidence} guide={guide} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="surface p-5">
            <SectionHead eyebrow="Audit trail" title="What we could and couldn't verify" />
            <p className="mt-2 text-sm text-inkSoft">
              Status <span className="pill border-ink/10 bg-panel text-ink">{guide.verification.status}</span> · claims checked{" "}
              <span className="font-medium text-ink">{guide.verification.checkedClaims}</span>.{guide.verification.notes && <> {guide.verification.notes}</>}
            </p>
            {guide.verification.corrected.length > 0 && (
              <div className="mt-3">
                <div className="text-sm font-medium text-ink">Corrected during verification</div>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink/85">
                  {guide.verification.corrected.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
            {guide.verification.unverifiable.length > 0 && (
              <div className="mt-3">
                <div className="text-sm font-medium text-ink">Left as inferred (no source found)</div>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink/85">
                  {guide.verification.unverifiable.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
            {guide.openQuestions.length > 0 && (
              <div className="mt-3">
                <div className="text-sm font-medium text-ink">Still uncertain</div>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink/85">
                  {guide.openQuestions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="surface p-5">
            <SectionHead eyebrow="References" title="Sources" />
            <ol className="mt-3 space-y-2 text-sm">
              {guide.sources.map((src, i) => (
                <li key={src.id} id={`src-${i + 1}`} className="flex gap-3 scroll-mt-24">
                  <span className="w-6 shrink-0 mono-xs text-inkSoft">{i + 1}.</span>
                  <span className="min-w-0">
                    <a href={src.url} target="_blank" rel="noreferrer" className="text-signal hover:underline [overflow-wrap:anywhere]">
                      {src.title || src.url}
                    </a>
                    <span className="ml-1.5 pill border-ink/10 bg-panel text-inkSoft">{src.type}</span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-xs text-inkSoft">
              Tested = actually attempted · Documented = official docs · Reported = community or vendor posts · Inferred = the agent&apos;s best reading, verify it.
            </p>
          </section>
        </div>
      </div>
    </article>
  );
}
