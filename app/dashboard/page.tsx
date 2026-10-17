import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { sites } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/copy-button";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

async function addSite(formData: FormData) {
  "use server";
  const { userId } = await auth();
  if (!userId) return;
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  const domain = String(formData.get("domain") ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
  if (!name || !domain) return;
  await db.insert(sites).values({
    userId,
    name,
    domain,
    siteKey: "pk_" + randomBytes(12).toString("hex"),
  });
  revalidatePath("/dashboard");
}

export default async function Dashboard() {
  const { userId } = await auth();
  if (!userId) redirect("/");
  const mySites = await db
    .select()
    .from(sites)
    .where(eq(sites.userId, userId))
    .orderBy(desc(sites.createdAt));

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-6 py-10">
      <div>
        <h1 className="text-2xl font-bold">Your sites</h1>
        <p className="text-sm text-muted-foreground">
          Add a site, paste its snippet before the closing body tag, and events start flowing.
        </p>
      </div>

      <form
        action={addSite}
        className="flex flex-col gap-3 rounded-xl border border-white/10 bg-card p-4 sm:flex-row"
      >
        <input
          name="name"
          placeholder="Site name"
          required
          className="flex-1 rounded-md border border-white/15 bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <input
          name="domain"
          placeholder="example.com"
          required
          className="flex-1 rounded-md border border-white/15 bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary"
        />
        <Button type="submit">Add site</Button>
      </form>

      {mySites.length === 0 && (
        <p className="rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-muted-foreground">
          No sites yet. Add your first one above.
        </p>
      )}

      <div className="space-y-4">
        {mySites.map((s) => {
          const snippet = `<script defer src="${APP_URL}/analytics.js" data-site="${s.siteKey}"></script>`;
          return (
            <div key={s.id} className="rounded-xl border border-white/10 bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{s.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{s.domain}</p>
                </div>
                <div className="flex gap-2">
                  <Button asChild size="sm">
                    <Link href={`/dashboard/${s.id}`}>View stats</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/dashboard/${s.id}/funnel`}>Funnels</Link>
                  </Button>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-white/10 bg-black/40 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-xs text-muted-foreground">tracking snippet</span>
                  <CopyButton text={snippet} />
                </div>
                <pre className="overflow-x-auto font-mono text-xs text-primary/90">{snippet}</pre>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}