import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getDbPool, hasDatabaseConfig } from "./client.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(currentDir, "../../db/migrations");

export async function ensureDatabaseSchema(): Promise<void> {
  if (!hasDatabaseConfig()) {
    return;
  }

  const pool = getDbPool();
  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort((left, right) => left.localeCompare(right));

  for (const file of files) {
    const sql = await readFile(path.join(migrationsDir, file), "utf8");
    if (sql.trim().length === 0) {
      continue;
    }

    await pool.query(sql);
  }
}
