import { boolean, integer, jsonb, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

const roleEnum = pgEnum("role", ["user", "admin", "developer", "tst"]);
const grauRiscoEnum = pgEnum("grauRisco", ["baixo", "medio", "alto", "critico"]);
const statusOrdemServicoEnum = pgEnum("status", ["pendente", "assinada", "concluida"]);

/**
 * Core user table backing auth flow.
 * Extended with SAFECHECK-specific fields for operário, admin, and developer roles.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  
  // SAFECHECK-specific fields
  matricula: varchar("matricula", { length: 50 }).unique(),
  setor: varchar("setor", { length: 100 }),
  gestorImediato: varchar("gestorImediato", { length: 100 }),
  senhaDigitos: varchar("senhaDigitos", { length: 4 }), // Senha de 4 dígitos para operário
  ativo: boolean("ativo").default(true).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Setores da obra
 */
export const setores = pgTable("setores", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 100 }).notNull(),
  descricao: text("descricao"),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Setor = typeof setores.$inferSelect;
export type InsertSetor = typeof setores.$inferInsert;

/**
 * EPIs (Equipamentos de Proteção Individual)
 */
export const epis = pgTable("epis", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 100 }).notNull(),
  descricao: text("descricao"),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EPI = typeof epis.$inferSelect;
export type InsertEPI = typeof epis.$inferInsert;

/**
 * EPCs (Equipamentos de Proteção Coletiva)
 */
export const epcs = pgTable("epcs", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 100 }).notNull(),
  descricao: text("descricao"),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EPC = typeof epcs.$inferSelect;
export type InsertEPC = typeof epcs.$inferInsert;

/**
 * Tipos de tarefa com riscos e requisitos de EPIs/EPCs
 */
export const tiposTarefa = pgTable("tipos_tarefa", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 100 }).notNull(),
  descricao: text("descricao"),
  grauRisco: grauRiscoEnum("grauRisco").notNull(),
  riscos: jsonb("riscos"), // Array de strings com descrição dos riscos
  epiIds: jsonb("epiIds"), // Array de IDs de EPIs necessários
  epcIds: jsonb("epcIds"), // Array de IDs de EPCs necessários
  formularioSchema: jsonb("formularioSchema"), // Schema JSON para formulário dinâmico
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type TipoTarefa = typeof tiposTarefa.$inferSelect;
export type InsertTipoTarefa = typeof tiposTarefa.$inferInsert;

/**
 * Check-ins de segurança
 */
export const checkins = pgTable("checkins", {
  id: serial("id").primaryKey(),
  usuarioId: integer("usuarioId").notNull(),
  setorId: integer("setorId").notNull(),
  tipoTarefaId: integer("tipoTarefaId").notNull(),
  
  // Validações
  epiValidado: boolean("epiValidado").default(false).notNull(),
  ambienteValidado: boolean("ambienteValidado").default(false).notNull(),
  assinaturaPendente: boolean("assinaturaPendente").default(true).notNull(),
  
  // Dados do check-in
  observacoes: text("observacoes"),
  assinaturaPNG: text("assinaturaPNG"), // URL ou base64 da assinatura
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type CheckIn = typeof checkins.$inferSelect;
export type InsertCheckIn = typeof checkins.$inferInsert;

/**
 * Ordens de Serviço
 */
export const ordensServico = pgTable("ordens_servico", {
  id: serial("id").primaryKey(),
  checkinId: integer("checkinId").notNull(),
  usuarioId: integer("usuarioId").notNull(),
  tipoTarefaId: integer("tipoTarefaId").notNull(),
  
  // Status
  status: statusOrdemServicoEnum("status").default("pendente").notNull(),
  
  // Dados da OS
  numero: varchar("numero", { length: 50 }).unique().notNull(),
  descricao: text("descricao"),
  formularioRespostas: jsonb("formularioRespostas"), // Respostas do formulário dinâmico
  
  // Assinatura
  assinaturaPNG: text("assinaturaPNG"), // URL ou base64 da assinatura
  dataAssinatura: timestamp("dataAssinatura"),
  
  // Exportação
  urlPDF: text("urlPDF"),
  urlPNG: text("urlPNG"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type OrdemServico = typeof ordensServico.$inferSelect;
export type InsertOrdemServico = typeof ordensServico.$inferInsert;

/**
 * Histórico de validações de EPIs
 */
export const validacoesEPI = pgTable("validacoes_epi", {
  id: serial("id").primaryKey(),
  checkinId: integer("checkinId").notNull(),
  epiId: integer("epiId").notNull(),
  validado: boolean("validado").default(false).notNull(),
  observacoes: text("observacoes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ValidacaoEPI = typeof validacoesEPI.$inferSelect;
export type InsertValidacaoEPI = typeof validacoesEPI.$inferInsert;

/**
 * Histórico de validações do ambiente
 */
export const validacoesAmbiente = pgTable("validacoes_ambiente", {
  id: serial("id").primaryKey(),
  checkinId: integer("checkinId").notNull(),
  condicao: varchar("condicao", { length: 100 }).notNull(), // ex: "Temperatura", "Umidade", "Iluminação"
  valor: varchar("valor", { length: 100 }).notNull(),
  dentro_parametros: boolean("dentro_parametros").default(true).notNull(),
  observacoes: text("observacoes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ValidacaoAmbiente = typeof validacoesAmbiente.$inferSelect;
export type InsertValidacaoAmbiente = typeof validacoesAmbiente.$inferInsert;
