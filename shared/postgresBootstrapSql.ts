/**
 * DDL idempotente para Postgres (Supabase), alinhado a `drizzle/schema.ts`.
 * Usado por `npm run db:apply` e, em dev, pelo bootstrap automático em `server/db.ts`.
 */
export const POSTGRES_BOOTSTRAP_STATEMENTS: string[] = [
  `DO $$ BEGIN
    CREATE TYPE "role" AS ENUM ('user', 'admin', 'developer');
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;`,
  `DO $$ BEGIN
    ALTER TYPE "role" ADD VALUE IF NOT EXISTS 'tst';
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;`,
  `DO $$ BEGIN
    CREATE TYPE "grauRisco" AS ENUM ('baixo', 'medio', 'alto', 'critico');
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;`,
  `DO $$ BEGIN
    CREATE TYPE "status" AS ENUM ('pendente', 'assinada', 'concluida');
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;`,
  `CREATE TABLE IF NOT EXISTS "users" (
    "id" serial PRIMARY KEY NOT NULL,
    "openId" varchar(64) NOT NULL,
    "name" text,
    "email" varchar(320),
    "loginMethod" varchar(64),
    "role" "role" DEFAULT 'user'::"role" NOT NULL,
    "matricula" varchar(50),
    "setor" varchar(100),
    "gestorImediato" varchar(100),
    "senhaDigitos" varchar(4),
    "ativo" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp DEFAULT now() NOT NULL,
    "updatedAt" timestamp DEFAULT now() NOT NULL,
    "lastSignedIn" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "users_openId_unique" UNIQUE ("openId"),
    CONSTRAINT "users_matricula_unique" UNIQUE ("matricula")
  );`,
  // Migração: public.users já existente (ex.: projeto Supabase) sem colunas SAFECHECK — IF NOT EXISTS não roda no CREATE acima
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "matricula" varchar(50);`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "setor" varchar(100);`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "gestorImediato" varchar(100);`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "senhaDigitos" varchar(4);`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "ativo" boolean DEFAULT true NOT NULL;`,
  `DO $$ BEGIN
    IF EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'users_role_check'
        AND conrelid = 'users'::regclass
    ) THEN
      ALTER TABLE "users" DROP CONSTRAINT "users_role_check";
    END IF;
  END $$;`,
  `DO $$ BEGIN
    ALTER TABLE "users"
      ADD CONSTRAINT "users_role_check"
      CHECK ("role" IN ('user', 'admin', 'developer', 'tst'));
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;`,
  `DO $$ BEGIN
    ALTER TABLE "users" ADD CONSTRAINT "users_matricula_unique" UNIQUE ("matricula");
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN duplicate_table THEN NULL;
  END $$;`,
  `CREATE TABLE IF NOT EXISTS "setores" (
    "id" serial PRIMARY KEY NOT NULL,
    "nome" varchar(100) NOT NULL,
    "descricao" text,
    "ativo" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp DEFAULT now() NOT NULL,
    "updatedAt" timestamp DEFAULT now() NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS "epis" (
    "id" serial PRIMARY KEY NOT NULL,
    "nome" varchar(100) NOT NULL,
    "descricao" text,
    "ativo" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp DEFAULT now() NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS "epcs" (
    "id" serial PRIMARY KEY NOT NULL,
    "nome" varchar(100) NOT NULL,
    "descricao" text,
    "ativo" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp DEFAULT now() NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS "tipos_tarefa" (
    "id" serial PRIMARY KEY NOT NULL,
    "nome" varchar(100) NOT NULL,
    "descricao" text,
    "grauRisco" "grauRisco" NOT NULL,
    "riscos" jsonb,
    "epiIds" jsonb,
    "epcIds" jsonb,
    "formularioSchema" jsonb,
    "ativo" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp DEFAULT now() NOT NULL,
    "updatedAt" timestamp DEFAULT now() NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS "checkins" (
    "id" serial PRIMARY KEY NOT NULL,
    "usuarioId" integer NOT NULL,
    "setorId" integer NOT NULL,
    "tipoTarefaId" integer NOT NULL,
    "epiValidado" boolean DEFAULT false NOT NULL,
    "ambienteValidado" boolean DEFAULT false NOT NULL,
    "assinaturaPendente" boolean DEFAULT true NOT NULL,
    "observacoes" text,
    "assinaturaPNG" text,
    "createdAt" timestamp DEFAULT now() NOT NULL,
    "updatedAt" timestamp DEFAULT now() NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS "ordens_servico" (
    "id" serial PRIMARY KEY NOT NULL,
    "checkinId" integer NOT NULL,
    "usuarioId" integer NOT NULL,
    "tipoTarefaId" integer NOT NULL,
    "status" "status" DEFAULT 'pendente'::"status" NOT NULL,
    "numero" varchar(50) NOT NULL,
    "descricao" text,
    "formularioRespostas" jsonb,
    "assinaturaPNG" text,
    "dataAssinatura" timestamp,
    "urlPDF" text,
    "urlPNG" text,
    "createdAt" timestamp DEFAULT now() NOT NULL,
    "updatedAt" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "ordens_servico_numero_unique" UNIQUE ("numero")
  );`,
  `CREATE TABLE IF NOT EXISTS "validacoes_epi" (
    "id" serial PRIMARY KEY NOT NULL,
    "checkinId" integer NOT NULL,
    "epiId" integer NOT NULL,
    "validado" boolean DEFAULT false NOT NULL,
    "observacoes" text,
    "createdAt" timestamp DEFAULT now() NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS "validacoes_ambiente" (
    "id" serial PRIMARY KEY NOT NULL,
    "checkinId" integer NOT NULL,
    "condicao" varchar(100) NOT NULL,
    "valor" varchar(100) NOT NULL,
    "dentro_parametros" boolean DEFAULT true NOT NULL,
    "observacoes" text,
    "createdAt" timestamp DEFAULT now() NOT NULL
  );`,
];
