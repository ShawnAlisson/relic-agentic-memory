# Relic

**Agents that think. Agents that act. Agents that remember — in CockroachDB.**

Relic is an on-call agent whose memory is a globally consistent database, not a chat window. When a checkout SEV1 fires, the agent writes working memory, retrieves prior incidents through CockroachDB distributed vector indexes, checks cluster health with the agent-ready `ccloud` CLI, stores the investigation packet on Amazon S3, and commits the lesson so the *next* autonomous spawn does not start from zero.

Built for the **CockroachDB × AWS Hackathon — Build with Agentic Memory**.

## Why this exists

AI agents that diagnose incidents and ship code already write more than humans. If their memory goes offline, they do not degrade — they stop, or worse, they repeat a rollback they already learned. Relic treats CockroachDB as the system of record for:

| Memory | Table | Notes |
| --- | --- | --- |
| Working | `episodes` + `memories.kind='working'` | Transactional state for the current spawn |
| Episodic | `episodes` + `memories.kind='episodic'` | What happened last time |
| Semantic | `memories.embedding VECTOR(384)` | C-SPANN nearest neighbor, tenant-prefixed |
| Procedural | `memories.kind='procedural'` | Runbooks as rows, not prompt folklore |
| Artifacts | `artifacts` → S3 | Logs and JSON packets off the OLTP path |

## CockroachDB tools used

1. **Distributed Vector Indexing** — `CREATE VECTOR INDEX memories_embedding_idx ON memories (tenant_id, embedding)` and `ORDER BY embedding <-> $query`. Semantic search and operational data share a commit.
2. **CockroachDB Agent Skills** — `skills/cockroachdb-agent-memory/SKILL.md` encodes schema, prefix-column isolation, and ops anti-patterns for Claude/Cursor/LangChain.
3. **ccloud CLI (agent-ready)** — `scripts/ccloud-agent.sh` (`ccloud cluster list --output json`). The agent calls this on every incident before it trusts memory.
4. **Managed MCP Server** — `mcp/cockroachdb.mcp.json` is the Cloud Console snippet slot (`https://cockroachlabs.cloud/mcp`). Local judging uses the same read-only contract at `GET /api/mcp/tools`.

## AWS services used

- **Amazon S3** (MinIO locally) — investigation packets at `s3://relic-agent-artifacts/episodes/{id}/investigation.json`.
- **AWS Lambda** — `infra/lambda/handler.mjs` + `infra/template.yaml` for serverless turns.
- **Amazon Bedrock** — optional `Converse` for the resolution prose. Without keys, Relic still resolves from retrieved memories (the memory layer is the product).

## Quick start (local, no cloud keys)

```bash
cp .env.example .env
docker compose up -d crdb minio createbucket
# wait ~10s for Cockroach
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000) → **Console** → **Page Relic**.

One-shot: `bash scripts/start.sh`

You should see VECTOR retrieval of the July checkout incident, a ccloud health JSON, an S3 PUT, and new episodic/semantic rows.

## Architecture

```
Pager
  → Relic agent (Next.js / AWS Lambda)
  → INSERT working memory                 CockroachDB
  → SELECT embedding <-> query            CockroachDB VECTOR (C-SPANN)
  → ccloud cluster list --output json     CockroachDB Cloud
  → PUT investigation.json                Amazon S3
  → UPDATE episode + INSERT lessons       CockroachDB
  → audit_log                             CockroachDB
```

Details: `/architecture`.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | SQL connectivity |
| GET | `/api/memory` | Episodes, memories, traces |
| GET | `/api/memory/search?q=` | VECTOR kNN |
| POST | `/api/demo/run` | Open SEV1 + full agent loop |
| GET | `/api/mcp/tools` | Read-only MCP-shaped tools |

## Demo video

Generated assets live in `demo/`:

```bash
npm run video
```

Requires `ffmpeg`. Voiceover uses ElevenLabs if `ELEVENLABS_API_KEY` is set, otherwise macOS `say`.

Upload `demo/out/relic-demo.mp4` to YouTube or Vimeo (public).

## License

MIT — see `LICENSE`.
