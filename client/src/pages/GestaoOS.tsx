"use client";

import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDown, FileSignature, FileText, ImageDown, LogOut, ShieldCheck } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";

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

export default function GestaoOS() {
  const { user, loading, logout } = useAuth({ redirectOnUnauthenticated: true });
  const utils = trpc.useUtils();
  const assinarTstMutation = trpc.admin.assinarTecnicoSeguranca.useMutation();
  const osQuery = trpc.admin.getMonitoramentoOS.useQuery(undefined, {
    enabled: !!user,
  });

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
    const headerHeight = 120;
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
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível assinar a OS.";
      toast.error(message);
    }
  };

  if (loading) return <div className="min-h-screen p-6 text-slate-600">Carregando...</div>;
  // Durante logout/sessão expirada, useAuth já redireciona; evitamos exibir "não autorizado" nesse intervalo.
  if (!user) return <div className="min-h-screen p-6 text-slate-600">Redirecionando...</div>;
  if (user.role !== "admin" && user.role !== "developer" && user.role !== "tst") {
    return <div className="min-h-screen p-6 text-red-600">Acesso não autorizado.</div>;
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex justify-end">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => void logout()}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
          <div className="mb-2 flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-slate-900">Monitoramento de Ordens de Serviço</h1>
          </div>
          <p className="text-slate-600">
            Acompanhe todas as OS geradas e assinadas, com resumo por setor e colaborador.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="border-blue-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle>Resumo por setor</CardTitle>
              <CardDescription>Total de OS por setor</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {resumoPorSetor.map((item) => (
                <div key={item.setor} className="flex items-center justify-between rounded border p-2">
                  <span className="text-slate-700">{item.setor}</span>
                  <Badge>{item.total}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle>Resumo por colaborador</CardTitle>
              <CardDescription>Total de OS por colaborador</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {resumoPorColaborador.map((item) => (
                <div key={item.colaborador} className="flex items-center justify-between rounded border p-2">
                  <span className="text-slate-700">{item.colaborador}</span>
                  <Badge>{item.total}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

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
