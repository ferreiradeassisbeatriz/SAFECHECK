import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const envPath = path.join(repoRoot, ".env");
const envLocalPath = path.join(repoRoot, ".env.local");
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.warn(`[loadEnv] Não foi possível ler ${envPath}:`, result.error.message);
}

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath, override: true });
}

if (!process.env.DATABASE_URL?.trim()) {
  console.warn(
    `[loadEnv] DATABASE_URL não definida. Confira ${envPath} na raiz do repositório (variável obrigatória para o API).`,
  );
}

/**
 * Garante `DATABASE_URL` mesmo quando o processo sobe com cwd diferente
 * ou quando o primeiro `dotenv.config` não encontrou o arquivo.
 * Chamado de novo em `getDb()` antes de abrir o pool.
 */
export function ensureDatabaseUrlLoaded(): void {
  if (process.env.DATABASE_URL?.trim()) return;

  const candidates = [
    envPath,
    envLocalPath,
    path.join(process.cwd(), ".env"),
    path.join(process.cwd(), ".env.local"),
    path.join(process.cwd(), "safecheck", ".env"),
    path.join(process.cwd(), "safecheck", ".env.local"),
  ];

  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
    const r = dotenv.config({ path: p, override: true });
    if (!r.error && process.env.DATABASE_URL?.trim()) {
      return;
    }
  }

  if (!process.env.DATABASE_URL?.trim()) {
    console.warn(
      "[loadEnv] DATABASE_URL ainda vazia após tentar .env / .env.local na raiz do repo e no cwd.",
    );
  }
}
