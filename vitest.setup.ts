import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
dotenv.config({ path: path.join(root, ".env") });
const envLocal = path.join(root, ".env.local");
if (fs.existsSync(envLocal)) {
  dotenv.config({ path: envLocal, override: true });
}

if (!process.env.JWT_SECRET?.trim()) {
  process.env.JWT_SECRET = "vitest-jwt-secret-at-least-32-characters!";
}
