import { readFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";
import { loadEnv, poolConfig } from "./env.mjs";

loadEnv();

const base =
  process.env.DATABASE_URL ||
  "postgresql://root@127.0.0.1:26257/relic?sslmode=disable";

function withDb(url, db) {
  const u = new URL(url.replace(/^postgresql:/, "http:"));
  u.pathname = `/${db}`;
  return u.toString().replace(/^http:/, "postgresql:");
}

async function tryQuery(pool, sql) {
  try {
    await pool.query(sql);
    return true;
  } catch (err) {
    console.warn("skip:", sql.split("\n")[0], "→", err.message);
    return false;
  }
}

async function main() {
  const bootstrap = new Pool(poolConfig(withDb(base, "defaultdb")));
  await tryQuery(
    bootstrap,
    "SET CLUSTER SETTING feature.vector_index.enabled = true",
  );
  const created = await tryQuery(
    bootstrap,
    "CREATE DATABASE IF NOT EXISTS relic",
  );
  await bootstrap.end();

  const dbName = created ? "relic" : "defaultdb";
  if (!created) {
    console.warn("using defaultdb (could not CREATE DATABASE relic)");
  }

  const sql = await readFile(path.join(process.cwd(), "sql/schema.sql"), "utf8");
  const pool = new Pool(poolConfig(withDb(base, dbName)));
  const statements = sql
    .split(/;\s*\n/)
    .map((s) =>
      s
        .replace(/^--.*$/gm, "")
        .replace(/CREATE DATABASE IF NOT EXISTS relic;?/gi, "")
        .replace(/USE relic;?/gi, "")
        .trim(),
    )
    .filter(Boolean);
  for (const statement of statements) {
    const q = statement.endsWith(";") ? statement : `${statement};`;
    try {
      await pool.query(q);
    } catch (err) {
      if (/already exists/i.test(err.message)) continue;
      throw err;
    }
  }
  const check = await pool.query("SELECT current_database() AS db, count(*)::int AS memories FROM memories");
  console.log("schema ready", check.rows[0]);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
