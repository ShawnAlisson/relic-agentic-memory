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
  title: string;
  retrieved: { title: string; content: string; kind: string }[];
}): { summary: string; actions: string[]; lesson: string } {
  const procedural = input.retrieved.find((m) => m.kind === "procedural");
  const episodic = input.retrieved.find((m) => m.kind === "episodic");
  return {
    summary: `Checkout p99 regression matched prior memory. ${
      episodic
        ? `Closest episode: ${episodic.title}.`
        : "No exact prior episode; used procedural runbooks."
    } Relic kept working memory transactional in CockroachDB while the agent retrieved semantic neighbors via distributed vector index.`,
    actions: [
      "Pin checkout-api canary to last-known-good build 2026.08.12",
      "Shed 40% EU traffic to us-east-1 via weighted DNS while Cockroach leaseholders stay available",
      "Re-enable statement timeout 800ms on relic.memories writes after confirming VECTOR index lag = 0",
      procedural
        ? `Follow runbook: ${procedural.title}`
        : "Open a new procedural memory for this failure class",
    ],
    lesson:
      "Agent memory must be the system of record. Session context is not enough: the next agent spawn needs the same episode, embeddings, and artifacts without a maintenance window.",
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

  await addTrace(
    episodeId,
    1,
    "Persist working memory for this spawn. If this process dies, CockroachDB still holds the episode.",
    "memory.write",
    "kind=working",
    (
      await writeMemory({
        tenantId: episode.tenant_id,
        episodeId,
        kind: "working",
        title: `Working: ${episode.title}`,
        content: prompt,
        importance: 0.4,
      })
    ).id,
  );

  const retrieved = await searchMemories({
    tenantId: episode.tenant_id,
    query: prompt,
    limit: 8,
  });

  await addTrace(
    episodeId,
    2,
    "Retrieve long-term memory with CockroachDB VECTOR index (C-SPANN), prefixed by tenant for isolation.",
    "vector.search",
    prompt.slice(0, 180),
    JSON.stringify(
      retrieved.map((m) => ({
        kind: m.kind,
        title: m.title,
        distance: m.distance,
      })),
    ),
  );

  const cluster = await ccloudStatus();
  await addTrace(
    episodeId,
    3,
    "Ask the CockroachDB Cloud control plane (ccloud CLI, JSON output) whether memory itself is healthy.",
    "ccloud.cluster",
    "cluster list --output json",
    cluster,
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
      "Write investigation packet to Amazon S3 (MinIO locally / AWS in production). Memory stays in CockroachDB; bulky artifacts do not.",
      "s3.put",
      artifact.key,
      `${artifact.bucket}/${artifact.key} (${artifact.bytes} bytes)`,
    );
  } catch (err) {
    await addTrace(
      episodeId,
      4,
      "S3 is optional on the Vercel demo. CockroachDB still committed working and semantic memory.",
      "s3.put",
      "skipped",
      err instanceof Error ? err.message : String(err),
    );
  }

  const local = composeResolution({
    title: episode.title,
    retrieved,
  });
  const llm = await bedrockReason({
    system:
      "You are Relic, an on-call agent whose durable memory lives in CockroachDB. Be concise. Cite retrieved memories.",
    prompt: `Incident: ${prompt}\nMemories:\n${retrieved
      .map((m) => `- [${m.kind}] ${m.title}: ${m.content}`)
      .join("\n")}\nWrite a 4-sentence resolution plan.`,
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
    title: "Lesson: checkout latency + VECTOR write amplification",
    content: local.lesson,
    importance: 0.88,
  });

  await addTrace(
    episodeId,
    5,
    "Commit episodic + semantic memories so the next autonomous spawn does not start from zero.",
    "memory.commit",
    "kind=episodic,semantic",
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
      "Checkout p99 4.2s in eu-west-1 after canary 2026.08.18",
      "checkout-api",
      "sev1",
      "eu-west-1",
      JSON.stringify({
        p99_ms: 4200,
        baseline_ms: 210,
        error_rate: 0.018,
        symptom: "payment_intent_timeout",
        canary: "2026.08.18-rc.4",
      }),
    ],
  );
  if (!row) throw new Error("failed to open incident");
  return row;
}
