import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { SignInButton, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export async function SiteHeader() {
  const { userId } = await auth();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 font-mono text-sm font-semibold">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
          </span>
          pulse<span className="text-primary">/analytics</span>
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          {userId ? (
            <>
              <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
                Dashboard
              </Link>
              <UserButton />
            </>
          ) : (
            <SignInButton mode="modal">
              <Button size="sm">Sign in</Button>
            </SignInButton>
          )}
        </nav>
      </div>
    </header>
  );
}