/**
 * Cadastra 15 tipos de tarefa (obra civil) com riscos, EPIs e EPCs.
 * Idempotente: cria EPI/EPC por nome se não existir; insere ou atualiza tipo pelo nome.
 *
 * Uso: npm run db:seed:atividades
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(repoRoot, ".env") });
if (fs.existsSync(path.join(repoRoot, ".env.local"))) {
  dotenv.config({ path: path.join(repoRoot, ".env.local"), override: true });
}

type GrauRisco = "baixo" | "medio" | "alto" | "critico";

type AtividadeSeed = {
  nome: string;
  descricao: string;
  grauRisco: GrauRisco;
  riscos: string[];
  epis: string[];
  epcs: string[];
};

const ATIVIDADES: AtividadeSeed[] = [
  {
    nome: "Mobilização do canteiro / limpeza do terreno",
    descricao: "Organização do canteiro, limpeza e preparação do terreno.",
    grauRisco: "medio",
    riscos: [
      "Poeira",
      "Perfurocortantes",
      "Atropelamento",
      "Animais e vegetação",
      "Ruído",
      "Projeções",
    ],
    epis: [
      "Capacete de segurança",
      "Óculos de proteção",
      "Luvas raspa ou nitrílica (conforme tarefa)",
      "Botina com biqueira e solado antiderrapante",
      "Máscara PFF2 (poeira)",
      "Protetor auricular (ruído elevado)",
      "Perneira (vegetação cortante)",
    ],
    epcs: [
      "Isolamento e sinalização da área",
      "Controle de poeira (umectação)",
      "Iluminação provisória adequada",
      "Rota de pedestres demarcada",
      "Caçamba ou área de resíduos",
      "Extintores e kit de primeiros socorros",
    ],
  },
  {
    nome: "Escavações, valas e fundações (sapatas, blocos, tubulões)",
    descricao: "Escavação, valas, fundações e estruturas de apoio.",
    grauRisco: "alto",
    riscos: [
      "Soterramento",
      "Queda em vala",
      "Choque com tubulações",
      "Atmosfera perigosa",
      "Máquinas em operação",
    ],
    epis: [
      "Capacete de segurança",
      "Óculos de proteção",
      "Luvas",
      "Botina com biqueira e solado antiderrapante",
      "Colete refletivo",
      "Protetor auricular",
      "Máscara PFF2 (poeira)",
      "Cinto paraquedista (queda em borda)",
    ],
    epcs: [
      "Escoramento e taludamento",
      "Guarda-corpo ou isolamento no perímetro",
      "Escadas de acesso seguras",
      "Sinalização",
      "Inspeção de interferências (redes)",
      "Balizamento e controle de máquinas",
      "Drenagem e bombeamento",
    ],
  },
  {
    nome: "Carpintaria de formas e armação (aço)",
    descricao: "Montagem de formas e armação de aço para concretagem.",
    grauRisco: "medio",
    riscos: ["Cortes", "Perfurações", "Esmagamento", "Projeções", "Ruído"],
    epis: [
      "Capacete de segurança",
      "Óculos ou viseira facial",
      "Luvas anticorte ou raspa",
      "Botina com biqueira e solado antiderrapante",
      "Protetor auricular",
      "Mangas ou perneiras (quando necessário)",
    ],
    epcs: [
      "Bancadas e cavaletes estáveis",
      "Protetores de serra e guardas de máquinas",
      "Áreas segregadas",
      "Organização e armazenamento do aço",
      "Ponteiras ou capas em vergalhões expostos",
    ],
  },
  {
    nome: "Concretagem (bomba, vibrador, acabamento)",
    descricao: "Lançamento de concreto com bomba, vibrador e acabamento.",
    grauRisco: "medio",
    riscos: [
      "Respingos químicos (cimento)",
      "Quedas",
      "Mangotes sob pressão",
      "Vibração e ruído",
      "Atropelamento",
    ],
    epis: [
      "Capacete de segurança",
      "Óculos ou viseira facial",
      "Luvas impermeáveis",
      "Botas impermeáveis ou botina com perneiras",
      "Protetor auricular",
      "Avental impermeável (respingo intenso)",
      "Máscara PFF2 (poeira de cimento)",
    ],
    epcs: [
      "Sinalização e isolamento do raio da bomba",
      "Passarelas e guarda-corpos em bordas",
      "Travamento e roteiro da bomba",
      "Aterramento e inspeção elétrica de vibradores",
      "Lava-olhos (quando aplicável)",
    ],
  },
  {
    nome: "Alvenaria e assentamentos (bloco, tijolo, argamassa)",
    descricao: "Elevação de paredes e assentamento de alvenaria.",
    grauRisco: "medio",
    riscos: ["Poeira", "Quedas no mesmo nível", "Cortes", "Esforço repetitivo"],
    epis: [
      "Capacete de segurança",
      "Óculos de proteção",
      "Luvas",
      "Botina com biqueira e solado antiderrapante",
      "Máscara PFF2 (corte e poeira)",
      "Joelheiras (quando aplicável)",
    ],
    epcs: [
      "Andaimes ou plataformas adequadas",
      "Guarda-corpos",
      "Organização do piso (5S)",
      "Circulação demarcada",
    ],
  },
  {
    nome: "Revestimentos (chapisco, emboço, reboco), gesso, drywall",
    descricao: "Revestimento de fachadas e fechamentos leves.",
    grauRisco: "alto",
    riscos: [
      "Poeira fina",
      "Queda de altura (fachada ou forro)",
      "Cortes (drywall)",
      "Ruído",
    ],
    epis: [
      "Capacete de segurança",
      "Óculos de proteção",
      "Máscara PFF2",
      "Luvas nitrílica ou anticorte",
      "Botina com biqueira e solado antiderrapante",
      "Cinto paraquedista (altura)",
    ],
    epcs: [
      "Andaime com guarda-corpo e rodapé",
      "Linha de vida e pontos de ancoragem",
      "Ventilação ou exaustão (poeira)",
      "Iluminação adequada",
    ],
  },
  {
    nome: "Pintura e aplicação de selantes e impermeabilizantes",
    descricao: "Pintura, seladores e impermeabilização química.",
    grauRisco: "medio",
    riscos: ["Vapores orgânicos", "Contato químico", "Inflamáveis", "Queda"],
    epis: [
      "Capacete de segurança",
      "Óculos de proteção",
      "Luvas nitrílica",
      "Máscara com filtro adequado (vapores — não só PFF2)",
      "Roupa de proteção (respingo)",
      "Botina com biqueira e solado antiderrapante",
      "Cinto paraquedista (altura)",
    ],
    epcs: [
      "Ventilação ou exaustão local",
      "Controle de fontes de ignição",
      "Armazenagem correta de produtos",
      "Sinalização da área",
      "FISPQ disponível no posto",
      "Extintores próximos",
    ],
  },
  {
    nome: "Telhado e trabalho em altura (lajes, fachadas, estrutura metálica)",
    descricao: "Trabalhos em cobertura, fachada e estrutura elevada.",
    grauRisco: "critico",
    riscos: [
      "Queda de altura",
      "Queda de materiais",
      "Proximidade de linhas energizadas",
      "Vento",
    ],
    epis: [
      "Cinto paraquedista com talabarte e absorvedor de energia",
      "Capacete com jugular",
      "Calçado antiderrapante",
      "Luvas",
      "Óculos de proteção",
    ],
    epcs: [
      "Guarda-corpo e rodapé",
      "Redes de proteção coletiva",
      "Linha de vida e ancoragens certificadas",
      "Isolamento inferior (área de queda de objetos)",
      "Escadas e andaimes conforme norma e inspecionados",
    ],
  },
  {
    nome: "Andaimes, plataformas e escadas",
    descricao: "Montagem, uso e desmontagem de acesso temporário.",
    grauRisco: "alto",
    riscos: ["Queda", "Tombamento", "Montagem incorreta"],
    epis: [
      "Capacete com jugular",
      "Luvas",
      "Botina com biqueira e solado antiderrapante",
      "Cinto paraquedista (montagem ou risco de queda)",
    ],
    epcs: [
      "Piso completo e travamento do andaime",
      "Amarração e ancoragem",
      "Guarda-corpo e rodapé",
      "Acesso por escada interna",
      "Placa de inspeção ou liberação",
      "Base nivelada e firme",
    ],
  },
  {
    nome: "Instalações elétricas provisórias e definitivas",
    descricao: "Quadros, cabeamento, energia provisória e definitiva.",
    grauRisco: "critico",
    riscos: ["Choque elétrico e arc flash", "Incêndio", "Queda"],
    epis: [
      "Capacete de segurança",
      "Luvas isolantes (classe adequada ao trabalho)",
      "Sobreluva",
      "Óculos ou face shield (energia incidente)",
      "Vestimenta anti-chama (quando aplicável)",
      "Calçado dielétrico (quando definido no PPE)",
    ],
    epcs: [
      "Bloqueio e etiquetagem (LOTO)",
      "DR e disjuntores adequados",
      "Aterramento e equipotencialização",
      "Quadros fechados e sinalizados",
      "Ferramentas isoladas",
      "Barreira ou isolamento da área energizada",
    ],
  },
  {
    nome: "Hidráulica, esgoto e drenagem",
    descricao: "Tubulações, ligações e valas sanitárias.",
    grauRisco: "medio",
    riscos: ["Agentes biológicos", "Cortes", "Esforço físico", "Valas"],
    epis: [
      "Luvas nitrílica ou PVC",
      "Óculos de proteção",
      "Botina impermeável ou proteção de pernas",
      "Máscara PFF2 (poeira)",
      "Proteção facial (respingos)",
      "Macacão (sujidade ou risco biológico)",
    ],
    epcs: [
      "Escoramento de valas",
      "Sinalização e isolamento",
      "Bombeamento e drenagem",
      "Higiene do posto e descarte correto",
    ],
  },
  {
    nome: "Solda, corte a quente e esmerilhamento",
    descricao: "Processos com faísca, calor e fumos metálicos.",
    grauRisco: "alto",
    riscos: [
      "Fagulhas e queimaduras",
      "Fumaça metálica",
      "Incêndio",
      "Projeção de partículas",
    ],
    epis: [
      "Máscara de solda (lente adequada)",
      "Óculos de segurança (esmeril)",
      "Luvas de raspa",
      "Avental ou perneiras de raspa",
      "Mangotes (solda)",
      "Botina com biqueira e solado antiderrapante",
      "Protetor auricular",
      "Proteção respiratória para fumos (conforme avaliação)",
    ],
    epcs: [
      "Cortina de solda",
      "Extintor adequado e vigilância de fogo",
      "Ventilação ou exaustão local",
      "Isolamento da área",
      "Aterramento de equipamentos",
      "Organização de cilindros e mangueiras",
    ],
  },
  {
    nome: "Operação de máquinas e equipamentos (retro, guindaste, elevador)",
    descricao: "Operação de máquinas móveis e equipamentos de içamento.",
    grauRisco: "alto",
    riscos: [
      "Atropelamento",
      "Tombamento",
      "Esmagamento",
      "Ruído",
    ],
    epis: [
      "Capacete de segurança",
      "Colete refletivo",
      "Botina com biqueira e solado antiderrapante",
      "Protetor auricular",
      "Óculos (poeira ou projeção)",
      "Luvas (quando aplicável)",
    ],
    epcs: [
      "Plano de içamento (guindaste)",
      "Sinalização e balizamento",
      "Alarme de ré e avisos sonoros",
      "Segregação pedestre versus máquina",
      "Checklists e manutenção",
      "Limitadores e dispositivos de segurança",
    ],
  },
  {
    nome: "Movimentação manual de cargas e logística de materiais",
    descricao: "Transporte manual e organização de materiais no canteiro.",
    grauRisco: "baixo",
    riscos: [
      "Lombalgia e esforço",
      "Esmagamento de dedos",
      "Queda de materiais empilhados",
    ],
    epis: [
      "Luvas de pega ou raspa",
      "Botina com biqueira",
      "Capacete de segurança",
      "Colete refletivo",
    ],
    epcs: [
      "Carrinhos e paleteiras quando possível",
      "Rotas de circulação definidas",
      "Empilhamento estável e limite de altura",
      "Sinalização de corredores",
      "Piso regular e livre de obstáculos",
    ],
  },
  {
    nome: "Demolição (parcial ou total)",
    descricao: "Remoção controlada de estruturas e entulho.",
    grauRisco: "critico",
    riscos: [
      "Queda de estruturas",
      "Poeira com sílica",
      "Projeções",
      "Ruído e vibração",
    ],
    epis: [
      "Capacete de segurança",
      "Óculos ou viseira facial",
      "Máscara PFF2 ou P3 (conforme poeira e sílica)",
      "Luvas",
      "Botina com biqueira e solado antiderrapante",
      "Protetor auricular",
      "Cinto paraquedista (trabalho em borda)",
    ],
    epcs: [
      "Plano de demolição",
      "Isolamento amplo do entorno",
      "Escoramentos e contenções",
      "Queda controlada de materiais",
      "Contenção de poeira (umectação)",
      "Monitoramento de estrutura",
    ],
  },
];

async function ensureEpi(client: pg.Client, nome: string): Promise<number> {
  const n = nome.trim();
  const sel = await client.query<{ id: number }>(`SELECT id FROM epis WHERE nome = $1 LIMIT 1`, [n]);
  if (sel.rows.length > 0) return sel.rows[0]!.id;
  const ins = await client.query<{ id: number }>(
    `INSERT INTO epis (nome, ativo) VALUES ($1, true) RETURNING id`,
    [n],
  );
  return ins.rows[0]!.id;
}

async function ensureEpc(client: pg.Client, nome: string): Promise<number> {
  const n = nome.trim();
  const sel = await client.query<{ id: number }>(`SELECT id FROM epcs WHERE nome = $1 LIMIT 1`, [n]);
  if (sel.rows.length > 0) return sel.rows[0]!.id;
  const ins = await client.query<{ id: number }>(
    `INSERT INTO epcs (nome, ativo) VALUES ($1, true) RETURNING id`,
    [n],
  );
  return ins.rows[0]!.id;
}

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    console.error("DATABASE_URL não definida. Configure .env ou .env.local na raiz do projeto.");
    process.exit(1);
  }

  const client = new pg.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    for (const a of ATIVIDADES) {
      const epis = [...new Set(a.epis.map((s) => s.trim()))];
      const epcs = [...new Set(a.epcs.map((s) => s.trim()))];
      const riscos = a.riscos.map((s) => s.trim());

      const epiIdList: number[] = [];
      for (const nome of epis) epiIdList.push(await ensureEpi(client, nome));
      const epcIdList: number[] = [];
      for (const nome of epcs) epcIdList.push(await ensureEpc(client, nome));
      const epiIds = JSON.stringify(epiIdList);
      const epcIds = JSON.stringify(epcIdList);
      const riscosJson = JSON.stringify(riscos);

      const exists = await client.query(`SELECT id FROM tipos_tarefa WHERE nome = $1 LIMIT 1`, [a.nome]);

      if (exists.rows.length > 0) {
        await client.query(
          `UPDATE tipos_tarefa SET
            "descricao" = $2,
            "grauRisco" = $3::"grauRisco",
            "riscos" = $4::jsonb,
            "epiIds" = $5::jsonb,
            "epcIds" = $6::jsonb,
            "ativo" = true,
            "updatedAt" = now()
          WHERE nome = $1`,
          [a.nome, a.descricao, a.grauRisco, riscosJson, epiIds, epcIds],
        );
        console.log(`Atualizado: ${a.nome}`);
      } else {
        await client.query(
          `INSERT INTO tipos_tarefa (
            nome, "descricao", "grauRisco", "riscos", "epiIds", "epcIds", ativo
          ) VALUES ($1, $2, $3::"grauRisco", $4::jsonb, $5::jsonb, $6::jsonb, true)`,
          [a.nome, a.descricao, a.grauRisco, riscosJson, epiIds, epcIds],
        );
        console.log(`Inserido: ${a.nome}`);
      }
    }

    console.log(`\nConcluído: ${ATIVIDADES.length} tipos de tarefa.`);
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
