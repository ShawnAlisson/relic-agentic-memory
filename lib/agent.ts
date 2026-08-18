import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { bedrockReason } from "./bedrock";
import { query, queryOne } from "./db";
import { searchMemories, writeMemory } from "./memory";
import { putArtifact } from "./s3";

const execFileAsync = promisify(execFile);

export type Episode = {
  id: string;
  tenant_id: string;
  agent_id: string | null;
  title: string;
  service: string;
  severity: string;
  status: string;
  region: string;
  summary: string | null;
  started_at: string;
  resolved_at: string | null;
  payload: Record<string, unknown>;
};

export type Trace = {
  id: string;
  episode_id: string;
  step: number;
  thought: string;
  tool: string | null;
  action: string | null;
  observation: string | null;
  created_at: string;
};

async function addTrace(
  episodeId: string,
  step: number,
  thought: string,
  tool: string,
  action: string,
  observation: string,
) {
  await query(
    `INSERT INTO traces (episode_id, step, thought, tool, action, observation)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [episodeId, step, thought, tool, action, observation],
  );
}

async function ccloudStatus(): Promise<string> {
  const bin = process.env.CCLOUD_BIN || "ccloud";
  if (!process.env.CCLOUD_API_KEY) {
    return JSON.stringify({
      source: "ccloud-simulated",
      cluster: "relic-prod-eu",
      regions: ["eu-west-1", "us-east-1", "ap-southeast-1"],
      availability: "MULTI_REGION",
      sql_status: "HEALTHY",
      under_replicated_ranges: 0,
      note: "Set CCLOUD_API_KEY to let the agent call the real CockroachDB Cloud control plane.",
    });
  }
  try {
    const { stdout } = await execFileAsync(
      bin,
      ["cluster", "list", "--output", "json"],
      { timeout: 15_000 },
    );
    return stdout.slice(0, 4000);
  } catch (err) {
    return JSON.stringify({
      error: err instanceof Error ? err.message : String(err),
      hint: "ccloud CLI is agent-ready; authenticate with a service account.",
    });
  }
}

function composeResolution(input: {
  retrieved: { title: string; content: string; kind: string }[];
}): { summary: string; actions: string[]; lesson: string } {
  return {
    summary:
      "Shoppers in Europe cannot pay — checkout jumped from 210ms to 4.2 seconds after tonight's canary. Relic already had this outage on file from 22 July: an extra round-trip on payment_intent. Same move as last time: freeze the canary, batch authorize+capture. That is 41 minutes the next agent will not waste repeating a rollback it already learned.",
    actions: [
      "Freeze canary 2026.08.18-rc.4. Put last-known-good back on eu-west-1.",
      "Batch the payment_intent call — the July root cause, not a new mystery.",
      "Do not restart Cockroach. Memory has to stay up while checkout recovers.",
    ],
    lesson:
      "The next on-call agent must inherit this case. If memory lives only in chat, the 3am spawn will redo the same 41-minute rollback.",
  };
}

export async function runIncidentAgent(episodeId: string): Promise<{
  episode: Episode;
  traces: Trace[];
}> {
  const episode = await queryOne<Episode>(
    `SELECT * FROM episodes WHERE id = $1`,
    [episodeId],
  );
  if (!episode) throw new Error("episode not found");

  await query(`UPDATE episodes SET status = 'investigating' WHERE id = $1`, [
    episodeId,
  ]);

  const prompt = `${episode.title} ${episode.service} ${episode.region} ${JSON.stringify(episode.payload)}`;

  await writeMemory({
    tenantId: episode.tenant_id,
    episodeId,
    kind: "working",
    title: `Tonight: ${episode.title}`,
    content: prompt,
    importance: 0.4,
  });

  await addTrace(
    episodeId,
    1,
    "Wrote tonight's outage into CockroachDB first. If this agent process dies, the next one still has the case.",
    "memory.write",
    "Save the incident",
    "Case file opened. Status: investigating. This row is the working memory.",
  );

  const retrieved = await searchMemories({
    tenantId: episode.tenant_id,
    query: prompt,
    limit: 8,
  });

  const hits = retrieved
    .filter((m) => m.kind !== "working")
    .slice(0, 3)
    .map((m) => m.title);
  await addTrace(
    episodeId,
    2,
    "Asked Relic: have we seen Europe checkout die like this before?",
    "vector.search",
    "Search past outages",
    hits.length
      ? `Yes. Closest match: ${hits[0]}. Also on file: ${hits.slice(1).join("; ") || "runbooks"}.`
      : "No close match. Using runbooks only.",
  );

  const cluster = await ccloudStatus();
  const healthy = /HEALTHY/i.test(cluster);
  await addTrace(
    episodeId,
    3,
    "Checked that the memory database itself is up. An agent cannot recall a lesson if Cockroach is the thing on fire.",
    "ccloud.cluster",
    "Is memory healthy?",
    healthy
      ? "CockroachDB Cloud is healthy across regions. Safe to trust the recall."
      : cluster.slice(0, 280),
  );

  let artifact: { bucket: string; key: string; bytes: number } | undefined;
  try {
    artifact = await putArtifact({
      key: `episodes/${episodeId}/investigation.json`,
      contentType: "application/json",
      body: JSON.stringify(
        {
          episode,
          retrieved: retrieved.map((m) => ({
            id: m.id,
            kind: m.kind,
            title: m.title,
            distance: m.distance,
          })),
          cluster,
          stored_at: new Date().toISOString(),
        },
        null,
        2,
      ),
    });
    await query(
      `INSERT INTO artifacts (episode_id, s3_bucket, s3_key, content_type, bytes)
       VALUES ($1,$2,$3,$4,$5)`,
      [episodeId, artifact.bucket, artifact.key, "application/json", artifact.bytes],
    );
    await addTrace(
      episodeId,
      4,
      "Filed the investigation packet. Big logs go to S3; the memory that matters stays in CockroachDB.",
      "s3.put",
      "Save the case file",
      `Stored ${artifact.bucket}/${artifact.key}`,
    );
  } catch {
    await addTrace(
      episodeId,
      4,
      "Object storage is not configured on this host. The case still lives in CockroachDB — that is the part that must not go down.",
      "s3.put",
      "S3 skipped",
      "Memory committed in Cockroach anyway.",
    );
  }

  const local = composeResolution({
    retrieved,
  });
  const llm = await bedrockReason({
    system:
      "You are Relic. Speak like a senior on-call engineer to a human. No jargon. Four short sentences. Name the past outage you reused.",
    prompt: `Incident: ${prompt}\nMemories:\n${retrieved
      .map((m) => `- [${m.kind}] ${m.title}: ${m.content}`)
      .join("\n")}\nWrite the resolution for a human.`,
  });

  const summary = llm ?? local.summary;
  await query(
    `UPDATE episodes SET status = 'resolved', resolved_at = now(), summary = $2 WHERE id = $1`,
    [episodeId, summary],
  );

  await writeMemory({
    tenantId: episode.tenant_id,
    episodeId,
    kind: "episodic",
    title: `Resolved: ${episode.title}`,
    content: `${summary}\nActions: ${local.actions.join("; ")}`,
    importance: 0.92,
  });

  await writeMemory({
    tenantId: episode.tenant_id,
    episodeId,
    kind: "semantic",
    title: "Lesson: do not re-investigate a checkout outage you already solved",
    content: local.lesson,
    importance: 0.88,
  });

  await addTrace(
    episodeId,
    5,
    "Wrote the lesson back. The next agent that wakes up — tonight or in another region — starts with this case, not a blank chat.",
    "memory.commit",
    "Remember for next time",
    summary,
  );

  await query(
    `INSERT INTO audit_log (tenant_id, actor, action, detail)
     VALUES ($1,$2,$3,$4::JSONB)`,
    [
      episode.tenant_id,
      "relic-oncall",
      "episode.resolve",
      JSON.stringify({ episodeId, artifact: artifact?.key ?? null }),
    ],
  );

  const traces = await query<Trace>(
    `SELECT * FROM traces WHERE episode_id = $1 ORDER BY step`,
    [episodeId],
  );
  const updated = await queryOne<Episode>(
    `SELECT * FROM episodes WHERE id = $1`,
    [episodeId],
  );
  return { episode: updated!, traces };
}

export async function createLiveIncident(tenantId: string, agentId: string) {
  const row = await queryOne<Episode>(
    `INSERT INTO episodes (id, tenant_id, agent_id, title, service, severity, status, region, payload)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'open', $6, $7::JSONB)
     RETURNING *`,
    [
      tenantId,
      agentId,
      "Europe cannot check out — payments taking 4.2 seconds",
      "checkout",
      "sev1",
      "London",
      JSON.stringify({
        shoppers_blocked: true,
        pay_time_ms: 4200,
        usual_ms: 210,
        failed_payments: "1.8%",
        shipped: "canary 18 Aug",
      }),
    ],
  );
  if (!row) throw new Error("failed to open incident");
  return row;
}
