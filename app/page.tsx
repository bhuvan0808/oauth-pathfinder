import Link from "next/link";
import { loadLibrary, listGeneratedGuides } from "@/lib/store";
import { LibraryGrid } from "@/components/LibraryGrid";
import { SubmitBox } from "@/components/SubmitBox";

export const dynamic = "force-dynamic";

const MARQUEE = [
  "GitHub",
  "Google",
  "Slack",
  "Microsoft 365",
  "Atlassian",
  "X",
  "Linear",
  "Notion",
  "HubSpot",
  "cal.com",
  "Mercury",
  "Resend",
  "Zoom",
  "Discord",
  "Pipedrive",
  "Stripe",
  "Salesforce",
  "Shopify",
  "Dropbox",
  "Figma"
];

const HOW = [
  { n: "01", title: "Identify", body: "Resolve the name or URL to a product and find its developer console and docs. Ambiguous names get a stated choice." },
  { n: "02", title: "Read", body: "Search and fetch the official pages on app registration, distribution, review, scope tiers and pricing, plus community reports on how long reviews really take." },
  { n: "03", title: "Probe", body: "Real HTTP checks: OAuth discovery metadata and dynamic client registration, developer-portal reachability, and whether Composio already manages the OAuth app." },
  { n: "04", title: "Write", body: "A structured guide: two clocks, blockers, steps with an owner (agent or you), requirements, gotchas, and what to do when stuck." },
  { n: "05", title: "Audit", body: "A second pass checks every claim against the pages actually visited. Anything unsupported is downgraded to inferred and listed, not hidden." }
];

export default async function Home() {
  const library = loadLibrary().sort((a, b) => a.summary.difficulty - b.summary.difficulty || a.app.name.localeCompare(b.app.name));
  const generated = await listGeneratedGuides();
  const curatedSlugs = new Map(library.map((g) => [g.app.name.toLowerCase(), g.slug]));

  return (
    <div className="space-y-16 sm:space-y-20">
      {/* ---- hero ---- */}
      <section className="relative -mx-4 -mt-8 overflow-hidden px-4 pb-10 pt-12 sm:-mx-6 sm:-mt-10 sm:px-6 sm:pb-14 sm:pt-20">
        <div className="hero-glow" aria-hidden />
        <div className="dots absolute inset-0 opacity-50 [mask-image:radial-gradient(70%_60%_at_50%_30%,#000,transparent)]" aria-hidden />
        <div className="relative mx-auto max-w-6xl">
          <p className="eyebrow fade-up" style={{ ["--d" as string]: "0ms" }}>
            OAuth app readiness · agent-generated guides
          </p>
          <h1 className="display fade-up mt-4 max-w-4xl text-[2.35rem] text-ink sm:text-6xl" style={{ ["--d" as string]: "80ms" }}>
            Will your OAuth app take <span className="highlight">an hour</span> or{" "}
            <span className="font-serif italic font-normal">a quarter?</span>
          </h1>
          <p className="fade-up mt-5 max-w-2xl text-base text-inkSoft sm:text-lg" style={{ ["--d" as string]: "160ms" }}>
            Before an agent&apos;s users can connect an app, you need an OAuth app the provider will approve. Every guide runs on two clocks: time to a
            token for yourself, and time until any user can connect without warnings or caps. Each step says whether an agent can do it or you
            must, and every claim carries its evidence.
          </p>
          <div className="fade-up mt-7 max-w-2xl" style={{ ["--d" as string]: "240ms" }}>
            <SubmitBox examples={["Linear", "HubSpot", "Notion", "cal.com", "Mercury", "Resend"]} />
          </div>

          <dl className="fade-up mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-ink/10 bg-ink/10 sm:grid-cols-4" style={{ ["--d" as string]: "320ms" }}>
            {[
              { k: "Curated guides", v: String(library.length), s: "checked against official docs" },
              { k: "Difficulty range", v: "1 → 5", s: "from create-and-go to gated" },
              { k: "Clocks per guide", v: "2", s: "dev-ready and production" },
              { k: "Evidence levels", v: "4", s: "tested · documented · reported · inferred" }
            ].map((t) => (
              <div key={t.k} className="bg-card px-4 py-4 sm:px-5">
                <dt className="eyebrow">{t.k}</dt>
                <dd className="mt-1.5 text-2xl font-medium tracking-tight text-ink">{t.v}</dd>
                <dd className="mt-0.5 text-xs text-inkSoft">{t.s}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="marquee fade-up relative mt-10" style={{ ["--duration" as string]: "55s", ["--d" as string]: "400ms" }} aria-hidden>
          {[0, 1].map((copy) => (
            <div key={copy} className="marquee-track">
              {MARQUEE.map((name) => {
                const slug = curatedSlugs.get(name.toLowerCase());
                const href = slug ? `/guide/${slug}` : `/generate?q=${encodeURIComponent(name)}`;
                return (
                  <Link
                    key={`${copy}-${name}`}
                    href={href}
                    tabIndex={-1}
                    className="surface surface-hover inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm text-ink no-underline"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                    {name}
                    {slug && <span className="mono-xs text-inkSoft">curated</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      {/* ---- library ---- */}
      <section id="library" className="scroll-mt-20">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Curated library</p>
            <h2 className="mt-2 text-2xl font-medium tracking-tight text-ink sm:text-3xl">Six providers that span the difficulty range</h2>
          </div>
          <p className="max-w-md text-sm text-inkSoft">Facts checked against official docs; see VERIFICATION.md in the repo for what was confirmed, corrected and left open.</p>
        </div>
        <div className="mt-6">
          <LibraryGrid guides={library} emptyText="No curated guides found in data/guides." />
        </div>
      </section>

      {generated.length > 0 && (
        <section>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Generated live</p>
              <h2 className="mt-2 text-2xl font-medium tracking-tight text-ink sm:text-3xl">Produced by the agent on request</h2>
            </div>
            <p className="max-w-md text-sm text-inkSoft">Agent-verified, not human-reviewed. Read with the evidence badges in view.</p>
          </div>
          <div className="mt-6">
            <LibraryGrid guides={generated} />
          </div>
        </section>
      )}

      {/* ---- how ---- */}
      <section id="how" className="scroll-mt-20">
        <p className="eyebrow">How a guide is made</p>
        <h2 className="mt-2 text-2xl font-medium tracking-tight text-ink sm:text-3xl">Five stages, streamed live</h2>
        <ol className="stagger mt-6 grid gap-px overflow-hidden rounded-2xl border border-ink/10 bg-ink/10 sm:grid-cols-2 lg:grid-cols-5">
          {HOW.map((h) => (
            <li key={h.n} className="group bg-card p-5 transition-colors hover:bg-panel">
              <div className="flex items-center justify-between">
                <span className="mono-xs text-inkSoft">{h.n}</span>
                <span className="h-1.5 w-1.5 rounded-full bg-line transition-colors group-hover:bg-brand" />
              </div>
              <h3 className="mt-3 font-medium text-ink">{h.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-inkSoft">{h.body}</p>
            </li>
          ))}
        </ol>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="surface p-5">
            <p className="eyebrow">Evidence levels</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex gap-2">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-ok" />
                <span>
                  <span className="font-medium text-ink">Tested</span> <span className="text-inkSoft">means actually attempted: the pipeline&apos;s probes or a human attempt.</span>
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-signal" />
                <span>
                  <span className="font-medium text-ink">Documented</span> <span className="text-inkSoft">means an official provider page, linked.</span>
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-warn" />
                <span>
                  <span className="font-medium text-ink">Reported</span> <span className="text-inkSoft">means community or vendor posts, typical for timing and cost.</span>
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-inkSoft/50" />
                <span>
                  <span className="font-medium text-ink">Inferred</span> <span className="text-inkSoft">means the agent&apos;s best reading, which you should verify.</span>
                </span>
              </li>
            </ul>
          </div>
          <div className="surface p-5">
            <p className="eyebrow">Shortcuts first</p>
            <p className="mt-3 text-sm text-inkSoft">
              If Composio already manages the OAuth app for a provider, or the provider advertises dynamic client registration, the guide says so at
              the top. Telling a developer they can skip the whole process is the most useful possible answer.
            </p>
            <a href="https://docs.composio.dev/toolkits/managed-auth" target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm mt-4">
              Composio managed auth ↗
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
