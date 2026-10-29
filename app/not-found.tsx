import Link from "next/link";

export default function NotFound() {
  return (
    <div className="surface fade-up max-w-xl p-8">
      <p className="eyebrow">404</p>
      <h1 className="mt-2 text-xl font-medium tracking-tight text-ink">No guide at this address</h1>
      <p className="mt-2 text-sm text-inkSoft">
        Live-generated guides are cached in memory on this deployment and can disappear after a restart. Generate it again from the home page; cached
        results return instantly when they exist.
      </p>
      <Link href="/" className="btn btn-primary btn-sm mt-5">
        Back to the library
      </Link>
    </div>
  );
}
