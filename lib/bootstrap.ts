import { embedLocal } from "./embeddings";
import { pool, queryOne, vectorLiteral } from "./db";

const TENANT = "11111111-1111-1111-1111-111111111111";
const AGENT = "22222222-2222-2222-2222-222222222222";

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    region TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS episodes (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    agent_id UUID REFERENCES agents(id),
    title TEXT NOT NULL,
    service TEXT NOT NULL,
    severity TEXT NOT NULL,
    status TEXT NOT NULL,
    region TEXT NOT NULL,
    summary TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    payload JSONB NOT NULL DEFAULT '{}'::JSONB
  )`,
  `CREATE INDEX IF NOT EXISTS episodes_tenant_status_idx ON episodes (tenant_id, status, started_at DESC)`,
  `CREATE INDEX IF NOT EXISTS episodes_service_idx ON episodes (service, started_at DESC)`,
  `CREATE TABLE IF NOT EXISTS memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    episode_id UUID REFERENCES episodes(id),
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    importance FLOAT8 NOT NULL DEFAULT 0.5,
    embedding VECTOR(384),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS memories_kind_idx ON memories (tenant_id, kind, created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS traces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    episode_id UUID NOT NULL REFERENCES episodes(id),
    step INT NOT NULL,
    thought TEXT NOT NULL,
    tool TEXT,
    action TEXT,
    observation TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS traces_episode_idx ON traces (episode_id, step)`,
  `CREATE TABLE IF NOT EXISTS artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    episode_id UUID NOT NULL REFERENCES episodes(id),
    s3_bucket TEXT NOT NULL,
    s3_key TEXT NOT NULL,
    content_type TEXT NOT NULL,
    bytes INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    detail JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS audit_log_idx ON audit_log (tenant_id, created_at DESC)`,
];

const SEED_MEMORIES = [
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

let ready: Promise<void> | null = null;

async function run(sql: string) {
  try {
    await pool.query(sql);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/already exists/i.test(message)) return;
    throw err;
  }
}

async function bootstrapInner() {
  try {
    await pool.query("SET CLUSTER SETTING feature.vector_index.enabled = true");
  } catch {
    /* Cloud SQL users often cannot change cluster settings; VECTOR may already be on. */
  }

  for (const statement of SCHEMA) {
    await run(statement);
  }

  try {
    await run(
      "CREATE VECTOR INDEX IF NOT EXISTS memories_embedding_idx ON memories (tenant_id, embedding)",
    );
  } catch {
    /* sequential scan still works on a seeded demo */
  }

  await pool.query(
    `INSERT INTO tenants (id, name, region) VALUES ($1,$2,$3)
     ON CONFLICT (id) DO NOTHING`,
    [TENANT, "Harbor Pay", "London"],
  );
  await pool.query(
    `INSERT INTO agents (id, tenant_id, name, role) VALUES ($1,$2,$3,$4)
     ON CONFLICT (id) DO NOTHING`,
    [AGENT, TENANT, "relic-oncall", "incident-memory-agent"],
  );

  const existing = await queryOne<{ n: string }>(
    `SELECT count(*)::text AS n FROM memories`,
  );
  if (existing && Number(existing.n) > 0) return;

  const priorId = "11c7b822-7d7d-4276-9aac-32862578428a";
  await pool.query(
    `INSERT INTO episodes (id, tenant_id, agent_id, title, service, severity, status, region, summary, started_at, resolved_at, payload)
     VALUES ($1,$2,$3,$4,$5,$6,'resolved',$7,$8, now() - interval '27 days', now() - interval '27 days' + interval '41 minutes', $9::JSONB)
     ON CONFLICT (id) DO NOTHING`,
    [
      priorId,
      TENANT,
      AGENT,
      "Europe could not check out after a payment SDK bump",
      "checkout",
      "sev1",
      "London",
      "Rolled back SDK, batched payment_intent, restored p99 to 190ms.",
      JSON.stringify({ p99_ms: 3800, root_cause: "serial_payment_roundtrip" }),
    ],
  );

  for (const mem of SEED_MEMORIES) {
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
        vectorLiteral(embedLocal(`${mem.title} ${mem.content}`)),
      ],
    );
  }
}

export function ensureReady() {
  if (!ready) {
    ready = bootstrapInner().catch((err) => {
      ready = null;
      throw err;
    });
  }
  return ready;
}
