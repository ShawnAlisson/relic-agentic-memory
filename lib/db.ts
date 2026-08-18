import { Pool } from "pg";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://root@127.0.0.1:26257/relic?sslmode=disable";

declare global {
  var relicPool: Pool | undefined;
}

export const pool =
  global.relicPool ??
  new Pool({
    connectionString,
    max: 12,
    idleTimeoutMillis: 20_000,
  });

if (process.env.NODE_ENV !== "production") {
  global.relicPool = pool;
}

export async function query<T extends Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows as T[];
}

export async function queryOne<T extends Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export function vectorLiteral(values: number[]): string {
  return `[${values.map((n) => (Number.isFinite(n) ? n.toFixed(6) : "0")).join(",")}]`;
}
