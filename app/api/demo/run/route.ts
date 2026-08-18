import { NextResponse } from "next/server";
import { createLiveIncident, runIncidentAgent } from "@/lib/agent";
import { queryOne } from "@/lib/db";

const TENANT = "11111111-1111-1111-1111-111111111111";
const AGENT = "22222222-2222-2222-2222-222222222222";

export async function POST() {
  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM tenants WHERE id = $1`,
    [TENANT],
  );
  if (!existing) {
    return NextResponse.json(
      { error: "Database not seeded. Run npm run db:migrate && npm run db:seed" },
      { status: 503 },
    );
  }
  const episode = await createLiveIncident(TENANT, AGENT);
  const result = await runIncidentAgent(episode.id);
  return NextResponse.json(result);
}
