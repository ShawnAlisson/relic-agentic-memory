import { randomUUID } from "node:crypto";
import { Pool } from "pg";

function embedLocal(text) {
  const DIM = 384;
  const vec = new Array(DIM).fill(0);
  const tokens = text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  for (const token of tokens) {
    let h = 2166136261;
    for (let i = 0; i < token.length; i += 1) {
      h = Math.imul(h ^ token.charCodeAt(i), 16777619);
    }
    h >>>= 0;
    vec[h % DIM] += 1;
    vec[(h * 17) % DIM] += 0.45;
    if (token.length > 4) vec[(h * 31) % DIM] += 0.25;
  }
  const mag = Math.sqrt(vec.reduce((s, n) => s + n * n, 0)) || 1;
  return `[${vec.map((n) => (n / mag).toFixed(6)).join(",")}]`;
}

const TENANT = "11111111-1111-1111-1111-111111111111";
const AGENT = "22222222-2222-2222-2222-222222222222";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://root@127.0.0.1:26257/relic?sslmode=disable",
});

const memories = [
  {
    kind: "procedural",
    title: "Runbook: checkout p99 > 1s",
    content:
      "If checkout p99 exceeds 1s in a single region, freeze the canary, compare statement fingerprints against relic.memories VECTOR neighbors, and fail open to the last-known-good replica. Never drop Cockroach writes; memory is the system of record.",
    importance: 0.95,
  },
  {
    kind: "episodic",
    title: "2026-07-22 checkout timeouts after payment SDK bump",
    content:
      "eu-west-1 checkout p99 hit 3.8s after a Stripe SDK bump. Root cause: extra serial round-trip on payment_intent. Fix: batch authorize + capture. Agent that lacked durable memory repeated the same rollback twice.",
    importance: 0.9,
  },
  {
    kind: "semantic",
    title: "Checkout latency correlates with VECTOR write bursts",
    content:
      "When on-call agents write embeddings synchronously on the request path, checkout and memory contend on the same nodes. Buffer VECTOR upserts; keep episode rows transactional and durable.",
    importance: 0.85,
  },
  {
    kind: "procedural",
    title: "Runbook: Cockroach under-replicated ranges",
    content:
      "Use ccloud cluster list --output json, then ccloud backup list. If under_replicated_ranges > 0, do not restart agents. Memory must remain available; drain traffic, not the database.",
    importance: 0.93,
  },
  {
    kind: "episodic",
    title: "2026-06-03 auth token expiry cascade",
    content:
      "A fleet of coding agents expired service-account tokens and lost MCP access to Cockroach. Relic now rotates via ccloud and stores last-good credentials metadata in episode payload, never the secret itself.",
    importance: 0.8,
  },
  {
    kind: "semantic",
    title: "Tenant-prefixed VECTOR indexes isolate agent memory",
    content:
      "C-SPANN prefix columns (tenant_id, embedding) keep one customer's incident memories from leaking into another agent's retrieval. This is the multi-tenant contract for agentic memory.",
    importance: 0.9,
  },
  {
    kind: "procedural",
    title: "Skill: schema for agent memory",
    content:
      "Episodes are rows. Traces are append-only. Memories carry VECTOR(384). Artifacts live in S3. Audit log is immutable. This mapping is encoded in the Relic CockroachDB agent skill.",
    importance: 0.7,
  },
];

async function main() {
  await pool.query(
    `INSERT INTO tenants (id, name, region) VALUES ($1,$2,$3)
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
    [TENANT, "Decillion Ops", "eu-west-1"],
  );
  await pool.query(
    `INSERT INTO agents (id, tenant_id, name, role) VALUES ($1,$2,$3,$4)
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
    [AGENT, TENANT, "relic-oncall", "incident-memory-agent"],
  );

  await pool.query(`DELETE FROM traces`);
  await pool.query(`DELETE FROM artifacts`);
  await pool.query(`DELETE FROM memories`);
  await pool.query(`DELETE FROM episodes`);

  const priorId = randomUUID();
  await pool.query(
    `INSERT INTO episodes (id, tenant_id, agent_id, title, service, severity, status, region, summary, started_at, resolved_at, payload)
     VALUES ($1,$2,$3,$4,$5,$6,'resolved',$7,$8, now() - interval '27 days', now() - interval '27 days' + interval '41 minutes', $9::JSONB)`,
    [
      priorId,
      TENANT,
      AGENT,
      "Checkout p99 3.8s after payment SDK bump",
      "checkout-api",
      "sev1",
      "eu-west-1",
      "Rolled back SDK, batched payment_intent, restored p99 to 190ms.",
      JSON.stringify({ p99_ms: 3800, root_cause: "serial_payment_roundtrip" }),
    ],
  );

  for (const mem of memories) {
    await pool.query(
      `INSERT INTO memories (tenant_id, episode_id, kind, title, content, importance, embedding)
       VALUES ($1,$2,$3,$4,$5,$6,$7::VECTOR)`,
      [
        TENANT,
        mem.kind === "episodic" ? priorId : null,
        mem.kind,
        mem.title,
        mem.content,
        mem.importance,
        embedLocal(`${mem.title} ${mem.content}`),
      ],
    );
  }

  console.log("seeded tenant", TENANT, "agent", AGENT);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
