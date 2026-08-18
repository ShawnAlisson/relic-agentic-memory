import { Pool } from "pg";
import { readFile } from "node:fs/promises";
import path from "node:path";

const base =
  process.env.DATABASE_URL ||
  "postgresql://root@127.0.0.1:26257/relic?sslmode=disable";

function withDb(url, db) {
  const u = new URL(url);
  u.pathname = `/${db}`;
  return u.toString();
}

async function main() {
  const bootstrap = new Pool({ connectionString: withDb(base, "defaultdb") });
  await bootstrap.query("SET CLUSTER SETTING feature.vector_index.enabled = true");
  await bootstrap.query("CREATE DATABASE IF NOT EXISTS relic");
  await bootstrap.end();

  const sql = await readFile(path.join(process.cwd(), "sql/schema.sql"), "utf8");
  const pool = new Pool({ connectionString: withDb(base, "relic") });
  const statements = sql
    .split(/;\s*\n/)
    .map((s) =>
      s
        .replace(/^CREATE DATABASE IF NOT EXISTS relic;?/i, "")
        .replace(/^USE relic;?/i, "")
        .trim(),
    )
    .filter(Boolean);
  for (const statement of statements) {
    await pool.query(statement.endsWith(";") ? statement : `${statement};`);
  }
  console.log("schema applied to relic");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
