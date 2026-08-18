-- feature.vector_index.enabled is set by scripts/migrate.mjs
CREATE DATABASE IF NOT EXISTS relic;
USE relic;

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  region TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS episodes (
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
);

CREATE INDEX IF NOT EXISTS episodes_tenant_status_idx ON episodes (tenant_id, status, started_at DESC);
CREATE INDEX IF NOT EXISTS episodes_service_idx ON episodes (service, started_at DESC);

CREATE TABLE IF NOT EXISTS memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  episode_id UUID REFERENCES episodes(id),
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  importance FLOAT8 NOT NULL DEFAULT 0.5,
  embedding VECTOR(384),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS memories_kind_idx ON memories (tenant_id, kind, created_at DESC);
CREATE VECTOR INDEX IF NOT EXISTS memories_embedding_idx ON memories (tenant_id, embedding);

CREATE TABLE IF NOT EXISTS traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID NOT NULL REFERENCES episodes(id),
  step INT NOT NULL,
  thought TEXT NOT NULL,
  tool TEXT,
  action TEXT,
  observation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS traces_episode_idx ON traces (episode_id, step);

CREATE TABLE IF NOT EXISTS artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID NOT NULL REFERENCES episodes(id),
  s3_bucket TEXT NOT NULL,
  s3_key TEXT NOT NULL,
  content_type TEXT NOT NULL,
  bytes INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  detail JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_idx ON audit_log (tenant_id, created_at DESC);
