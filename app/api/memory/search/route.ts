import { NextRequest, NextResponse } from "next/server";
import { ensureReady } from "@/lib/bootstrap";
import { searchMemories } from "@/lib/memory";

const TENANT = "11111111-1111-1111-1111-111111111111";

export async function GET(req: NextRequest) {
  await ensureReady();
  const q = req.nextUrl.searchParams.get("q") || "checkout latency eu-west-1";
  const rows = await searchMemories({ tenantId: TENANT, query: q, limit: 8 });
  return NextResponse.json({ query: q, matches: rows });
}
