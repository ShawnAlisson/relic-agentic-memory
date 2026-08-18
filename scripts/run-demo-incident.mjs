import { writeFile } from "node:fs/promises";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { loadEnv, poolConfig } from "./env.mjs";

loadEnv();

const TENANT = "11111111-1111-1111-1111-111111111111";
const AGENT = "22222222-2222-2222-2222-222222222222";

const pool = new Pool(
  poolConfig(
    process.env.DATABASE_URL ||
      "postgresql://root@127.0.0.1:26257/relic?sslmode=disable",
  ),
);

async function main() {
  const id = randomUUID();
  await pool.query(
    `INSERT INTO episodes (id, tenant_id, agent_id, title, service, severity, status, region, payload)
     VALUES ($1,$2,$3,$4,'checkout-api','sev1','open','eu-west-1',$5::JSONB)`,
    [
      id,
      TENANT,
      AGENT,
      "Checkout p99 4.2s in eu-west-1 after canary 2026.08.18",
      JSON.stringify({ p99_ms: 4200, canary: "2026.08.18-rc.4" }),
    ],
  );
  await writeFile(
    "demo/last-episode.json",
    JSON.stringify({ episodeId: id }, null, 2),
  );
  console.log(id);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
