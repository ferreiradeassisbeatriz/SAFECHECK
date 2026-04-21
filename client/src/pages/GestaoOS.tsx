"use client";

import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Activity,
  Building2,
  ClipboardList,
  FileDown,
  FileSignature,
  FileText,
  ImageDown,
  LayoutDashboard,
  LogOut,
  ClipboardPlus,
  Construction,
  HardHat,
  Layers,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type OsItem = {
  id: number;
  numero: string;
  status: "pendente" | "assinada" | "concluida";
  createdAt: string | Date;
  dataAssinatura: string | Date | null;
  nomeColaborador: string | null;
  matricula: string | null;
  setor: string | null;
  nomeTarefa: string | null;
};

type ExportPayload = {
  numero: string;
  status: string;
  createdAt: string | Date;
  dataAssinatura: string | Date | null;
  nomeColaborador: string | null;
  matricula: string | null;
  setor: string | null;
  nomeTarefa: string | null;
  riscos: string[];
  epis: string[];
  epcs: string[];
  validacoesAmbiente: string[];
  assinaturaTstNome: string | null;
  assinaturaTstEm: string | null;
};

const PROCEDIMENTO_ACIDENTE = [
  "Em caso de acidente de trabalho, interromper a atividade e comunicar imediatamente ao gestor imediato e ao SESMT.",
  "Garantir o primeiro atendimento, preservar o local quando aplicavel e registrar evidencias basicas do ocorrido.",
  "Acionar o fluxo interno para abertura da CAT dentro dos prazos legais, conforme a legislacao trabalhista e previdenciaria vigente.",
  "Nenhuma atividade pode ser retomada sem nova avaliacao de risco e liberacao formal do responsavel.",
];

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR");
}

function getStatusBadge(status: OsItem["status"]) {
  if (status === "assinada") return "bg-blue-600 text-white";
  if (status === "concluida") return "bg-green-600 text-white";
  return "bg-amber-500 text-white";
}

function escapeHtml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

type CheckinHistoricoRow = {
  id: number;
  createdAt: string | Date;
  updatedAt: string | Date;
  epiValidado: boolean;
  ambienteValidado: boolean;
  assinaturaPendente: boolean;
  nomeColaborador: string | null;
  matricula: string | null;
  setorNome: string | null;
  nomeTarefa: string | null;
};

const REFETCH_MS = 15_000;

export default function GestaoOS() {
  const { user, loading, logout } = useAuth({ redirectOnUnauthenticated: true });
  const utils = trpc.useUtils();
  const assinarTstMutation = trpc.admin.assinarTecnicoSeguranca.useMutation();
  const podePainel =
    user?.role === "admin" || user?.role === "developer" || user?.role === "tst";

  const metricsQuery = trpc.admin.getDashboardMetrics.useQuery(undefined, {
    enabled: !!user && podePainel,
    refetchInterval: REFETCH_MS,
    refetchOnWindowFocus: true,
  });

  const historicoQuery = trpc.admin.getHistoricoCheckinsCompleto.useQuery(undefined, {
    enabled: !!user && podePainel,
    refetchInterval: REFETCH_MS,
    refetchOnWindowFocus: true,
  });

  const osQuery = trpc.admin.getMonitoramentoOS.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: REFETCH_MS,
    refetchOnWindowFocus: true,
  });

  const catalogoEpiEpcQuery = trpc.admin.getCatalogoEpiEpc.useQuery(undefined, {
    enabled: !!user && user.role === "tst",
  });

  const cadastrarAtividadeMutation = trpc.admin.cadastrarAtividade.useMutation();
  const cadastrarEpiMutation = trpc.admin.cadastrarEpi.useMutation();
  const cadastrarEpcMutation = trpc.admin.cadastrarEpc.useMutation();

  const [epiNome, setEpiNome] = useState("");
  const [epiDescricao, setEpiDescricao] = useState("");
  const [epcNome, setEpcNome] = useState("");
  const [epcDescricao, setEpcDescricao] = useState("");

  const [atvNome, setAtvNome] = useState("");
  const [atvDescricao, setAtvDescricao] = useState("");
  const [atvGrauRisco, setAtvGrauRisco] = useState<"baixo" | "medio" | "alto" | "critico">("medio");
  const [atvRiscosTexto, setAtvRiscosTexto] = useState("");
  const [atvEpiIds, setAtvEpiIds] = useState<Set<number>>(() => new Set());
  const [atvEpcIds, setAtvEpcIds] = useState<Set<number>>(() => new Set());

  const [modalCatalogoEpiEpcOpen, setModalCatalogoEpiEpcOpen] = useState(false);
  const [modalAtividadeOpen, setModalAtividadeOpen] = useState(false);

  const osList = (osQuery.data ?? []) as OsItem[];

  const resumoPorSetor = useMemo(() => {
    const map = new Map<string, number>();
    for (const os of osList) {
      const key = os.setor?.trim() || "Sem setor";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([setor, total]) => ({ setor, total }))
      .sort((a, b) => b.total - a.total);
  }, [osList]);

  const resumoPorColaborador = useMemo(() => {
    const map = new Map<string, number>();
    for (const os of osList) {
      const key = os.nomeColaborador?.trim() || "Sem colaborador";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([colaborador, total]) => ({ colaborador, total }))
      .sort((a, b) => b.total - a.total);
  }, [osList]);

  const exportarOsPdf = (os: ExportPayload) => {
    if (typeof window === "undefined") return;
    const popup = window.open("", "_blank", "width=900,height=700");
    if (!popup) return;

    const html = `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8" /><title>${escapeHtml(os.numero)}</title>
<style>
body{font-family:Arial,sans-serif;padding:22px;color:#111827}
h1{margin:0;font-size:24px}
h2{font-size:15px;margin:0 0 8px 0}
.sub{margin:6px 0 16px 0;color:#475569}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.box{border:1px solid #d1d5db;border-radius:8px;padding:10px;margin-bottom:8px}
.label{font-size:11px;color:#6b7280;text-transform:uppercase;margin-bottom:2px}
.value{font-size:14px;font-weight:600}
.section{margin-top:14px;border:1px solid #d1d5db;border-radius:8px;padding:10px}
ul{margin:8px 0 0 16px;padding:0}
li{margin:0 0 4px 0;font-size:13px}
.obs{font-size:12px;color:#334155}
</style></head>
<body>
<h1>Ordem de Serviço ${escapeHtml(os.numero)}</h1>
<p class="sub">Documento de segurança por atividade - emissão estruturada</p>
<div class="grid">
  <div class="box"><div class="label">Atividade</div><div class="value">${escapeHtml(os.nomeTarefa ?? "Atividade")}</div></div>
  <div class="box"><div class="label">OS / Emissão</div><div class="value">${escapeHtml(os.numero)} - ${escapeHtml(formatDate(os.createdAt))}</div></div>
  <div class="box"><div class="label">Colaborador</div><div class="value">${escapeHtml(os.nomeColaborador ?? "Colaborador")}</div></div>
  <div class="box"><div class="label">Matrícula</div><div class="value">${escapeHtml(os.matricula ?? "Não informado")}</div></div>
  <div class="box"><div class="label">Assinatura TST</div><div class="value">${escapeHtml(os.assinaturaTstNome ?? "Não assinada por TST")}</div></div>
  <div class="box"><div class="label">Data assinatura TST</div><div class="value">${escapeHtml(os.assinaturaTstEm ?? "—")}</div></div>
</div>
<div class="section"><h2>1. Riscos da atividade</h2><ul>${os.riscos.map((r) => `<li>${escapeHtml(r)}</li>`).join("") || "<li>Não informado</li>"}</ul></div>
<div class="section"><h2>2. EPIs obrigatórios</h2><ul>${os.epis.map((e) => `<li>${escapeHtml(e)}</li>`).join("") || "<li>Não informado</li>"}</ul></div>
<div class="section"><h2>3. EPCs exigidos</h2><ul>${os.epcs.map((e) => `<li>${escapeHtml(e)}</li>`).join("") || "<li>Não informado</li>"}</ul></div>
<div class="section"><h2>4. Validação do ambiente</h2><ul>${os.validacoesAmbiente.map((v) => `<li>${escapeHtml(v)} - OK</li>`).join("") || "<li>Não informado</li>"}</ul></div>
<div class="section">
<h2>5. Procedimento em caso de acidente de trabalho (CAT)</h2>
<ul>${PROCEDIMENTO_ACIDENTE.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul>
<p class="obs"><strong>Observação legal:</strong> comunicação imediata e abertura de CAT devem seguir os prazos e requisitos legais aplicáveis.</p>
</div>
<script>window.onload=()=>window.print();</script>
</body>
</html>`;

    popup.document.open();
    popup.document.write(html);
    popup.document.close();
  };

  const exportarOsPng = (os: ExportPayload) => {
    if (typeof window === "undefined") return;
    const lines: string[] = [
      `ORDEM DE SERVICO: ${os.numero}`,
      `Atividade: ${os.nomeTarefa ?? "—"}`,
      `Emitida em: ${formatDate(os.createdAt)}`,
      `Colaborador: ${os.nomeColaborador ?? "Colaborador"} | Matricula: ${os.matricula ?? "Não informado"}`,
      `Assinatura TST: ${os.assinaturaTstNome ?? "Nao assinada por TST"}`,
      `Data assinatura TST: ${os.assinaturaTstEm ?? "—"}`,
      "",
      "1) Riscos da atividade:",
      ...os.riscos.map((r) => `- ${r}`),
      "",
      "2) EPIs obrigatorios:",
      ...os.epis.map((e) => `- ${e}`),
      "",
      "3) EPCs exigidos:",
      ...os.epcs.map((e) => `- ${e}`),
      "",
      "4) Validacao do ambiente:",
      ...os.validacoesAmbiente.map((v) => `- ${v} (OK)`),
      "",
      "5) Procedimento em caso de acidente (CAT):",
      ...PROCEDIMENTO_ACIDENTE.map((p) => `- ${p}`),
    ];
    const canvas = document.createElement("canvas");
    const contentWidth = 1320;
    const maxLineChars = 105;
    const lineHeight = 28;
    const topStartY = 165;
    const bottomPadding = 60;
    const splitLine = (line: string) => {
      const wrapped = line.match(new RegExp(`.{1,${maxLineChars}}(\\s|$)`, "g")) ?? [line];
      return wrapped.map((piece) => piece.trim()).filter((piece) => piece.length > 0);
    };
    const wrappedLines = lines.flatMap((line) => (line.trim().length === 0 ? [""] : splitLine(line)));
    canvas.width = 1400;
    canvas.height = Math.max(
      1400,
      topStartY + wrappedLines.length * lineHeight + bottomPadding,
    );
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#1e3a8a";
    ctx.fillRect(0, 0, canvas.width, 120);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 44px Arial";
    ctx.fillText("ORDEM DE SERVICO POR ATIVIDADE", 40, 74);
    ctx.font = "22px Arial";
    ctx.fillText(os.numero, 40, 104);
    ctx.fillStyle = "#111827";
    ctx.font = "20px Arial";
    let y = topStartY;
    for (const text of wrappedLines) {
      if (text.length > 0) {
        ctx.fillText(text, 40, y, contentWidth);
      }
      y += lineHeight;
    }
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${os.numero}.png`;
    a.click();
  };

  const exportar = async (osId: number, format: "pdf" | "png") => {
    const payload = (await utils.admin.getOsExportPayload.fetch({ osId })) as ExportPayload;
    if (format === "pdf") {
      exportarOsPdf(payload);
      return;
    }
    exportarOsPng(payload);
  };

  const assinarComoTst = async (osId: number) => {
    try {
      const result = await assinarTstMutation.mutateAsync({ osId });
      toast.success(`OS ${result.numero} assinada pelo Técnico de Segurança.`);
      await osQuery.refetch();
      await utils.admin.getDashboardMetrics.invalidate();
      await utils.admin.getHistoricoCheckinsCompleto.invalidate();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível assinar a OS.";
      toast.error(message);
    }
  };

  const handleCadastrarEpi = async (e: React.FormEvent) => {
    e.preventDefault();
    const nome = epiNome.trim();
    if (!nome) {
      toast.error("Informe o nome do EPI.");
      return;
    }
    try {
      const r = await cadastrarEpiMutation.mutateAsync({
        nome,
        descricao: epiDescricao.trim() || undefined,
      });
      toast.success(`EPI "${r.nome}" cadastrado.`);
      setEpiNome("");
      setEpiDescricao("");
      setAtvEpiIds((prev) => new Set(prev).add(r.id));
      await catalogoEpiEpcQuery.refetch();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Não foi possível cadastrar o EPI.";
      toast.error(msg);
    }
  };

  const handleCadastrarEpc = async (e: React.FormEvent) => {
    e.preventDefault();
    const nome = epcNome.trim();
    if (!nome) {
      toast.error("Informe o nome do EPC.");
      return;
    }
    try {
      const r = await cadastrarEpcMutation.mutateAsync({
        nome,
        descricao: epcDescricao.trim() || undefined,
      });
      toast.success(`EPC "${r.nome}" cadastrado.`);
      setEpcNome("");
      setEpcDescricao("");
      setAtvEpcIds((prev) => new Set(prev).add(r.id));
      await catalogoEpiEpcQuery.refetch();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Não foi possível cadastrar o EPC.";
      toast.error(msg);
    }
  };

  const handleCadastrarAtividade = async (e: React.FormEvent) => {
    e.preventDefault();
    const nome = atvNome.trim();
    if (!nome) {
      toast.error("Informe o nome da atividade.");
      return;
    }
    const riscos = atvRiscosTexto
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (riscos.length === 0) {
      toast.error("Informe ao menos um risco (um por linha).");
      return;
    }
    try {
      await cadastrarAtividadeMutation.mutateAsync({
        nome,
        descricao: atvDescricao.trim() || undefined,
        grauRisco: atvGrauRisco,
        riscos,
        epiIds: [...atvEpiIds],
        epcIds: [...atvEpcIds],
      });
      toast.success("Atividade cadastrada com sucesso.");
      setAtvNome("");
      setAtvDescricao("");
      setAtvGrauRisco("medio");
      setAtvRiscosTexto("");
      setAtvEpiIds(new Set());
      setAtvEpcIds(new Set());
      await utils.operario.getTiposTarefa.invalidate();
      setModalAtividadeOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Não foi possível cadastrar a atividade.";
      toast.error(msg);
    }
  };

  if (loading) return <div className="min-h-screen p-6 text-slate-600">Carregando...</div>;
  // Durante logout/sessão expirada, useAuth já redireciona; evitamos exibir "não autorizado" nesse intervalo.
  if (!user) return <div className="min-h-screen p-6 text-slate-600">Redirecionando...</div>;
  if (user.role !== "admin" && user.role !== "developer" && user.role !== "tst") {
    return <div className="min-h-screen p-6 text-red-600">Acesso não autorizado.</div>;
  }

  const m = metricsQuery.data;
  const historicoRows = (historicoQuery.data ?? []) as CheckinHistoricoRow[];
  const ultimaAtualizacao =
    metricsQuery.dataUpdatedAt > 0
      ? new Date(metricsQuery.dataUpdatedAt).toLocaleTimeString("pt-BR")
      : "—";

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 px-4 py-3 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-5 sm:py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="flex min-w-0 items-start gap-2 sm:gap-3">
              <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-blue-600 sm:mt-0 sm:h-7 sm:w-7" />
              <div className="min-w-0">
                <h1 className="text-xl font-bold leading-tight text-slate-900 sm:text-2xl md:text-3xl">
                  Monitoramento de Ordens de Serviço
                </h1>
                <p className="mt-0.5 text-xs leading-snug text-slate-600 sm:text-sm">
                  Acompanhe todas as OS geradas e assinadas, com resumo por setor e colaborador.
                </p>
                {user.role === "tst" && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2 border-teal-300 text-teal-900 hover:bg-teal-50"
                      onClick={() => setModalCatalogoEpiEpcOpen(true)}
                    >
                      <Layers className="h-4 w-4" />
                      Cadastrar EPIs e EPCs
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => setModalAtividadeOpen(true)}
                    >
                      <ClipboardPlus className="h-4 w-4" />
                      Cadastrar atividade
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 shrink-0 gap-2 self-stretch sm:self-auto sm:h-10"
              onClick={() => void logout()}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        {user.role === "tst" && (
          <>
            <Dialog open={modalCatalogoEpiEpcOpen} onOpenChange={setModalCatalogoEpiEpcOpen}>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-teal-600" />
                    Cadastro de EPIs e EPCs
                  </DialogTitle>
                  <DialogDescription>
                    Inclua novos equipamentos no catálogo; eles passam a aparecer na lista ao cadastrar atividades.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 lg:grid-cols-2">
                  <form onSubmit={(ev) => void handleCadastrarEpi(ev)} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/80 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <HardHat className="h-4 w-4 text-teal-600" />
                      Novo EPI
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="modal-epi-nome">Nome</Label>
                      <Input
                        id="modal-epi-nome"
                        value={epiNome}
                        onChange={(e) => setEpiNome(e.target.value)}
                        placeholder="Ex.: Capacete de segurança"
                        maxLength={100}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="modal-epi-desc">Descrição (opcional)</Label>
                      <Textarea
                        id="modal-epi-desc"
                        value={epiDescricao}
                        onChange={(e) => setEpiDescricao(e.target.value)}
                        placeholder="Norma, modelo ou observações."
                        rows={3}
                        className="resize-y text-sm"
                      />
                    </div>
                    <Button
                      type="submit"
                      variant="secondary"
                      disabled={cadastrarEpiMutation.isPending}
                    >
                      {cadastrarEpiMutation.isPending ? "Salvando..." : "Cadastrar EPI"}
                    </Button>
                  </form>
                  <form onSubmit={(ev) => void handleCadastrarEpc(ev)} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/80 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <Construction className="h-4 w-4 text-teal-600" />
                      Novo EPC
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="modal-epc-nome">Nome</Label>
                      <Input
                        id="modal-epc-nome"
                        value={epcNome}
                        onChange={(e) => setEpcNome(e.target.value)}
                        placeholder="Ex.: Andaime certificado"
                        maxLength={100}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="modal-epc-desc">Descrição (opcional)</Label>
                      <Textarea
                        id="modal-epc-desc"
                        value={epcDescricao}
                        onChange={(e) => setEpcDescricao(e.target.value)}
                        placeholder="Tipo de proteção coletiva ou requisitos."
                        rows={3}
                        className="resize-y text-sm"
                      />
                    </div>
                    <Button
                      type="submit"
                      variant="secondary"
                      disabled={cadastrarEpcMutation.isPending}
                    >
                      {cadastrarEpcMutation.isPending ? "Salvando..." : "Cadastrar EPC"}
                    </Button>
                  </form>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">
                      Fechar
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={modalAtividadeOpen} onOpenChange={setModalAtividadeOpen}>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <ClipboardPlus className="h-5 w-5 text-emerald-600" />
                    Cadastro de atividade
                  </DialogTitle>
                  <DialogDescription>
                    Descrição, grau de risco, riscos (um por linha) e os EPIs/EPCs necessários a partir do catálogo.
                  </DialogDescription>
                </DialogHeader>
                {catalogoEpiEpcQuery.isLoading ? (
                  <p className="text-sm text-slate-600">Carregando catálogo de EPIs e EPCs...</p>
                ) : catalogoEpiEpcQuery.isError ? (
                  <p className="text-sm text-red-600">
                    Não foi possível carregar o catálogo. Verifique sua sessão e tente novamente.
                  </p>
                ) : (
                  <form onSubmit={(ev) => void handleCadastrarAtividade(ev)} className="space-y-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="modal-atv-nome">Nome da atividade</Label>
                        <Input
                          id="modal-atv-nome"
                          value={atvNome}
                          onChange={(e) => setAtvNome(e.target.value)}
                          placeholder="Ex.: Trabalho em altura"
                          maxLength={100}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="modal-atv-grau">Grau de risco</Label>
                        <select
                          id="modal-atv-grau"
                          value={atvGrauRisco}
                          onChange={(e) =>
                            setAtvGrauRisco(e.target.value as "baixo" | "medio" | "alto" | "critico")
                          }
                          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        >
                          <option value="baixo">Baixo</option>
                          <option value="medio">Médio</option>
                          <option value="alto">Alto</option>
                          <option value="critico">Crítico</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="modal-atv-desc">Descrição da atividade</Label>
                      <Textarea
                        id="modal-atv-desc"
                        value={atvDescricao}
                        onChange={(e) => setAtvDescricao(e.target.value)}
                        placeholder="Descreva o escopo da atividade, condições e observações relevantes para o colaborador."
                        rows={4}
                        className="min-h-[100px] resize-y"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="modal-atv-riscos">Riscos (um por linha)</Label>
                      <Textarea
                        id="modal-atv-riscos"
                        value={atvRiscosTexto}
                        onChange={(e) => setAtvRiscosTexto(e.target.value)}
                        placeholder={"Queda de materiais\nChoque elétrico"}
                        rows={5}
                        className="min-h-[120px] resize-y font-mono text-sm"
                        required
                      />
                    </div>
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
                        <p className="mb-2 text-sm font-semibold text-slate-800">EPIs necessários</p>
                        <ScrollArea className="h-[200px] pr-3">
                          <div className="space-y-2">
                            {(catalogoEpiEpcQuery.data?.epis ?? []).map((epi) => (
                              <label
                                key={epi.id}
                                className="flex cursor-pointer items-center gap-2 rounded border border-transparent px-1 py-1 text-sm hover:bg-white"
                              >
                                <Checkbox
                                  checked={atvEpiIds.has(epi.id)}
                                  onCheckedChange={(checked) => {
                                    setAtvEpiIds((prev) => {
                                      const next = new Set(prev);
                                      if (checked === true) next.add(epi.id);
                                      else next.delete(epi.id);
                                      return next;
                                    });
                                  }}
                                />
                                <span className="text-slate-700">{epi.nome}</span>
                              </label>
                            ))}
                            {(catalogoEpiEpcQuery.data?.epis ?? []).length === 0 && (
                              <p className="text-xs text-slate-500">Nenhum EPI cadastrado no sistema.</p>
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
                        <p className="mb-2 text-sm font-semibold text-slate-800">EPCs necessários</p>
                        <ScrollArea className="h-[200px] pr-3">
                          <div className="space-y-2">
                            {(catalogoEpiEpcQuery.data?.epcs ?? []).map((epc) => (
                              <label
                                key={epc.id}
                                className="flex cursor-pointer items-center gap-2 rounded border border-transparent px-1 py-1 text-sm hover:bg-white"
                              >
                                <Checkbox
                                  checked={atvEpcIds.has(epc.id)}
                                  onCheckedChange={(checked) => {
                                    setAtvEpcIds((prev) => {
                                      const next = new Set(prev);
                                      if (checked === true) next.add(epc.id);
                                      else next.delete(epc.id);
                                      return next;
                                    });
                                  }}
                                />
                                <span className="text-slate-700">{epc.nome}</span>
                              </label>
                            ))}
                            {(catalogoEpiEpcQuery.data?.epcs ?? []).length === 0 && (
                              <p className="text-xs text-slate-500">Nenhum EPC cadastrado no sistema.</p>
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                    </div>
                    <DialogFooter className="gap-2 sm:justify-between">
                      <DialogClose asChild>
                        <Button type="button" variant="outline">
                          Cancelar
                        </Button>
                      </DialogClose>
                      <Button
                        type="submit"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        disabled={cadastrarAtividadeMutation.isPending}
                      >
                        {cadastrarAtividadeMutation.isPending ? "Salvando..." : "Cadastrar atividade"}
                      </Button>
                    </DialogFooter>
                  </form>
                )}
              </DialogContent>
            </Dialog>
          </>
        )}

        <Card className="border-blue-200 bg-white shadow-sm">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <LayoutDashboard className="h-5 w-5 text-blue-600" />
                Dashboard administrativo
              </CardTitle>
              <CardDescription>
                Métricas em tempo real (atualização automática a cada 15 segundos). Última leitura:{" "}
                <span className="font-medium text-slate-700">{ultimaAtualizacao}</span>
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 gap-2"
              disabled={metricsQuery.isFetching || historicoQuery.isFetching}
              onClick={() => {
                void metricsQuery.refetch();
                void historicoQuery.refetch();
                void osQuery.refetch();
              }}
            >
              <RefreshCw className={`h-4 w-4 ${metricsQuery.isFetching ? "animate-spin" : ""}`} />
              Atualizar agora
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {metricsQuery.isLoading ? (
              <p className="text-sm text-slate-600">Carregando métricas...</p>
            ) : m == null ? (
              <p className="text-sm text-amber-700">Métricas indisponíveis (banco não conectado).</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase text-slate-500">
                    <Activity className="h-3.5 w-3.5" />
                    Check-ins hoje
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{m.checkinsHoje}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase text-slate-500">
                    <ClipboardList className="h-3.5 w-3.5" />
                    Total check-ins
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{m.totalCheckins}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase text-slate-500">
                    <Building2 className="h-3.5 w-3.5" />
                    Setores ativos
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{m.setoresAtivos}</p>
                </div>
                <div className="rounded-lg border border-blue-100 bg-blue-50/80 p-4">
                  <div className="mb-1 text-xs font-medium uppercase text-blue-800">Total OS</div>
                  <p className="text-2xl font-bold text-blue-900">{m.totalOrdensServico}</p>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4">
                  <div className="mb-1 text-xs font-medium uppercase text-amber-900">OS pendentes</div>
                  <p className="text-2xl font-bold text-amber-950">{m.osPendentes}</p>
                </div>
                <div className="rounded-lg border border-blue-200 bg-blue-50/80 p-4">
                  <div className="mb-1 text-xs font-medium uppercase text-blue-950">OS assinadas</div>
                  <p className="text-2xl font-bold text-blue-950">{m.osAssinadas}</p>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-4">
                  <div className="mb-1 text-xs font-medium uppercase text-emerald-900">OS concluídas</div>
                  <p className="text-2xl font-bold text-emerald-950">{m.osConcluidas}</p>
                </div>
              </div>
            )}

            <div>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <FileText className="h-4 w-4 text-blue-600" />
                Histórico completo de check-ins
              </h3>
              {historicoQuery.isLoading ? (
                <p className="text-sm text-slate-600">Carregando histórico...</p>
              ) : historicoRows.length === 0 ? (
                <p className="text-sm text-slate-600">Nenhum check-in registrado.</p>
              ) : (
                <ScrollArea className="h-[min(480px,55vh)] w-full rounded-md border border-slate-200">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100">
                      <tr>
                        <th className="px-3 py-2 font-semibold text-slate-700">ID</th>
                        <th className="px-3 py-2 font-semibold text-slate-700">Data</th>
                        <th className="px-3 py-2 font-semibold text-slate-700">Colaborador</th>
                        <th className="px-3 py-2 font-semibold text-slate-700">Matrícula</th>
                        <th className="px-3 py-2 font-semibold text-slate-700">Setor</th>
                        <th className="px-3 py-2 font-semibold text-slate-700">Atividade</th>
                        <th className="px-3 py-2 font-semibold text-slate-700">EPI</th>
                        <th className="px-3 py-2 font-semibold text-slate-700">Ambiente</th>
                        <th className="px-3 py-2 font-semibold text-slate-700">Assinatura</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historicoRows.map((row) => (
                        <tr key={row.id} className="border-b border-slate-100 odd:bg-white even:bg-slate-50/80">
                          <td className="px-3 py-2 text-slate-600">{row.id}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-slate-700">
                            {formatDate(row.createdAt)}
                          </td>
                          <td className="px-3 py-2 text-slate-800">{row.nomeColaborador ?? "—"}</td>
                          <td className="px-3 py-2 text-slate-600">{row.matricula ?? "—"}</td>
                          <td className="px-3 py-2 text-slate-700">{row.setorNome ?? "—"}</td>
                          <td className="px-3 py-2 text-slate-700">{row.nomeTarefa ?? "—"}</td>
                          <td className="px-3 py-2">
                            <Badge variant={row.epiValidado ? "default" : "secondary"} className="text-xs">
                              {row.epiValidado ? "OK" : "Pend."}
                            </Badge>
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant={row.ambienteValidado ? "default" : "secondary"} className="text-xs">
                              {row.ambienteValidado ? "OK" : "Pend."}
                            </Badge>
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant={row.assinaturaPendente ? "secondary" : "default"} className="text-xs">
                              {row.assinaturaPendente ? "Pendente" : "OK"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              )}
              <p className="mt-2 text-xs text-slate-500">
                {historicoRows.length} registro(s) no histórico completo.
              </p>
            </div>
          </CardContent>
        </Card>

      

        <Card className="border-blue-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Lista de Ordens de Serviço
            </CardTitle>
            <CardDescription>Todas as OS podem ser exportadas como PDF e PNG.</CardDescription>
          </CardHeader>
          <CardContent>
            {osQuery.isLoading ? (
              <p className="text-slate-600">Carregando ordens de serviço...</p>
            ) : osList.length === 0 ? (
              <p className="text-slate-600">Nenhuma ordem de serviço encontrada.</p>
            ) : (
              <div className="space-y-3">
                {osList.map((os) => (
                  <div key={os.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900">{os.numero}</h3>
                        <Badge className={getStatusBadge(os.status)}>{os.status.toUpperCase()}</Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => void exportar(os.id, "pdf")}>
                          <FileDown className="mr-2 h-4 w-4" />
                          Exportar PDF
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => void exportar(os.id, "png")}>
                          <ImageDown className="mr-2 h-4 w-4" />
                          Exportar PNG
                        </Button>
                        {user.role === "tst" && (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={os.status === "concluida" || assinarTstMutation.isPending}
                            onClick={() => void assinarComoTst(os.id)}
                          >
                            <FileSignature className="mr-2 h-4 w-4" />
                            {os.status === "concluida" ? "Assinatura TST registrada" : "Assinar Téc. Segurança"}
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2 text-sm text-slate-700 md:grid-cols-2 lg:grid-cols-3">
                      <p><strong>Colaborador:</strong> {os.nomeColaborador ?? "—"}</p>
                      <p><strong>Matrícula:</strong> {os.matricula ?? "—"}</p>
                      <p><strong>Setor:</strong> {os.setor ?? "—"}</p>
                      <p><strong>Atividade:</strong> {os.nomeTarefa ?? "—"}</p>
                      <p><strong>Criada em:</strong> {formatDate(os.createdAt)}</p>
                      <p><strong>Assinada em:</strong> {formatDate(os.dataAssinatura)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
