"use client";

import { DynamicTaskForm } from "@/components/DynamicTaskForm";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { SESSION_TASK_CONTEXT_KEY } from "@shared/const";
import {
  parseFormularioSchema,
  valoresIniciais,
  validarFormularioDinamico,
  type FormularioDinamicoSchema,
} from "@shared/formularioDinamico";
import { ArrowRight, AlertTriangle, ChevronLeft, HardHat, Loader2, LogOut, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const getRiscoBadgeColor = (risco: string) => {
  switch (risco) {
    case "critico":
      return "bg-red-600 text-white";
    case "alto":
      return "bg-orange-600 text-white";
    case "medio":
      return "bg-yellow-600 text-white";
    case "baixo":
      return "bg-green-600 text-white";
    default:
      return "bg-gray-600 text-white";
  }
};

function asRiscos(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string");
}

export default function SelectTask() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading, logout } = useAuth();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [formValues, setFormValues] = useState<
    Record<string, string | number | boolean>
  >({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  const tiposQuery = trpc.operario.getTiposTarefa.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const detalhesQuery = trpc.operario.getTipoTarefaDetalhes.useQuery(
    { id: selectedId! },
    { enabled: isAuthenticated && selectedId != null },
  );

  const schema: FormularioDinamicoSchema | null = useMemo(
    () => parseFormularioSchema(detalhesQuery.data?.formularioSchema),
    [detalhesQuery.data?.formularioSchema],
  );

  useEffect(() => {
    if (!detalhesQuery.data) return;
    const s = parseFormularioSchema(detalhesQuery.data.formularioSchema);
    setFormValues(valoresIniciais(s));
    setFormError(null);
  }, [detalhesQuery.data?.id]);

  const handleProsseguir = () => {
    if (selectedId == null || !detalhesQuery.data) return;
    const err = validarFormularioDinamico(schema, formValues);
    if (err) {
      setFormError(err);
      return;
    }

    const respostas: Record<string, unknown> = { ...formValues };
    for (const f of schema?.fields ?? []) {
      if (f.type === "number") {
        const raw = respostas[f.id];
        if (typeof raw === "string" && raw.trim() !== "") {
          const n = Number(raw);
          if (Number.isFinite(n)) respostas[f.id] = n;
        }
      }
    }

    sessionStorage.setItem(
      SESSION_TASK_CONTEXT_KEY,
      JSON.stringify({
        tipoTarefaId: selectedId,
        nomeTarefa: detalhesQuery.data.nome,
        formularioRespostas: respostas,
      }),
    );
    router.push("/emissao-ordem-servico");
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-slate-50 to-slate-100">
        <p className="text-slate-600">Carregando…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-slate-50 to-slate-100">
        <p className="text-slate-600">Redirecionando para o login…</p>
      </div>
    );
  }

  const tarefas = tiposQuery.data ?? [];
  const det = detalhesQuery.data;
  const riscos = det ? asRiscos(det.riscos) : [];

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 px-3 py-3 sm:px-5 sm:py-5">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white sm:h-11 sm:w-11 md:h-12 md:w-12">
                <HardHat className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl md:text-3xl lg:text-4xl">
                  Qual atividade você vai realizar?
                </h1>
                <p className="mt-1 text-xs leading-relaxed text-slate-600 sm:text-base">
                  Toque em uma atividade na lista. Em seguida o sistema mostra os{" "}
                  <strong>riscos</strong>, os <strong>EPIs</strong> e os <strong>EPCs</strong>{" "}
                  necessários antes de seguir para a validação de segurança.
                </p>
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

        {tiposQuery.isError ? (
          <p className="text-red-600">
            Não foi possível carregar as tarefas. Verifique se você está logado.
          </p>
        ) : null}

        <div className="flex flex-col gap-4 sm:gap-6 lg:grid lg:grid-cols-3 lg:items-start">
          <section
            aria-label="Lista de atividades"
            className={`space-y-3 ${selectedId != null ? "order-2 lg:order-1 lg:col-span-2" : "order-1 lg:col-span-2"}`}
          >
            {selectedId != null ? (
              <p className="text-sm font-medium text-slate-500 lg:hidden">
                Outras atividades
              </p>
            ) : null}
            {tiposQuery.isLoading ? (
              <p className="flex items-center gap-2 text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando atividades…
              </p>
            ) : tarefas.length === 0 ? (
              <p className="text-slate-600">
                Nenhuma atividade cadastrada. Peça ao administrador para cadastrar
                tipos de tarefa no sistema.
              </p>
            ) : (
              tarefas.map((tarefa) => (
                <Card
                  key={tarefa.id}
                  role="button"
                  tabIndex={0}
                  className={`cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    selectedId === tarefa.id
                      ? "bg-blue-50 ring-2 ring-blue-600 shadow-md"
                      : "hover:border-blue-300 hover:shadow-md"
                  }`}
                  onClick={() => {
                    setSelectedId(tarefa.id);
                    setFormError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedId(tarefa.id);
                      setFormError(null);
                    }
                  }}
                >
                  <CardContent className="px-4 py-4 sm:px-6 sm:py-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-slate-900 sm:text-base md:text-lg">
                            {tarefa.nome}
                          </h3>
                          <Badge
                            className={getRiscoBadgeColor(tarefa.grauRisco)}
                          >
                            {tarefa.grauRisco.toUpperCase()}
                          </Badge>
                        </div>
                        {tarefa.descricao ? (
                          <p className="text-xs leading-relaxed text-slate-600 sm:text-sm">
                            {tarefa.descricao}
                          </p>
                        ) : null}
                        <p className="mt-2 text-xs text-slate-500">
                          Toque para ver riscos, EPIs e EPCs desta atividade
                        </p>
                      </div>
                      <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </section>

          <aside
            aria-label="Detalhes da atividade selecionada"
            className={`${selectedId != null ? "order-1 lg:order-2" : "order-2"} lg:col-span-1`}
          >
            {selectedId != null && detalhesQuery.isLoading ? (
              <Card className="border-blue-200 shadow-lg lg:sticky lg:top-6">
                <CardContent className="flex items-center justify-center gap-2 py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  <span className="text-slate-600">Carregando riscos e equipamentos…</span>
                </CardContent>
              </Card>
            ) : null}

            {selectedId != null && detalhesQuery.isError ? (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-6">
                  <p className="text-sm text-red-800">
                    Não foi possível carregar os detalhes desta atividade. Tente
                    novamente.
                  </p>
                </CardContent>
              </Card>
            ) : null}

            {selectedId != null &&
            !detalhesQuery.isLoading &&
            !detalhesQuery.isError &&
            !det ? (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="space-y-3 pt-6">
                  <p className="text-sm text-amber-900">
                    Esta atividade não foi encontrada ou foi desativada.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedId(null)}
                  >
                    Voltar à lista
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            {selectedId != null && det ? (
              <Card className="border-blue-200 shadow-lg lg:sticky lg:top-6">
                <CardHeader className="rounded-t-lg bg-linear-to-r from-blue-600 to-blue-700 text-white">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="-ml-2 mb-2 w-fit text-white hover:bg-white/10 hover:text-white"
                    onClick={() => {
                      setSelectedId(null);
                      setFormError(null);
                    }}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Escolher outra atividade
                  </Button>
                  <CardTitle className="text-base leading-snug sm:text-lg md:text-xl">
                    {det.nome}
                  </CardTitle>
                  <Badge
                    className={`mt-2 w-fit ${getRiscoBadgeColor(det.grauRisco)}`}
                  >
                    Grau de risco: {det.grauRisco.toUpperCase()}
                  </Badge>
                </CardHeader>

                <CardContent className="space-y-5 px-4 pt-5 pb-4 sm:space-y-6 sm:px-6 sm:pt-6">
                  {det.descricao ? (
                    <p className="text-xs leading-relaxed text-slate-600 sm:text-sm">
                      {det.descricao}
                    </p>
                  ) : null}

                  <div className="rounded-lg border border-red-100 bg-red-50/80 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
                      <h4 className="text-sm font-semibold text-slate-900 sm:text-base">
                        Riscos desta atividade
                      </h4>
                    </div>
                    <ul className="space-y-2">
                      {riscos.map((risco, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="mt-0.5 font-bold text-red-600">•</span>
                          <span className="text-xs text-slate-800 sm:text-sm">{risco}</span>
                        </li>
                      ))}
                      {riscos.length === 0 ? (
                        <li className="text-sm text-slate-500">
                          Nenhum risco cadastrado para esta tarefa.
                        </li>
                      ) : null}
                    </ul>
                  </div>

                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <Shield className="h-5 w-5 shrink-0 text-blue-600" />
                      <h4 className="text-sm font-semibold text-slate-900 sm:text-base">
                        EPIs necessários (uso obrigatório conforme avaliação local)
                      </h4>
                    </div>
                    <ul className="space-y-2">
                      {(det.epiList ?? []).map((epi) => (
                        <li
                          key={epi.id}
                          className="flex gap-2 rounded-md border border-blue-200 bg-white px-3 py-2 text-xs text-slate-800 sm:text-sm"
                        >
                          <span className="text-blue-600">✓</span>
                          <span>{epi.nome}</span>
                        </li>
                      ))}
                    </ul>
                    {(det.epiList ?? []).length === 0 ? (
                      <p className="text-sm text-slate-500">
                        Nenhum EPI vinculado a esta atividade no cadastro.
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <Shield className="h-5 w-5 shrink-0 text-emerald-600" />
                      <h4 className="text-sm font-semibold text-slate-900 sm:text-base">
                        EPCs necessários (medidas coletivas no ambiente)
                      </h4>
                    </div>
                    <ul className="space-y-2">
                      {(det.epcList ?? []).map((epc) => (
                        <li
                          key={epc.id}
                          className="flex gap-2 rounded-md border border-emerald-200 bg-white px-3 py-2 text-xs text-slate-800 sm:text-sm"
                        >
                          <span className="text-emerald-600">✓</span>
                          <span>{epc.nome}</span>
                        </li>
                      ))}
                    </ul>
                    {(det.epcList ?? []).length === 0 ? (
                      <p className="text-sm text-slate-500">
                        Nenhum EPC vinculado a esta atividade no cadastro.
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
                    <CardDescription className="mb-3 font-medium text-slate-800">
                      Formulário complementar (se houver)
                    </CardDescription>
                    <DynamicTaskForm
                      schema={schema}
                      values={formValues}
                      onChange={setFormValues}
                      error={formError}
                    />
                  </div>

                  <Button
                    className="w-full bg-blue-600 px-3 py-3 text-left text-xs leading-snug text-white hover:bg-blue-700 sm:px-4 sm:py-2 sm:text-center sm:text-sm"
                    disabled={detalhesQuery.isFetching}
                    onClick={handleProsseguir}
                  >
                    <span className="block sm:hidden">
                      Li os riscos e quero prosseguir para validação
                    </span>
                    <span className="hidden sm:block">
                      Li os riscos e os EPIs/EPCs — prosseguir
                    </span>
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            {selectedId == null ? (
              <Card className="border-dashed border-slate-300 bg-slate-50 lg:sticky lg:top-6">
                <CardContent className="py-10 text-center">
                  <HardHat className="mx-auto mb-3 h-10 w-10 text-slate-400" />
                  <p className="text-slate-600">
                    Selecione uma atividade na lista para exibir aqui os{" "}
                    <strong>riscos</strong>, os <strong>EPIs</strong> e os{" "}
                    <strong>EPCs</strong> exigidos para essa tarefa.
                  </p>
                </CardContent>
              </Card>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}
