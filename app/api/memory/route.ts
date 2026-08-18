import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  const [episodes, memories, traces, artifacts] = await Promise.all([
    query(
      `SELECT id, title, service, severity, status, region, summary, started_at, resolved_at
       FROM episodes ORDER BY started_at DESC LIMIT 20`,
    ),
    query(
      `SELECT id, kind, title, content, importance, created_at
       FROM memories ORDER BY created_at DESC LIMIT 40`,
    ),
    query(
      `SELECT id, episode_id, step, thought, tool, action, observation, created_at
       FROM traces ORDER BY created_at DESC LIMIT 50`,
    ),
    query(
      `SELECT id, episode_id, s3_bucket, s3_key, bytes, created_at
       FROM artifacts ORDER BY created_at DESC LIMIT 20`,
    ),
  ]);
  const counts = await query<{ kind: string; n: string }>(
    `SELECT kind, count(*)::text AS n FROM memories GROUP BY kind`,
  );
  return NextResponse.json({ episodes, memories, traces, artifacts, counts });
}
