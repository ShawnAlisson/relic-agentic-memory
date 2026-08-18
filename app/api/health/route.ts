import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  try {
    const r = await pool.query("SELECT now() AS t, current_database() AS db");
    return NextResponse.json({
      ok: true,
      database: r.rows[0].db,
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
