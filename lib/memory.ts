import { embedLocal } from "./embeddings";
import { query, queryOne, vectorLiteral } from "./db";

export type MemoryKind = "episodic" | "semantic" | "procedural" | "working";

export type MemoryRow = {
  id: string;
  tenant_id: string;
  episode_id: string | null;
  kind: MemoryKind;
  title: string;
  content: string;
  importance: number;
  distance?: number;
  created_at: string;
};

export async function writeMemory(input: {
  tenantId: string;
  episodeId?: string | null;
  kind: MemoryKind;
  title: string;
  content: string;
  importance?: number;
}): Promise<MemoryRow> {
  const embedding = embedLocal(`${input.title}\n${input.content}`);
  const row = await queryOne<MemoryRow>(
    `INSERT INTO memories (tenant_id, episode_id, kind, title, content, importance, embedding)
     VALUES ($1, $2, $3, $4, $5, $6, $7::VECTOR)
     RETURNING id, tenant_id, episode_id, kind, title, content, importance, created_at`,
    [
      input.tenantId,
      input.episodeId ?? null,
      input.kind,
      input.title,
      input.content,
      input.importance ?? 0.6,
      vectorLiteral(embedding),
    ],
  );
  if (!row) throw new Error("failed to write memory");
  return row;
}

export async function searchMemories(input: {
  tenantId: string;
  query: string;
  limit?: number;
  kind?: MemoryKind;
}): Promise<MemoryRow[]> {
  const embedding = embedLocal(input.query);
  const limit = input.limit ?? 6;
  if (input.kind) {
    return query<MemoryRow>(
      `SELECT id, tenant_id, episode_id, kind, title, content, importance, created_at,
              (embedding <-> $2::VECTOR) AS distance
       FROM memories
       WHERE tenant_id = $1 AND kind = $3 AND embedding IS NOT NULL
       ORDER BY embedding <-> $2::VECTOR
       LIMIT $4`,
      [input.tenantId, vectorLiteral(embedding), input.kind, limit],
    );
  }
  return query<MemoryRow>(
    `SELECT id, tenant_id, episode_id, kind, title, content, importance, created_at,
            (embedding <-> $2::VECTOR) AS distance
     FROM memories
     WHERE tenant_id = $1 AND embedding IS NOT NULL
     ORDER BY embedding <-> $2::VECTOR
     LIMIT $3`,
    [input.tenantId, vectorLiteral(embedding), limit],
  );
}
