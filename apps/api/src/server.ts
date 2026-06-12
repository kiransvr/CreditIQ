import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { hasDatabaseConfig } from "./db/client.js";
import { ensureDatabaseSchema } from "./db/migrate.js";
import { assertModelIntegrityOrThrow } from "./services/modelIntegrity.js";

async function startServer() {
  assertModelIntegrityOrThrow();
  await ensureDatabaseSchema();

  const app = createApp();
  app.listen(env.port, () => {
    // Startup log is intentionally concise for local and CI runs.
    const persistence = hasDatabaseConfig() ? "postgres" : "in-memory";
    console.log(`CreditIQ API listening on port ${env.port} (${persistence} persistence)`);
  });
}

void startServer().catch((error: unknown) => {
  console.error("Failed to start CreditIQ API", error);
  process.exitCode = 1;
});
