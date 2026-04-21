import { ensureDatabaseUrlLoaded } from "./_core/loadEnv";
import { eq, desc, gte, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { 
  InsertUser, 
  users,
  setores,
  tiposTarefa,
  checkins,
  ordensServico,
  epis,
  epcs,
  validacoesEPI,
  validacoesAmbiente
} from "../drizzle/schema";
import { ENV } from './_core/env';
import { POSTGRES_BOOTSTRAP_STATEMENTS } from "@shared/postgresBootstrapSql";

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: Pool | null = null;
let _bootstrapPromise: Promise<void> | null = null;
let _bootstrapDone = false;

function shouldAutoApplyPostgresSchema(): boolean {
  if (process.env.NODE_ENV === "development") {
    return process.env.DATABASE_AUTO_APPLY_SCHEMA !== "false";
  }
  return process.env.DATABASE_AUTO_APPLY_SCHEMA === "true";
}

async function ensurePostgresBootstrap(pool: Pool): Promise<void> {
  if (_bootstrapDone || !shouldAutoApplyPostgresSchema()) return;
  if (!_bootstrapPromise) {
    _bootstrapPromise = (async () => {
      for (const sql of POSTGRES_BOOTSTRAP_STATEMENTS) {
        await pool.query(sql);
      }
      _bootstrapDone = true;
      if (process.env.NODE_ENV === "development") {
        console.log("[Database] Postgres bootstrap (CREATE IF NOT EXISTS) concluído.");
      }
    })().finally(() => {
      _bootstrapPromise = null;
    });
  }
  await _bootstrapPromise;
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  ensureDatabaseUrlLoaded();

  const url = process.env.DATABASE_URL?.trim();
  if (!_db && url) {
    try {
      _pool = new Pool({
        connectionString: url,
        ssl: { rejectUnauthorized: false },
      });
      try {
        await ensurePostgresBootstrap(_pool);
      } catch (bootstrapErr) {
        console.error(
          "[Database] Bootstrap DDL falhou (pool mantido; rode `npm run db:apply` se faltar tabela):",
          bootstrapErr,
        );
      }
      _db = drizzle(_pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
      _pool = null;
    }
  } else if (!_db && !url) {
    console.warn(
      "[Database] DATABASE_URL não definida — cadastro/login vão falhar até configurar o .env.",
    );
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod", "matricula", "setor", "gestorImediato", "senhaDigitos"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (user.ativo !== undefined) {
      values.ativo = user.ativo;
      updateSet.ativo = user.ativo;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByUsername(username: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.name, username)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getAllAdmins() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get admins: database not available");
    return [];
  }

  return await db.select().from(users).where(eq(users.role, "admin"));
}

export async function getAllSetores() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get setores: database not available");
    return [];
  }

  return await db.select().from(setores).where(eq(setores.ativo, true));
}

export async function getTiposTarefa() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get tipos tarefa: database not available");
    return [];
  }

  return await db.select().from(tiposTarefa).where(eq(tiposTarefa.ativo, true));
}

export async function getTipoTarefaById(id: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get tipo tarefa: database not available");
    return undefined;
  }

  const result = await db.select().from(tiposTarefa).where(eq(tiposTarefa.id, id)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getCheckinsToday(usuarioId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get checkins: database not available");
    return [];
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return await db.select().from(checkins).where(
    and(
      eq(checkins.usuarioId, usuarioId),
      gte(checkins.createdAt, today)
    )
  );
}

export async function getCheckinsLast5Days() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get checkins: database not available");
    return [];
  }

  const fiveDaysAgo = new Date();
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

  return await db.select().from(checkins).where(
    gte(checkins.createdAt, fiveDaysAgo)
  ).orderBy(desc(checkins.createdAt));
}

export async function getOrdensServicoPendentes() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get ordens servico: database not available");
    return [];
  }

  return await db.select().from(ordensServico).where(
    eq(ordensServico.status, "pendente")
  ).orderBy(desc(ordensServico.createdAt));
}

export async function getOrdensServicoAssinadas() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get ordens servico: database not available");
    return [];
  }

  return await db.select().from(ordensServico).where(
    eq(ordensServico.status, "assinada")
  ).orderBy(desc(ordensServico.createdAt));
}

export async function getEPIs() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get EPIs: database not available");
    return [];
  }

  return await db.select().from(epis).where(eq(epis.ativo, true));
}

export async function getEPCs() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get EPCs: database not available");
    return [];
  }

  return await db.select().from(epcs).where(eq(epcs.ativo, true));
}

export async function getCheckInById(id: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get checkin: database not available");
    return undefined;
  }

  const result = await db.select().from(checkins).where(eq(checkins.id, id)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getOrdemServicoById(id: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get ordem servico: database not available");
    return undefined;
  }

  const result = await db.select().from(ordensServico).where(eq(ordensServico.id, id)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}
