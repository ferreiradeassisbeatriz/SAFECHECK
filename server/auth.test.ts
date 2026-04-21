import { describe, it, expect, beforeEach, beforeAll, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";

/** Sufixo único por execução do arquivo (evita colisão com dados antigos no Postgres). */
const runId = `${Date.now()}-${process.pid}`;

// Mock do contexto
function createMockContext(): TrpcContext {
  const cookies: Record<string, string> = {};

  return {
    user: null,
    supabase: null,
    req: {
      protocol: "https",
      headers: {},
      cookies,
    } as any,
    res: {
      cookie: (name: string, value: string, options?: any) => {
        cookies[name] = value;
      },
      clearCookie: (name: string) => {
        delete cookies[name];
      },
    } as any,
  };
}

describe("auth router", () => {
  describe("registrarOperario", () => {
    it("deve registrar um novo operário com dados válidos", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.registrarOperario({
        nomeCompleto: "João Silva Santos",
        matricula: `EMP-R1-${runId}`,
        email: `joao-r1-${runId}@example.com`,
        setor: "Fundação",
        gestorImediato: "Carlos Técnico",
        senhaDigitos: "1234"
      });

      expect(result.success).toBe(true);
      expect(result.username).toBe("joão.santos");
      expect(result.message).toContain("sucesso");
    });

    it("deve rejeitar matrícula duplicada", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      // Primeiro registro
      const matDup = `EMP-D2-${runId}`;
      await caller.auth.registrarOperario({
        nomeCompleto: "João Silva",
        matricula: matDup,
        email: `joao2-${runId}@example.com`,
        setor: "Fundação",
        gestorImediato: "Carlos",
        senhaDigitos: "1234"
      });

      // Segundo registro com mesma matrícula
      try {
        await caller.auth.registrarOperario({
          nomeCompleto: "Maria Santos",
          matricula: matDup,
          email: `maria-${runId}@example.com`,
          setor: "Estrutura",
          gestorImediato: "Carlos",
          senhaDigitos: "5678"
        });
        expect.fail("Deveria ter lançado erro");
      } catch (err: any) {
        expect(err.message).toContain("Matrícula já cadastrada");
      }
    });

    it("deve rejeitar email duplicado", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      // Primeiro registro
      const emailDup = `joao3-${runId}@example.com`;
      await caller.auth.registrarOperario({
        nomeCompleto: "João Silva",
        matricula: `EMP-E3-${runId}`,
        email: emailDup,
        setor: "Fundação",
        gestorImediato: "Carlos",
        senhaDigitos: "1234"
      });

      // Segundo registro com mesmo email
      try {
        await caller.auth.registrarOperario({
          nomeCompleto: "Maria Santos",
          matricula: `EMP-E4-${runId}`,
          email: emailDup,
          setor: "Estrutura",
          gestorImediato: "Carlos",
          senhaDigitos: "5678"
        });
        expect.fail("Deveria ter lançado erro");
      } catch (err: any) {
        expect(err.message).toContain("Email já cadastrado");
      }
    });

    it("deve rejeitar senha inválida (não 4 dígitos)", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.auth.registrarOperario({
          nomeCompleto: "João Silva",
          matricula: `EMP-R5-${runId}`,
          email: `joao5-${runId}@example.com`,
          setor: "Fundação",
          gestorImediato: "Carlos",
          senhaDigitos: "12345" // 5 dígitos
        });
        expect.fail("Deveria ter lançado erro");
      } catch (err: any) {
        expect(err.message).toContain("4 dígitos");
      }
    });
  });

  describe("loginOperario", () => {
    const loginMatricula = `EMP-L-${runId}`;
    const loginEmail = `pedro-l-${runId}@example.com`;

    beforeAll(async () => {
      // Um operário para todos os testes deste bloco (evita matrícula duplicada)
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      await caller.auth.registrarOperario({
        nomeCompleto: "Pedro Costa Silva",
        matricula: loginMatricula,
        email: loginEmail,
        setor: "Estrutura",
        gestorImediato: "Gestor",
        senhaDigitos: "9876"
      });
    });

    it("deve fazer login com credenciais válidas", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.loginOperario({
        username: "pedro.silva",
        senhaDigitos: "9876"
      });

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user.name).toBe("Pedro Costa Silva");
      expect(result.user.matricula).toBe(loginMatricula);
    });

    it("deve fazer login usando a matrícula", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.loginOperario({
        username: loginMatricula,
        senhaDigitos: "9876"
      });

      expect(result.success).toBe(true);
      expect(result.user?.matricula).toBe(loginMatricula);
    });

    it("deve fazer login usando o e-mail", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.loginOperario({
        username: loginEmail,
        senhaDigitos: "9876"
      });

      expect(result.success).toBe(true);
      expect(result.user?.email).toBe(loginEmail);
    });

    it("deve rejeitar username inválido", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.auth.loginOperario({
          username: "usuario.inexistente",
          senhaDigitos: "9876"
        });
        expect.fail("Deveria ter lançado erro");
      } catch (err: any) {
        expect(err.message).toContain("não encontrado");
      }
    });

    it("deve rejeitar senha incorreta", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.auth.loginOperario({
          username: "pedro.silva",
          senhaDigitos: "1111"
        });
        expect.fail("Deveria ter lançado erro");
      } catch (err: any) {
        expect(err.message).toContain("Senha incorreta");
      }
    });
  });

  describe("loginDeveloper", () => {
    it("deve fazer login com credenciais de developer válidas", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.loginDeveloper({
        email: "beaatrizfas@gmail.com",
        senha: "2407"
      });

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user.role).toBe("developer");
      expect(result.user.name).toBe("Beatriz Assis");
    });

    it("deve rejeitar email incorreto", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.auth.loginDeveloper({
          email: "outro@example.com",
          senha: "2407"
        });
        expect.fail("Deveria ter lançado erro");
      } catch (err: any) {
        expect(err.message).toContain("inválidas");
      }
    });

    it("deve rejeitar senha incorreta", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.auth.loginDeveloper({
          email: "beaatrizfas@gmail.com",
          senha: "1234"
        });
        expect.fail("Deveria ter lançado erro");
      } catch (err: any) {
        expect(err.message).toContain("inválidas");
      }
    });
  });

  describe("logout", () => {
    it("deve fazer logout e limpar cookie", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.logout();

      expect(result.success).toBe(true);
    });
  });
});
