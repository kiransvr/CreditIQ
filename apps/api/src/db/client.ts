import { Pool } from "pg";

import { env } from "../config/env.js";

let pool: Pool | null = null;

export function hasDatabaseConfig(): boolean {
  return env.databaseUrl.trim().length > 0;
}

export function getDbPool(): Pool {
  if (!hasDatabaseConfig()) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (!pool) {
    pool = new Pool({
      connectionString: env.databaseUrl,
      max: 10
    });
  }

  return pool;
}

export async function closeDbPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
