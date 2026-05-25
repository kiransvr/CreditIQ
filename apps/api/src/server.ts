import { createApp } from "./app.js";
import { env } from "./config/env.js";

const app = createApp();

app.listen(env.port, () => {
  // Startup log is intentionally concise for local and CI runs.
  console.log(`CreditIQ API listening on port ${env.port}`);
});
