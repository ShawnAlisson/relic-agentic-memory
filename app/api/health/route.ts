import { NextResponse } from "next/server";
import { ensureReady } from "@/lib/bootstrap";
import { pool } from "@/lib/db";

export async function GET() {
  try {
    await ensureReady();
    const r = await pool.query("SELECT now() AS t, current_database() AS db");
    const memories = await pool.query("SELECT count(*)::int AS n FROM memories");
    return NextResponse.json({
      ok: true,
      database: r.rows[0].db,
      memories: memories.rows[0].n,
      time: r.rows[0].t,
      tools: {
        cockroach: ["Distributed Vector Indexing", "Agent Skills", "ccloud CLI", "Managed MCP config"],
        aws: ["Amazon S3 / MinIO", "AWS Lambda handler", "Amazon Bedrock (optional)"],
      },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 503 },
    );
  }
}
