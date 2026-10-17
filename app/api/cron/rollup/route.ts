import { NextRequest, NextResponse } from "next/server";
import { runRollup } from "@/lib/rollup";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  // Vercel cron sends: Authorization: Bearer <CRON_SECRET>
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const days = Number(req.nextUrl.searchParams.get("days") ?? 2);
  const result = await runRollup(Math.min(Math.max(days, 1), 60));
  return NextResponse.json(result);
}