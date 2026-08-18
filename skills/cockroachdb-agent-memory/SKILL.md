---
name: cockroachdb-agent-memory
description: >-
  Design and operate Relic-style agentic memory on CockroachDB: episodes,
  VECTOR embeddings, tenant-prefixed C-SPANN indexes, MCP read-only access,
  and ccloud JSON control-plane checks. Use when creating schemas for agent
  memory, RAG that must not drift from operational data, or on-call agents.
---

# CockroachDB as agentic memory

Do not put agent memory in a sidecar vector database. Store episodes, traces, and embeddings in CockroachDB so retrieval and transactions share a commit.

## Schema contract

- `episodes` — working / episodic state (status is a state machine).
- `memories` — `kind` in `working | episodic | semantic | procedural` plus `embedding VECTOR(384)`.
- `traces` — append-only tool log.
- `artifacts` — S3 keys only; never large blobs in SQL.
- `audit_log` — who wrote memory, when.

Vector index must be tenant-prefixed:

```sql
CREATE VECTOR INDEX memories_embedding_idx ON memories (tenant_id, embedding);
```

Query with the same prefix:

```sql
SELECT id, title, content, (embedding <-> $query) AS distance
FROM memories
WHERE tenant_id = $tenant
ORDER BY embedding <-> $query
LIMIT 8;
```

## Operations

- Prefer `ccloud cluster list --output json` before restarting agents.
- Managed MCP Server is read-only by default. Do not disable that for production coding agents.
- If under-replicated ranges > 0, drain traffic, not the memory database.

## Anti-patterns

- Embedding tables in a different system than incidents.
- Synchronous VECTOR upserts on the customer checkout path.
- Storing secrets in `payload` JSONB.
