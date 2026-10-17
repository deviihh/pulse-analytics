"use client";

import { useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {}
      }}
      className="rounded-md border border-white/15 px-2.5 py-1 font-mono text-xs hover:bg-white/10"
    >
      {copied ? "copied" : "copy"}
    </button>
  );
}