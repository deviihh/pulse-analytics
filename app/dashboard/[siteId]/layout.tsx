import Link from "next/link";

export default async function SiteLayout({
  children, params,
}: {
  children: React.ReactNode;
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  return (
    <div>
      <nav className="mx-auto flex max-w-6xl gap-4 px-6 pt-6 text-sm md:px-10">
        <Link href={`/dashboard/${siteId}`} className="hover:underline">Overview</Link>
        <Link href={`/dashboard/${siteId}/funnel`} className="hover:underline">Funnels</Link>
      </nav>
      {children}
    </div>
  );
}