import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { hasDatabaseConfig } from "./db/client.js";

const app = createApp();

app.listen(env.port, () => {
  // Startup log is intentionally concise for local and CI runs.
  const persistence = hasDatabaseConfig() ? "postgres" : "in-memory";
  console.log(`CreditIQ API listening on port ${env.port} (${persistence} persistence)`);
});
