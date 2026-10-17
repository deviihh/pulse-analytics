import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/site-header";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata = {
  title: "Pulse Analytics",
  description: "Privacy-first website analytics. No cookies, no personal data.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={cn("dark font-sans", geist.variable, mono.variable)}>
        <body className="min-h-screen bg-background text-foreground antialiased">
          <SiteHeader />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}