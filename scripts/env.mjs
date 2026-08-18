import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

export function loadEnv() {
  const file = path.join(process.cwd(), ".env");
  if (!existsSync(file)) return;
  for (const raw of readFileSync(file, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

export function poolConfig(connectionString) {
  const disable = /sslmode=disable/i.test(connectionString);
  return {
    connectionString,
    ssl: disable ? false : { rejectUnauthorized: true },
    max: 8,
  };
}
