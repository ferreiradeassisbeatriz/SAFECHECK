import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { authRouter } from "./auth";
import { 
  getUserByOpenId, 
  getAllAdmins, 
  getAllSetores, 
  getTiposTarefa,
  getCheckinsLast5Days,
  getCheckinsHistoricoCompleto,
  getOrdensServicoPendentes,
  getOrdensServicoAssinadas,
  getEPIs,
  getEPCs,
  getCheckinsToday,
  getDb,
  getUserById
} from "./db";
import { users, setores, tiposTarefa, checkins, ordensServico, epis, epcs, validacoesEPI, validacoesAmbiente } from "../drizzle/schema";
import { eq, and, desc, gte, inArray, count, sql } from "drizzle-orm";
import { z } from "zod";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,

  // Operário - Dashboard
  operario: router({
    getSecurityInfo: protectedProcedure.query(async () => {
      return {
        titulo: "Segurança em Primeiro Lugar",
        descricao: "Antes de iniciar qualquer atividade, valide todos os EPIs, condições do ambiente e assine digitalmente.",
        avisos: [
          "Todos os EPIs devem estar em perfeito estado",
          "Ambiente deve estar adequado para a atividade",
          "Assinatura digital é obrigatória"
        ]
      };
    }),

    getTiposTarefa: protectedProcedure.query(async () => {
      return await getTiposTarefa();
    }),

    getTipoTarefaDetalhes: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;

        const tarefa = await db.select().from(tiposTarefa).where(eq(tiposTarefa.id, input.id)).limit(1);
        if (!tarefa.length) return null;

        const task = tarefa[0];
        const epiIds = (task.epiIds as number[]) || [];
        const epcIds = (task.epcIds as number[]) || [];

        const epiList =
          epiIds.length > 0
            ? await db.select().from(epis).where(inArray(epis.id, epiIds))
            : [];

        const epcList =
          epcIds.length > 0
            ? await db.select().from(epcs).where(inArray(epcs.id, epcIds))
            : [];

        return {
          ...task,
          epiList,
          epcList
        };
      }),

    criarCheckin: protectedProcedure
      .input(z.object({
        setorId: z.number().optional(),
        tipoTarefaId: z.number(),
        observacoes: z.string().optional()
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        let setorId = input.setorId;
        if (!setorId) {
          const nomeSetor = ctx.user.setor?.trim() || "Geral";
          const existente = await db
            .select()
            .from(setores)
            .where(eq(setores.nome, nomeSetor))
            .limit(1);
          if (existente.length > 0) {
            setorId = existente[0].id;
          } else {
            const created = await db
              .insert(setores)
              .values({
                nome: nomeSetor,
                descricao: "Setor criado automaticamente durante check-in",
                ativo: true,
              })
              .returning({ id: setores.id });
            setorId = created[0]?.id;
          }
        }
        if (!setorId) throw new Error("Não foi possível determinar o setor do check-in");

        const result = await db.insert(checkins).values({
          usuarioId: ctx.user.id,
          setorId,
          tipoTarefaId: input.tipoTarefaId,
          observacoes: input.observacoes,
          epiValidado: false,
          ambienteValidado: false,
          assinaturaPendente: true
        }).returning({ id: checkins.id });

        return { id: result[0]?.id };
      }),

    validarEPI: protectedProcedure
      .input(z.object({
        checkinId: z.number(),
        epiId: z.number(),
        validado: z.boolean(),
        observacoes: z.string().optional()
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        await db.insert(validacoesEPI).values({
          checkinId: input.checkinId,
          epiId: input.epiId,
          validado: input.validado,
          observacoes: input.observacoes
        });

        return { success: true };
      }),

    validarAmbiente: protectedProcedure
      .input(z.object({
        checkinId: z.number(),
        condicao: z.string().min(1),
        valor: z.string().optional(),
        dentro_parametros: z.boolean(),
        observacoes: z.string().optional()
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        await db.insert(validacoesAmbiente).values({
          checkinId: input.checkinId,
          condicao: input.condicao,
          valor: input.valor ?? (input.dentro_parametros ? "ok" : "nao-conforme"),
          dentro_parametros: input.dentro_parametros,
          observacoes: input.observacoes
        });

        return { success: true };
      }),

    finalizarCheckin: protectedProcedure
      .input(z.object({
        checkinId: z.number(),
        assinaturaPNG: z.string(),
        formularioRespostas: z.record(z.string(), z.any()).optional()
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Atualizar checkin
        await db.update(checkins)
          .set({
            epiValidado: true,
            ambienteValidado: true,
            assinaturaPendente: false,
            assinaturaPNG: input.assinaturaPNG,
            updatedAt: new Date()
          })
          .where(eq(checkins.id, input.checkinId));

        // Criar Ordem de Serviço
        const checkin = await db.select().from(checkins).where(eq(checkins.id, input.checkinId)).limit(1);
        if (!checkin.length) throw new Error("Checkin not found");

        const numero = `OS-${Date.now()}`;
        const dataAssinatura = new Date();
        const result = await db.insert(ordensServico).values({
          checkinId: input.checkinId,
          usuarioId: ctx.user.id,
          tipoTarefaId: checkin[0].tipoTarefaId,
          numero,
          status: "assinada",
          formularioRespostas: input.formularioRespostas || {},
          assinaturaPNG: input.assinaturaPNG,
          dataAssinatura,
        }).returning({ id: ordensServico.id });

        return { 
          success: true, 
          ordemServicoId: result[0]?.id,
          numero
        };
      }),

    getMinhasOrdensServico: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];

      return await db.select().from(ordensServico).where(
        eq(ordensServico.usuarioId, ctx.user.id)
      ).orderBy(desc(ordensServico.createdAt));
    })
  }),

  // Admin - Dashboard
  admin: router({
    getDashboardMetrics: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user?.role !== "admin" && ctx.user?.role !== "developer" && ctx.user?.role !== "tst") {
        throw new Error("Unauthorized");
      }

      const db = await getDb();
      if (!db) return null;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const checkinsHoje = await db.select().from(checkins).where(
        gte(checkins.createdAt, today)
      );

      const totalCheckins = await db.select().from(checkins);

      const osPendentes = await getOrdensServicoPendentes();
      const osAssinadas = await getOrdensServicoAssinadas();

      const setoresAtivos = await db.select().from(setores).where(eq(setores.ativo, true));

      const [totalOsRow] = await db.select({ c: count() }).from(ordensServico);
      const [osConcluidasRow] = await db
        .select({ c: count() })
        .from(ordensServico)
        .where(eq(ordensServico.status, "concluida"));

      return {
        checkinsHoje: checkinsHoje.length,
        totalCheckins: totalCheckins.length,
        osPendentes: osPendentes.length,
        osAssinadas: osAssinadas.length,
        osConcluidas: Number(osConcluidasRow?.c ?? 0),
        totalOrdensServico: Number(totalOsRow?.c ?? 0),
        setoresAtivos: setoresAtivos.length
      };
    }),

    getSetores: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user?.role !== "admin" && ctx.user?.role !== "developer") {
        throw new Error("Unauthorized");
      }

      return await getAllSetores();
    }),

    getTiposTarefa: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user?.role !== "admin" && ctx.user?.role !== "developer") {
        throw new Error("Unauthorized");
      }

      return await getTiposTarefa();
    }),

    /** Catálogo de EPIs e EPCs ativos para cadastro de atividade (TST). */
    getCatalogoEpiEpc: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user?.role !== "tst") {
        throw new Error("Unauthorized");
      }

      const [episList, epcsList] = await Promise.all([getEPIs(), getEPCs()]);
      return { epis: episList, epcs: epcsList };
    }),

    /** Cadastro de tipo de atividade com riscos e vínculos a EPIs/EPCs (apenas TST). */
    cadastrarAtividade: protectedProcedure
      .input(
        z.object({
          nome: z.string().min(1).max(100),
          descricao: z.string().max(4000).optional(),
          grauRisco: z.enum(["baixo", "medio", "alto", "critico"]),
          riscos: z.array(z.string().min(1).max(500)).min(1, "Informe ao menos um risco"),
          epiIds: z.array(z.number().int().positive()).default([]),
          epcIds: z.array(z.number().int().positive()).default([]),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== "tst") {
          throw new Error("Apenas Técnico de Segurança pode cadastrar atividades.");
        }

        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const nomeNorm = input.nome.trim();
        const dup = await db
          .select({ id: tiposTarefa.id })
          .from(tiposTarefa)
          .where(sql`lower(trim(${tiposTarefa.nome})) = ${nomeNorm.toLowerCase()}`)
          .limit(1);

        if (dup.length > 0) {
          throw new Error("Já existe uma atividade com este nome.");
        }

        const epiIds = [...new Set(input.epiIds)];
        const epcIds = [...new Set(input.epcIds)];

        if (epiIds.length > 0) {
          const found = await db.select({ id: epis.id }).from(epis).where(inArray(epis.id, epiIds));
          if (found.length !== epiIds.length) {
            throw new Error("Um ou mais EPIs selecionados são inválidos.");
          }
        }
        if (epcIds.length > 0) {
          const found = await db.select({ id: epcs.id }).from(epcs).where(inArray(epcs.id, epcIds));
          if (found.length !== epcIds.length) {
            throw new Error("Um ou mais EPCs selecionados são inválidos.");
          }
        }

        const now = new Date();
        const inserted = await db
          .insert(tiposTarefa)
          .values({
            nome: nomeNorm,
            descricao: input.descricao?.trim() || null,
            grauRisco: input.grauRisco,
            riscos: input.riscos.map((r) => r.trim()).filter((r) => r.length > 0),
            epiIds,
            epcIds,
            ativo: true,
            updatedAt: now,
          })
          .returning({ id: tiposTarefa.id, nome: tiposTarefa.nome });

        const row = inserted[0];
        if (!row) throw new Error("Falha ao cadastrar atividade.");

        return { success: true, id: row.id, nome: row.nome };
      }),

    /** Cadastro de EPI no catálogo (apenas TST). */
    cadastrarEpi: protectedProcedure
      .input(
        z.object({
          nome: z.string().min(1).max(100),
          descricao: z.string().max(2000).optional(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== "tst") {
          throw new Error("Apenas Técnico de Segurança pode cadastrar EPIs.");
        }

        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const nomeNorm = input.nome.trim();
        const dup = await db
          .select({ id: epis.id })
          .from(epis)
          .where(sql`lower(trim(${epis.nome})) = ${nomeNorm.toLowerCase()}`)
          .limit(1);

        if (dup.length > 0) {
          throw new Error("Já existe um EPI com este nome.");
        }

        const inserted = await db
          .insert(epis)
          .values({
            nome: nomeNorm,
            descricao: input.descricao?.trim() || null,
            ativo: true,
          })
          .returning({ id: epis.id, nome: epis.nome });

        const row = inserted[0];
        if (!row) throw new Error("Falha ao cadastrar EPI.");

        return { id: row.id, nome: row.nome };
      }),

    /** Cadastro de EPC no catálogo (apenas TST). */
    cadastrarEpc: protectedProcedure
      .input(
        z.object({
          nome: z.string().min(1).max(100),
          descricao: z.string().max(2000).optional(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== "tst") {
          throw new Error("Apenas Técnico de Segurança pode cadastrar EPCs.");
        }

        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const nomeNorm = input.nome.trim();
        const dup = await db
          .select({ id: epcs.id })
          .from(epcs)
          .where(sql`lower(trim(${epcs.nome})) = ${nomeNorm.toLowerCase()}`)
          .limit(1);

        if (dup.length > 0) {
          throw new Error("Já existe um EPC com este nome.");
        }

        const inserted = await db
          .insert(epcs)
          .values({
            nome: nomeNorm,
            descricao: input.descricao?.trim() || null,
            ativo: true,
          })
          .returning({ id: epcs.id, nome: epcs.nome });

        const row = inserted[0];
        if (!row) throw new Error("Falha ao cadastrar EPC.");

        return { id: row.id, nome: row.nome };
      }),

    getOrdensServico: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user?.role !== "admin" && ctx.user?.role !== "developer") {
        throw new Error("Unauthorized");
      }

      const pendentes = await getOrdensServicoPendentes();
      const assinadas = await getOrdensServicoAssinadas();

      return {
        pendentes,
        assinadas
      };
    }),

    getHistoricoCheckins: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user?.role !== "admin" && ctx.user?.role !== "developer") {
        throw new Error("Unauthorized");
      }

      return await getCheckinsLast5Days();
    }),

    /** Histórico completo de check-ins (todos os registros), para painel de gestão. */
    getHistoricoCheckinsCompleto: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user?.role !== "admin" && ctx.user?.role !== "developer" && ctx.user?.role !== "tst") {
        throw new Error("Unauthorized");
      }

      return await getCheckinsHistoricoCompleto();
    }),

    getMonitoramentoOS: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user?.role !== "admin" && ctx.user?.role !== "developer" && ctx.user?.role !== "tst") {
        throw new Error("Unauthorized");
      }

      const db = await getDb();
      if (!db) return [];

      const result = await db
        .select({
          id: ordensServico.id,
          numero: ordensServico.numero,
          status: ordensServico.status,
          createdAt: ordensServico.createdAt,
          dataAssinatura: ordensServico.dataAssinatura,
          nomeColaborador: users.name,
          matricula: users.matricula,
          setor: setores.nome,
          nomeTarefa: tiposTarefa.nome,
        })
        .from(ordensServico)
        .leftJoin(users, eq(users.id, ordensServico.usuarioId))
        .leftJoin(checkins, eq(checkins.id, ordensServico.checkinId))
        .leftJoin(setores, eq(setores.id, checkins.setorId))
        .leftJoin(tiposTarefa, eq(tiposTarefa.id, ordensServico.tipoTarefaId))
        .orderBy(desc(ordensServico.createdAt));

      return result;
    }),

    getOsExportPayload: protectedProcedure
      .input(z.object({ osId: z.number() }))
      .query(async ({ input, ctx }) => {
        if (ctx.user?.role !== "admin" && ctx.user?.role !== "developer" && ctx.user?.role !== "tst") {
          throw new Error("Unauthorized");
        }

        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const result = await db
          .select({
            id: ordensServico.id,
            numero: ordensServico.numero,
            status: ordensServico.status,
            createdAt: ordensServico.createdAt,
            dataAssinatura: ordensServico.dataAssinatura,
            descricao: ordensServico.descricao,
            nomeColaborador: users.name,
            matricula: users.matricula,
            setor: setores.nome,
            nomeTarefa: tiposTarefa.nome,
            riscos: tiposTarefa.riscos,
            epiIds: tiposTarefa.epiIds,
            epcIds: tiposTarefa.epcIds,
            checkinId: checkins.id,
          })
          .from(ordensServico)
          .leftJoin(users, eq(users.id, ordensServico.usuarioId))
          .leftJoin(checkins, eq(checkins.id, ordensServico.checkinId))
          .leftJoin(setores, eq(setores.id, checkins.setorId))
          .leftJoin(tiposTarefa, eq(tiposTarefa.id, ordensServico.tipoTarefaId))
          .where(eq(ordensServico.id, input.osId))
          .limit(1);

        if (!result.length) throw new Error("Ordem de Serviço não encontrada");
        const row = result[0];
        const epiIds = Array.isArray(row.epiIds) ? (row.epiIds as number[]) : [];
        const epcIds = Array.isArray(row.epcIds) ? (row.epcIds as number[]) : [];

        const epiList =
          epiIds.length > 0
            ? await db.select().from(epis).where(inArray(epis.id, epiIds))
            : [];
        const epcList =
          epcIds.length > 0
            ? await db.select().from(epcs).where(inArray(epcs.id, epcIds))
            : [];

        const ambienteList = row.checkinId
          ? await db
              .select()
              .from(validacoesAmbiente)
              .where(eq(validacoesAmbiente.checkinId, row.checkinId))
          : [];

        const riscos = Array.isArray(row.riscos)
          ? row.riscos.filter((x): x is string => typeof x === "string")
          : [];
        const assinaturaTstRegex = /Assinatura TST:\s*(.+?)\s*\((.*?)\)\s*em\s*(.+)$/gm;
        let assinaturaTstNome: string | null = null;
        let assinaturaTstEm: string | null = null;
        if (row.descricao) {
          let match: RegExpExecArray | null = assinaturaTstRegex.exec(row.descricao);
          while (match) {
            assinaturaTstNome = match[1]?.trim() || null;
            assinaturaTstEm = match[3]?.trim() || null;
            match = assinaturaTstRegex.exec(row.descricao);
          }
        }

        return {
          numero: row.numero,
          status: row.status,
          createdAt: row.createdAt,
          dataAssinatura: row.dataAssinatura,
          nomeColaborador: row.nomeColaborador,
          matricula: row.matricula,
          setor: row.setor,
          nomeTarefa: row.nomeTarefa,
          riscos,
          epis: epiList.map((e) => e.nome),
          epcs: epcList.map((e) => e.nome),
          assinaturaTstNome,
          assinaturaTstEm,
          validacoesAmbiente: ambienteList.map(
            (a) => `${a.condicao}${a.valor ? ` (${a.valor})` : ""}`,
          ),
        };
      }),
    assinarTecnicoSeguranca: protectedProcedure
      .input(z.object({ osId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== "tst") {
          throw new Error("Apenas Técnico de Segurança pode assinar.");
        }

        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const found = await db
          .select({
            id: ordensServico.id,
            descricao: ordensServico.descricao,
            numero: ordensServico.numero,
          })
          .from(ordensServico)
          .where(eq(ordensServico.id, input.osId))
          .limit(1);

        if (!found.length) throw new Error("Ordem de Serviço não encontrada");

        const assinaturaTs = new Date();
        const assinaturaLinha = `Assinatura TST: ${ctx.user.name ?? "Tecnico de Seguranca"} (${ctx.user.matricula ?? "sem matricula"}) em ${assinaturaTs.toLocaleString("pt-BR")}`;
        const descricaoAtual = found[0].descricao?.trim();
        const jaAssinada = (descricaoAtual ?? "").includes("Assinatura TST:");
        const novaDescricao = jaAssinada
          ? descricaoAtual ?? ""
          : [descricaoAtual, assinaturaLinha].filter(Boolean).join("\n\n");

        await db
          .update(ordensServico)
          .set({
            descricao: novaDescricao,
            status: "concluida",
            updatedAt: assinaturaTs,
          })
          .where(eq(ordensServico.id, input.osId));

        return { success: true, numero: found[0].numero };
      }),
  }),

  // Developer - Gerenciamento de Usuários
  developer: router({
    getAllAdmins: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user?.role !== "developer") {
        throw new Error("Unauthorized");
      }

      return await getAllAdmins();
    }),

    criarAdmin: protectedProcedure
      .input(z.object({
        name: z.string(),
        email: z.string().email(),
        matricula: z.string(),
        setor: z.string(),
        gestorImediato: z.string()
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== "developer") {
          throw new Error("Unauthorized");
        }

        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const inserted = await db
          .insert(users)
          .values({
            openId: `admin-${Date.now()}`,
            name: input.name,
            email: input.email,
            matricula: input.matricula,
            setor: input.setor || null,
            gestorImediato: input.gestorImediato || null,
            role: "admin",
            ativo: true,
            loginMethod: "manual",
            lastSignedIn: new Date(),
          })
          .returning({ id: users.id });

        const row = inserted[0];
        if (!row) throw new Error("Falha ao criar administrador.");

        return { id: row.id };
      }),

    ativarUsuario: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== "developer") {
          throw new Error("Unauthorized");
        }

        const db = await getDb();
        if (!db) throw new Error("Database not available");

        await db
          .update(users)
          .set({ ativo: true, updatedAt: new Date() })
          .where(eq(users.id, input.userId));

        return { success: true };
      }),

    inativarUsuario: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== "developer") {
          throw new Error("Unauthorized");
        }

        const db = await getDb();
        if (!db) throw new Error("Database not available");

        await db.update(users)
          .set({ ativo: false, updatedAt: new Date() })
          .where(eq(users.id, input.userId));

        return { success: true };
      }),

    excluirUsuario: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== "developer") {
          throw new Error("Unauthorized");
        }

        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (input.userId === ctx.user.id) {
          throw new Error("Não é possível excluir seu próprio usuário.");
        }

        const [target] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
        if (!target) throw new Error("Usuário não encontrado.");
        if (target.role === "developer") {
          throw new Error("Não é possível excluir um usuário developer.");
        }

        await db.delete(users).where(eq(users.id, input.userId));

        return { success: true };
      })
  })
});

export type AppRouter = typeof appRouter;
