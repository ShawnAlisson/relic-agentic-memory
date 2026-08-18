# Relic — Devpost submission notes

## Repo
Public GitHub URL (set after `git remote add`).

## Demo app
Local: `http://127.0.0.1:3000` after `docker compose up` + `npm run dev`.
Hosted: deploy the Next.js app and point `DATABASE_URL` at CockroachDB Cloud / Serverless.

## Video
`demo/out/relic-demo.mp4` (under 3 minutes). Upload to YouTube/Vimeo public.

## CockroachDB tools
- Distributed Vector Indexing — tenant-prefixed VECTOR index on `memories.embedding`; agent retrieval on every incident.
- Agent Skills — `skills/cockroachdb-agent-memory`.
- ccloud CLI — `scripts/ccloud-agent.sh` invoked from the agent loop.
- Managed MCP Server — config in `mcp/cockroachdb.mcp.json`; local contract `GET /api/mcp/tools`.

## AWS
- Amazon S3 / MinIO — investigation artifacts.
- AWS Lambda — `infra/lambda/handler.mjs`.
- Amazon Bedrock — optional reasoning (`BEDROCK_MODEL_ID`).

## Optional feedback
Managed MCP read-only-by-default is the correct default for coding agents that should not DROP TABLE in production memory. VECTOR prefix columns are the multi-tenant feature agent platforms actually need.
