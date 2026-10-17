import Link from "next/link";

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="mx-auto max-w-6xl px-6 pt-6 md:px-10">
        <p className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
          Public demo with sample data. Sign in to track your own site.
        </p>
      </div>
      <nav className="mx-auto flex max-w-6xl gap-4 px-6 pt-4 text-sm md:px-10">
        <Link href="/demo" className="hover:underline">Overview</Link>
        <Link href="/demo/funnel" className="hover:underline">Funnels</Link>
      </nav>
      {children}
    </div>
  );
}
