"use client";

import { useAuth } from "@/_core/hooks/useAuth";
import { SESSION_TASK_CONTEXT_KEY } from "@shared/const";
import { trpc } from "@/lib/trpc";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle2, FileDown, ImageDown, Loader2, Shield, Signature } from "lucide-react";
import { toast } from "sonner";

type TaskContext = {
  tipoTarefaId: number;
  nomeTarefa?: string;
  formularioRespostas?: Record<string, unknown>;
};

type OrdemEmitida = {
  numero: string;
  nomeTarefa: string;
  emitidaEm: string;
  riscos: string[];
  epis: string[];
  epcs: string[];
  validacoesAmbiente: string[];
  colaborador: string;
  matricula: string;
};

const PROCEDIMENTO_ACIDENTE = [
  "Em caso de acidente de trabalho, interromper a atividade e comunicar imediatamente ao gestor imediato e ao SESMT.",
  "Garantir o primeiro atendimento, preservar o local quando aplicavel e registrar evidencias basicas do ocorrido.",
  "Acionar o fluxo interno para abertura da CAT dentro dos prazos legais, conforme a legislacao trabalhista e previdenciaria vigente.",
  "Nenhuma atividade pode ser retomada sem nova avaliacao de risco e liberacao formal do responsavel.",
];

function escapeHtml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default function SecurityDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [taskContext, setTaskContext] = useState<TaskContext | null>(null);
  const [epiChecks, setEpiChecks] = useState<Record<string, boolean>>({});
  const [ambienteChecks, setAmbienteChecks] = useState<Record<string, boolean>>({});
  const [assinatura, setAssinatura] = useState<string | null>(null);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ordemEmitida, setOrdemEmitida] = useState<OrdemEmitida | null>(null);
  const [assinaturaDesenhada, setAssinaturaDesenhada] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const criarCheckinMutation = trpc.operario.criarCheckin.useMutation();
  const validarEpiMutation = trpc.operario.validarEPI.useMutation();
  const validarAmbienteMutation = trpc.operario.validarAmbiente.useMutation();
  const finalizarCheckinMutation = trpc.operario.finalizarCheckin.useMutation();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem(SESSION_TASK_CONTEXT_KEY);
    if (!raw) {
      router.push("/selecionar-tarefa");
      return;
    }
    try {
      const parsed = JSON.parse(raw) as Partial<TaskContext>;
      if (!parsed?.tipoTarefaId || typeof parsed.tipoTarefaId !== "number") {
        router.push("/selecionar-tarefa");
        return;
      }
      setTaskContext({
        tipoTarefaId: parsed.tipoTarefaId,
        nomeTarefa: parsed.nomeTarefa,
        formularioRespostas:
          parsed.formularioRespostas && typeof parsed.formularioRespostas === "object"
            ? (parsed.formularioRespostas as Record<string, unknown>)
            : {},
      });
    } catch {
      router.push("/selecionar-tarefa");
    }
  }, [router]);

  const detalhesQuery = trpc.operario.getTipoTarefaDetalhes.useQuery(
    { id: taskContext?.tipoTarefaId ?? 0 },
    { enabled: taskContext != null },
  );

  const riscos = useMemo(() => {
    const raw = detalhesQuery.data?.riscos;
    if (!Array.isArray(raw)) return [];
    return raw.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
  }, [detalhesQuery.data?.riscos]);

  const epiItems = useMemo(
    () => detalhesQuery.data?.epiList ?? [],
    [detalhesQuery.data?.epiList],
  );

  const epcItems = useMemo(
    () => detalhesQuery.data?.epcList ?? [],
    [detalhesQuery.data?.epcList],
  );

  const ambienteItems = useMemo(() => {
    const fromRiscos = riscos.map((risco, idx) => ({
      key: `risco-${idx}`,
      label: `Condição controlada para risco: ${risco}`,
    }));
    const fromEpcs = epcItems.map((epc) => ({
      key: `epc-${epc.id}`,
      label: `EPC disponível e conforme: ${epc.nome}`,
    }));
    const joined = [...fromRiscos, ...fromEpcs];
    if (joined.length > 0) return joined;
    return [
      { key: "amb-base-1", label: "Área sinalizada e isolada conforme necessidade" },
      { key: "amb-base-2", label: "Condições do ambiente avaliadas como seguras" },
    ];
  }, [riscos, epcItems]);

  useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const epi of epiItems) next[String(epi.id)] = false;
    setEpiChecks(next);
  }, [detalhesQuery.data?.id, epiItems]);

  useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const item of ambienteItems) next[item.key] = false;
    setAmbienteChecks(next);
  }, [detalhesQuery.data?.id, ambienteItems]);

  const epiValidado =
    epiItems.length === 0 || Object.values(epiChecks).every((checked) => checked);
  const ambienteValidado =
    ambienteItems.length === 0 || Object.values(ambienteChecks).every((checked) => checked);
  const assinaturaPendente = assinatura == null;
  const todasValidacoesConcluidas = epiValidado && ambienteValidado && !assinaturaPendente;

  const limparCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setAssinaturaDesenhada(false);
    lastPointRef.current = null;
    isDrawingRef.current = false;
  };

  const getPointFromEvent = (
    event: React.PointerEvent<HTMLCanvasElement>,
  ): { x: number; y: number } => {
    const rect = event.currentTarget.getBoundingClientRect();
    const scaleX = event.currentTarget.width / rect.width;
    const scaleY = event.currentTarget.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  };

  const desenharNoCanvas = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  };

  const handleAssinatura = () => {
    const canvas = canvasRef.current;
    if (!canvas || !assinaturaDesenhada) {
      toast.error("Assine no campo antes de confirmar.");
      return;
    }
    setAssinatura(canvas.toDataURL("image/png"));
    setShowSignatureModal(false);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = getPointFromEvent(event);
    isDrawingRef.current = true;
    lastPointRef.current = point;
    setAssinaturaDesenhada(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !lastPointRef.current) return;
    const current = getPointFromEvent(event);
    desenharNoCanvas(lastPointRef.current, current);
    lastPointRef.current = current;
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.releasePointerCapture(event.pointerId);
    isDrawingRef.current = false;
    lastPointRef.current = null;
  };

  const handleIniciarAtividade = async () => {
    if (todasValidacoesConcluidas) {
      if (!taskContext?.tipoTarefaId) {
        toast.error("Atividade não identificada. Selecione a atividade novamente.");
        router.push("/selecionar-tarefa");
        return;
      }

      try {
        setIsSubmitting(true);
        const created = await criarCheckinMutation.mutateAsync({
          tipoTarefaId: taskContext.tipoTarefaId,
        });
        const checkinId = created?.id;
        if (!checkinId) {
          throw new Error("Não foi possível criar o check-in.");
        }

        for (const epi of epiItems) {
          await validarEpiMutation.mutateAsync({
            checkinId,
            epiId: epi.id,
            validado: true,
          });
        }

        for (const item of ambienteItems) {
          await validarAmbienteMutation.mutateAsync({
            checkinId,
            condicao: item.label,
            dentro_parametros: true,
          });
        }

        const finalizado = await finalizarCheckinMutation.mutateAsync({
          checkinId,
          assinaturaPNG: assinatura ?? "assinatura-digital-placeholder",
          formularioRespostas: taskContext.formularioRespostas ?? {},
        });

        toast.success(`Ordem de Serviço emitida com sucesso: ${finalizado.numero}`);
        setOrdemEmitida({
          numero: finalizado.numero,
          nomeTarefa: detalhesQuery.data?.nome ?? taskContext.nomeTarefa ?? "Atividade",
          emitidaEm: new Date().toLocaleString("pt-BR"),
          riscos,
          epis: epiItems.map((epi) => epi.nome),
          epcs: epcItems.map((epc) => epc.nome),
          validacoesAmbiente: ambienteItems.map((item) => item.label),
          colaborador: user?.name?.trim() || "Colaborador",
          matricula: user?.matricula?.trim() || "Não informado",
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Erro ao emitir a Ordem de Serviço.";
        toast.error(message);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const exportarOrdemPdf = () => {
    if (!ordemEmitida || typeof window === "undefined") return;
    const popup = window.open("", "_blank", "width=900,height=700");
    if (!popup) return;
    const html = `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8" /><title>${escapeHtml(ordemEmitida.numero)}</title>
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
<h1>Ordem de Serviço ${escapeHtml(ordemEmitida.numero)}</h1>
<p class="sub">Documento de segurança por atividade - emissão estruturada</p>
<div class="grid">
  <div class="box"><div class="label">Atividade</div><div class="value">${escapeHtml(ordemEmitida.nomeTarefa)}</div></div>
  <div class="box"><div class="label">OS / Emissão</div><div class="value">${escapeHtml(ordemEmitida.numero)} - ${escapeHtml(ordemEmitida.emitidaEm)}</div></div>
  <div class="box"><div class="label">Colaborador</div><div class="value">${escapeHtml(ordemEmitida.colaborador)}</div></div>
  <div class="box"><div class="label">Matrícula</div><div class="value">${escapeHtml(ordemEmitida.matricula)}</div></div>
</div>
<div class="section"><h2>1. Riscos da atividade</h2><ul>${ordemEmitida.riscos.map((r) => `<li>${escapeHtml(r)}</li>`).join("") || "<li>Não informado</li>"}</ul></div>
<div class="section"><h2>2. EPIs obrigatórios</h2><ul>${ordemEmitida.epis.map((e) => `<li>${escapeHtml(e)}</li>`).join("") || "<li>Não informado</li>"}</ul></div>
<div class="section"><h2>3. EPCs exigidos</h2><ul>${ordemEmitida.epcs.map((e) => `<li>${escapeHtml(e)}</li>`).join("") || "<li>Não informado</li>"}</ul></div>
<div class="section"><h2>4. Validação do ambiente</h2><ul>${ordemEmitida.validacoesAmbiente.map((v) => `<li>${escapeHtml(v)} - OK</li>`).join("") || "<li>Não informado</li>"}</ul></div>
<div class="section">
<h2>5. Procedimento em caso de acidente de trabalho (CAT)</h2>
<ul>${PROCEDIMENTO_ACIDENTE.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul>
<p class="obs"><strong>Observação legal:</strong> comunicação imediata e abertura de CAT devem seguir os prazos e requisitos legais aplicáveis.</p>
</div>
<script>window.onload=()=>window.print();</script>
</body></html>`;
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
  };

  const exportarOrdemPng = () => {
    if (!ordemEmitida || typeof window === "undefined") return;
    const lines: string[] = [
      `ORDEM DE SERVICO: ${ordemEmitida.numero}`,
      `Atividade: ${ordemEmitida.nomeTarefa}`,
      `Emitida em: ${ordemEmitida.emitidaEm}`,
      `Colaborador: ${ordemEmitida.colaborador} | Matricula: ${ordemEmitida.matricula}`,
      "",
      "1) Riscos da atividade:",
      ...ordemEmitida.riscos.map((r) => `- ${r}`),
      "",
      "2) EPIs obrigatorios:",
      ...ordemEmitida.epis.map((e) => `- ${e}`),
      "",
      "3) EPCs exigidos:",
      ...ordemEmitida.epcs.map((e) => `- ${e}`),
      "",
      "4) Validacao do ambiente:",
      ...ordemEmitida.validacoesAmbiente.map((v) => `- ${v} (OK)`),
      "",
      "5) Procedimento em caso de acidente (CAT):",
      ...PROCEDIMENTO_ACIDENTE.map((p) => `- ${p}`),
    ];
    const canvas = document.createElement("canvas");
    canvas.width = 1400;
    canvas.height = Math.max(1200, 80 + lines.length * 30);
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
    ctx.fillText(ordemEmitida.numero, 40, 104);

    ctx.fillStyle = "#111827";
    ctx.font = "20px Arial";
    let y = 165;
    for (const line of lines) {
      const wrapped = line.match(/.{1,120}(\s|$)/g) ?? [line];
      for (const piece of wrapped) {
        const text = piece.trim();
        if (text.length > 0) {
          ctx.fillText(text, 40, y);
        }
        y += 28;
      }
    }

    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${ordemEmitida.numero}.png`;
    a.click();
  };

  const concluirPosEmissao = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(SESSION_TASK_CONTEXT_KEY);
    }
    setOrdemEmitida(null);
    router.push("/selecionar-tarefa");
  };

  useEffect(() => {
    if (!showSignatureModal) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setAssinaturaDesenhada(false);
    lastPointRef.current = null;
    isDrawingRef.current = false;
  }, [showSignatureModal]);

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 px-4 py-3 sm:p-6">
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-5 sm:py-4">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-start gap-2 sm:items-center sm:gap-3">
            <Shield className="mt-0.5 h-6 w-6 shrink-0 text-blue-600 sm:mt-0 sm:h-7 sm:w-7" />
            <div className="min-w-0">
              <h1 className="text-xl font-bold leading-tight text-slate-900 sm:text-2xl md:text-3xl">
                Segurança em Primeiro Lugar
              </h1>
              <p className="mt-0.5 text-xs text-slate-600 sm:text-sm">
                Validações vinculadas à atividade selecionada
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl pt-4 sm:pt-6">
        <Alert className="mb-4 border-blue-300 bg-blue-50">
          <AlertDescription className="text-blue-900">
            <strong>Atividade selecionada:</strong>{" "}
            {detalhesQuery.data?.nome ?? taskContext?.nomeTarefa ?? "Carregando..."}
          </AlertDescription>
        </Alert>

        <Alert className="mb-6 bg-amber-50 border-amber-300">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 ml-2">
            <strong>Atenção:</strong> valide os EPIs e o ambiente de acordo com os riscos da atividade.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-blue-200 bg-white shadow-sm">
              <CardHeader className="border-b border-blue-100 bg-blue-50/70">
                <CardTitle className="text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className={`h-5 w-5 ${epiValidado ? "text-green-400" : "text-gray-400"}`} />
                  Validação de EPIs
                </CardTitle>
                <CardDescription className="text-slate-600">
                  EPIs vinculados à atividade selecionada
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {detalhesQuery.isLoading ? (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando EPIs da atividade...
                  </div>
                ) : (
                  <div className="space-y-3">
                    {epiItems.map((epi) => {
                      const key = String(epi.id);
                      return (
                        <div key={epi.id} className="flex items-center space-x-3 rounded-lg border border-blue-100 bg-blue-50/50 p-3">
                          <Checkbox
                            id={`epi-${epi.id}`}
                            checked={Boolean(epiChecks[key])}
                            onCheckedChange={(checked) =>
                              setEpiChecks((prev) => ({ ...prev, [key]: checked === true }))
                            }
                            className="border-blue-500"
                          />
                          <label htmlFor={`epi-${epi.id}`} className="text-slate-800 cursor-pointer flex-1">
                            {epi.nome}
                          </label>
                        </div>
                      );
                    })}
                    {epiItems.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        Nenhum EPI específico cadastrado para esta atividade.
                      </p>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-white shadow-sm">
              <CardHeader className="border-b border-blue-100 bg-blue-50/70">
                <CardTitle className="text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className={`h-5 w-5 ${ambienteValidado ? "text-green-400" : "text-gray-400"}`} />
                  Validação do Ambiente
                </CardTitle>
                <CardDescription className="text-slate-600">
                  Condições compatíveis com riscos e EPCs da atividade
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {detalhesQuery.isLoading ? (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando condições de ambiente...
                  </div>
                ) : (
                  <div className="space-y-3">
                    {ambienteItems.map((item) => (
                      <div key={item.key} className="flex items-center space-x-3 rounded-lg border border-blue-100 bg-blue-50/50 p-3">
                        <Checkbox
                          id={`ambiente-${item.key}`}
                          checked={Boolean(ambienteChecks[item.key])}
                          onCheckedChange={(checked) =>
                            setAmbienteChecks((prev) => ({
                              ...prev,
                              [item.key]: checked === true,
                            }))
                          }
                          className="border-blue-500"
                        />
                        <label htmlFor={`ambiente-${item.key}`} className="text-slate-800 cursor-pointer flex-1">
                          {item.label}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-blue-200 bg-white shadow-sm">
              <CardHeader className="border-b border-blue-100 bg-blue-50/70">
                <CardTitle className="text-slate-900 flex items-center gap-2">
                  <Signature className={`h-5 w-5 ${!assinaturaPendente ? "text-green-400" : "text-gray-400"}`} />
                  Assinatura Digital
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {assinatura ? (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                      <p className="text-green-400 text-sm font-medium">✓ Assinado</p>
                      <p className="text-slate-500 text-xs mt-1">
                        {new Date().toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
                      onClick={() => setAssinatura(null)}
                    >
                      Assinar Novamente
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={() => setShowSignatureModal(true)}
                  >
                    Assinar Digitalmente
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-white shadow-sm">
              <CardHeader className="border-b border-blue-100 bg-blue-50/70">
                <CardTitle className="text-slate-900">Status</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700">EPIs Validados</span>
                    <span className={epiValidado ? "text-green-400" : "text-red-400"}>
                      {epiValidado ? "✓" : "✗"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700">Ambiente Validado</span>
                    <span className={ambienteValidado ? "text-green-400" : "text-red-400"}>
                      {ambienteValidado ? "✓" : "✗"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700">Assinatura Digital</span>
                    <span className={!assinaturaPendente ? "text-green-400" : "text-red-400"}>
                      {!assinaturaPendente ? "✓" : "✗"}
                    </span>
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="mb-2 text-xs text-slate-600">
                    {todasValidacoesConcluidas ? (
                      <span className="text-green-400">✓ Pronto para iniciar atividade</span>
                    ) : (
                      <span className="text-amber-400">⚠ Complete todas as validações</span>
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Button
              className={`w-full h-12 text-lg font-semibold ${
                todasValidacoesConcluidas
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-gray-500 cursor-not-allowed"
              }`}
              disabled={!todasValidacoesConcluidas || isSubmitting}
              onClick={handleIniciarAtividade}
            >
              {isSubmitting ? "Emitindo Ordem de Serviço..." : "Iniciar Atividade"}
            </Button>
          </div>
        </div>
      </div>

      {showSignatureModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Assinatura Digital</CardTitle>
              <CardDescription>
                Assine no espaço abaixo para confirmar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="overflow-hidden rounded-lg border-2 border-gray-300 bg-white">
                  <canvas
                    ref={canvasRef}
                    width={720}
                    height={220}
                    className="h-36 w-full touch-none"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Assine com o dedo (celular) ou mouse.
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowSignatureModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={limparCanvas}
                >
                  Limpar
                </Button>
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={handleAssinatura}
                >
                  Confirmar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {ordemEmitida && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Ordem de Serviço emitida</CardTitle>
              <CardDescription>
                OS <strong>{ordemEmitida.numero}</strong> gerada com sucesso. Escolha como exportar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded border bg-slate-50 p-3 text-sm text-slate-700">
                <p><strong>Atividade:</strong> {ordemEmitida.nomeTarefa}</p>
                <p><strong>Emitida em:</strong> {ordemEmitida.emitidaEm}</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={exportarOrdemPdf}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Exportar PDF
                </Button>
                <Button variant="outline" onClick={exportarOrdemPng}>
                  <ImageDown className="mr-2 h-4 w-4" />
                  Exportar PNG
                </Button>
              </div>
              <Button className="w-full" onClick={concluirPosEmissao}>
                Concluir
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
