import { NextResponse } from "next/server";
import { ensureReady } from "@/lib/bootstrap";
import { searchMemories } from "@/lib/memory";
import { query } from "@/lib/db";

const TENANT = "11111111-1111-1111-1111-111111111111";

export async function GET() {
  await ensureReady();
  const memories = await searchMemories({
    tenantId: TENANT,
    query: "read-only cluster health",
    limit: 5,
  });
  const ranges = await query(
    `SELECT count(*)::int AS memories FROM memories`,
  );
  return NextResponse.json({
    protocol: "mcp-compatible-read-only",
    note: "Production uses CockroachDB Cloud Managed MCP Server (read-only, audit logged). This endpoint is the same contract for local judging.",
    tools: [
      {
        name: "crdb_memory_search",
        description: "VECTOR nearest-neighbor search over agent memories",
        result: memories,
      },
      {
        name: "crdb_counts",
        description: "Operational count of durable memories",
        result: ranges,
      },
    ],
  });
}
