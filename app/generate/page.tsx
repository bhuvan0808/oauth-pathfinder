import { redirect } from "next/navigation";
import { ProgressLog } from "@/components/ProgressLog";

export const dynamic = "force-dynamic";

export default function GeneratePage({ searchParams }: { searchParams: { q?: string; force?: string } }) {
  const q = (searchParams.q || "").trim();
  if (!q) redirect("/");
  return (
    <div>
      <p className="eyebrow fade-up">Generating live</p>
      <h1 className="display fade-up mt-2 text-3xl text-ink sm:text-4xl" style={{ ["--d" as string]: "40ms" }}>
        {q}
      </h1>
      <p className="fade-up mt-2 max-w-prose text-sm text-inkSoft" style={{ ["--d" as string]: "80ms" }}>
        The agent identifies the app, reads its docs, runs live probes, writes the guide, then audits its own draft. Every search, page read and probe
        shows up below as it happens.
      </p>
      <div className="mt-6">
        <ProgressLog query={q} force={searchParams.force === "1"} />
      </div>
    </div>
  );
}
