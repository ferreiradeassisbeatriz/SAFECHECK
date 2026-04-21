import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { formatDatabaseUserMessage } from "./_core/dbErrors";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { users, type User } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { COOKIE_NAME, ONE_YEAR_COOKIE_MAX_AGE_SECONDS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * Gera username no formato primeironome.últimosobrenome
 */
function gerarUsername(nomeCompleto: string): string {
  const partes = nomeCompleto.trim().split(" ");
  if (partes.length < 2) {
    return nomeCompleto.toLowerCase();
  }
  const primeiroNome = partes[0]!.toLowerCase();
  const ultimoSobrenome = partes[partes.length - 1]!.toLowerCase();
  return `${primeiroNome}.${ultimoSobrenome}`;
}

function usuarioMaisRecente(candidatos: User[]): User {
  return candidatos.reduce((a, b) => (a.id >= b.id ? a : b));
}

/** Aceita matrícula, e-mail ou username gerado a partir do nome completo. */
function encontrarOperarioPorLogin(lista: User[], loginInput: string): User | undefined {
  const key = loginInput.trim();
  if (!key) return undefined;
  const keyLower = key.toLowerCase();

  const porMatricula = lista.filter((u) => u.matricula?.trim().toLowerCase() === keyLower);
  if (porMatricula.length) return usuarioMaisRecente(porMatricula);

  const porEmail = lista.filter((u) => u.email?.trim().toLowerCase() === keyLower);
  if (porEmail.length) return usuarioMaisRecente(porEmail);

  const porUsername = lista.filter((u) => u.name && gerarUsername(u.name) === keyLower);
  if (porUsername.length) return usuarioMaisRecente(porUsername);

  return undefined;
}

export const authRouter = router({
  /**
   * Obter usuário autenticado atual
   */
  me: publicProcedure.query(opts => opts.ctx.user),

  /**
   * Logout - limpar cookie de sessão
   */
  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true };
  }),

  /**
   * Registro de novo operário (primeiro acesso)
   */
  registrarOperario: publicProcedure
    .input(z.object({
      nomeCompleto: z.string().min(3),
      matricula: z.string().min(1),
      email: z.string().email(),
      setor: z.string().min(1),
      gestorImediato: z.string().min(1),
      senhaDigitos: z.string().regex(/^\d{4}$/, "Senha deve ter exatamente 4 dígitos")
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "SERVICE_UNAVAILABLE",
          message: "Banco de dados indisponível. Verifique DATABASE_URL no .env.",
        });
      }

      try {
        // Verificar se matrícula já existe
        const existente = await db.select().from(users)
          .where(eq(users.matricula, input.matricula))
          .limit(1);

        if (existente.length > 0) {
          throw new TRPCError({ code: "CONFLICT", message: "Matrícula já cadastrada" });
        }

        // Verificar se email já existe
        const emailExistente = await db.select().from(users)
          .where(eq(users.email, input.email))
          .limit(1);

        if (emailExistente.length > 0) {
          throw new TRPCError({ code: "CONFLICT", message: "Email já cadastrado" });
        }

        // Gerar username
        const username = gerarUsername(input.nomeCompleto);

        // Criar usuário
        const openId = `local-${input.matricula}-${Date.now()}`;
        await db.insert(users).values({
          openId,
          name: input.nomeCompleto,
          email: input.email,
          matricula: input.matricula,
          setor: input.setor,
          gestorImediato: input.gestorImediato,
          senhaDigitos: input.senhaDigitos,
          role: "user",
          ativo: true,
          loginMethod: "local",
          lastSignedIn: new Date()
        });

        return {
          success: true,
          username,
          message: "Cadastro realizado com sucesso. Faça login para continuar."
        };
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        console.error("[auth.registrarOperario]", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: formatDatabaseUserMessage(err),
          cause: err instanceof Error ? err : undefined,
        });
      }
    }),

  /**
   * Login de operário com username e senha de 4 dígitos
   */
  loginOperario: publicProcedure
    .input(z.object({
      username: z.string(),
      senhaDigitos: z.string().regex(/^\d{4}$/, "Senha deve ter exatamente 4 dígitos")
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "SERVICE_UNAVAILABLE",
          message: "Banco de dados indisponível. Verifique DATABASE_URL no .env.",
        });
      }

      let todosUsuarios;
      try {
        todosUsuarios = await db.select().from(users);
      } catch (err) {
        console.error("[auth.loginOperario]", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: formatDatabaseUserMessage(err),
          cause: err instanceof Error ? err : undefined,
        });
      }

      const usuario = encontrarOperarioPorLogin(todosUsuarios, input.username);

      if (!usuario) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Usuário não encontrado",
        });
      }

      // Verificar senha
      if (usuario.senhaDigitos !== input.senhaDigitos) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Senha incorreta",
        });
      }

      // Verificar se usuário está ativo
      if (!usuario.ativo) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Usuário inativo",
        });
      }

      // Criar sessão
      try {
        const sessionToken = await sdk.createSessionToken(usuario.openId, {
          name: usuario.name || "",
          expiresInMs: ONE_YEAR_MS,
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: ONE_YEAR_COOKIE_MAX_AGE_SECONDS,
        });

        // Atualizar lastSignedIn
        await db.update(users)
          .set({ lastSignedIn: new Date() })
          .where(eq(users.id, usuario.id));

        return {
          success: true,
          user: {
            id: usuario.id,
            name: usuario.name,
            email: usuario.email,
            role: usuario.role,
            matricula: usuario.matricula,
            setor: usuario.setor
          }
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[Auth] Failed to create session token:", error);
        const detail = error instanceof Error ? error.message : String(error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            /JWT_SECRET/i.test(detail) || /secret/i.test(detail)
              ? detail
              : `Falha ao criar sessão${detail ? `: ${detail}` : ""}`,
          cause: error instanceof Error ? error : undefined,
        });
      }
    }),

  /**
   * Login do developer (Beatriz Assis)
   */
  loginDeveloper: publicProcedure
    .input(z.object({
      email: z.string().email(),
      senha: z.string()
    }))
    .mutation(async ({ input, ctx }) => {
      // Credenciais fixas do developer
      const DEVELOPER_EMAIL = "beaatrizfas@gmail.com";
      const DEVELOPER_SENHA = "2407";

      if (input.email !== DEVELOPER_EMAIL || input.senha !== DEVELOPER_SENHA) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Credenciais de developer inválidas",
        });
      }

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "SERVICE_UNAVAILABLE",
          message: "Banco de dados indisponível. Verifique DATABASE_URL no .env.",
        });
      }

      let developer;
      try {
        developer = await db.select().from(users)
          .where(eq(users.email, DEVELOPER_EMAIL))
          .limit(1);

        if (!developer.length) {
          const openId = `developer-beatriz-${Date.now()}`;
          await db.insert(users).values({
            openId,
            name: "Beatriz Assis",
            email: DEVELOPER_EMAIL,
            matricula: "DEV-001",
            role: "developer",
            ativo: true,
            loginMethod: "developer",
            lastSignedIn: new Date()
          });

          developer = await db.select().from(users)
            .where(eq(users.email, DEVELOPER_EMAIL))
            .limit(1);
        }
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        console.error("[auth.loginDeveloper]", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: formatDatabaseUserMessage(err),
          cause: err instanceof Error ? err : undefined,
        });
      }

      if (!developer.length) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Falha ao criar/recuperar usuário developer",
        });
      }

      const developerUser = developer[0];

      // Criar sessão
      try {
        const sessionToken = await sdk.createSessionToken(developerUser.openId, {
          name: developerUser.name || "",
          expiresInMs: ONE_YEAR_MS,
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: ONE_YEAR_COOKIE_MAX_AGE_SECONDS,
        });

        // Atualizar lastSignedIn
        await db.update(users)
          .set({ lastSignedIn: new Date() })
          .where(eq(users.id, developerUser.id));

        return {
          success: true,
          user: {
            id: developerUser.id,
            name: developerUser.name,
            email: developerUser.email,
            role: developerUser.role
          }
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[Auth] Failed to create session token:", error);
        const detail = error instanceof Error ? error.message : String(error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            /JWT_SECRET/i.test(detail) || /secret/i.test(detail)
              ? detail
              : `Falha ao criar sessão${detail ? `: ${detail}` : ""}`,
          cause: error instanceof Error ? error : undefined,
        });
      }
    })
});
