import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";
import { POSTGRES_BOOTSTRAP_STATEMENTS } from "../shared/postgresBootstrapSql";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(repoRoot, ".env") });
if (fs.existsSync(path.join(repoRoot, ".env.local"))) {
  dotenv.config({ path: path.join(repoRoot, ".env.local"), override: true });
}

function printConnectionHints(err: unknown): void {
  const code = err && typeof err === "object" && "code" in err ? String((err as { code: unknown }).code) : "";
  if (code !== "ENOTFOUND" && code !== "EAI_AGAIN") return;

  console.error(`
[db:apply] Não foi possível resolver o host do Postgres (DNS).

Causas comuns em rede corporativa / Windows:
  • A URI "direta" (db.<projeto>.supabase.co) costuma depender de IPv6; sem IPv6/DNS adequado o nome pode falhar.
  • Firewall ou DNS interno bloqueia *.supabase.co.

O que fazer:
  1) No Supabase: Project Settings → Database → abra "Connect" e copie a string
     **Session pooler** (host tipo aws-0-…pooler.supabase.com, porta 5432).
  2) Cole em DATABASE_URL no .env (ou .env.local) e rode de novo: npm run db:apply
  3) Opcional: testar DNS público no adaptador (ex.: 8.8.8.8 / 1.1.1.1) ou outra rede (4G).
`);
}

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    console.error(`DATABASE_URL não está definida. Crie ${path.join(repoRoot, ".env")} ou .env.local na raiz do repo.`);
    process.exit(1);
  }

  const client = new pg.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
  } catch (err) {
    printConnectionHints(err);
    throw err;
  }

  try {
    for (const sql of POSTGRES_BOOTSTRAP_STATEMENTS) {
      await client.query(sql);
    }
    console.log("Schema Postgres aplicado com sucesso.");
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
