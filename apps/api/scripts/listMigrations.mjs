import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const migrationsDir = path.resolve(currentDir, "../db/migrations");

const files = await readdir(migrationsDir);
const sqlFiles = files.filter((file) => file.endsWith(".sql")).sort();

if (sqlFiles.length === 0) {
  console.log("No SQL migrations found.");
  process.exit(0);
}

console.log("Available migrations:");
for (const file of sqlFiles) {
  console.log(`- ${file}`);
}
