"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { CheckCircle2, AlertCircle, Users, Building2, FileText, History } from "lucide-react";

const dashboardData = {
  checkinsHoje: 12,
  totalCheckins: 287,
  osPendentes: 5,
  osAssinadas: 42,
  setoresAtivos: 6
};

const chartData = [
  { dia: "Seg", checkins: 8, os: 3 },
  { dia: "Ter", checkins: 12, os: 4 },
  { dia: "Qua", checkins: 15, os: 5 },
  { dia: "Qui", checkins: 10, os: 2 },
  { dia: "Sex", checkins: 12, os: 4 },
];

const setores = [
  { id: 1, nome: "Fundação", ativo: true, operarios: 8 },
  { id: 2, nome: "Estrutura", ativo: true, operarios: 12 },
  { id: 3, nome: "Alvenaria", ativo: true, operarios: 10 },
  { id: 4, nome: "Cobertura", ativo: true, operarios: 6 },
  { id: 5, nome: "Acabamento", ativo: true, operarios: 9 },
  { id: 6, nome: "Elétrica", ativo: true, operarios: 5 },
];

const tiposTarefa = [
  { id: 1, nome: "Trabalho em Altura", risco: "critico", epis: 4, epcs: 3 },
  { id: 2, nome: "Ferramentas Elétricas", risco: "alto", epis: 3, epcs: 2 },
  { id: 3, nome: "Escavação", risco: "alto", epis: 3, epcs: 2 },
  { id: 4, nome: "Inspeção", risco: "baixo", epis: 2, epcs: 1 },
];

const ordensServico = [
  { id: 1, numero: "OS-001", operario: "João Silva", tarefa: "Trabalho em Altura", status: "assinada", data: "2026-04-20" },
  { id: 2, numero: "OS-002", operario: "Maria Santos", tarefa: "Ferramentas Elétricas", status: "assinada", data: "2026-04-20" },
  { id: 3, numero: "OS-003", operario: "Pedro Costa", tarefa: "Escavação", status: "pendente", data: "2026-04-20" },
  { id: 4, numero: "OS-004", operario: "Ana Oliveira", tarefa: "Inspeção", status: "pendente", data: "2026-04-20" },
];

const historicoCheckins = [
  { id: 1, operario: "João Silva", tarefa: "Trabalho em Altura", setor: "Cobertura", data: "2026-04-20 09:30", status: "completo" },
  { id: 2, operario: "Maria Santos", tarefa: "Ferramentas Elétricas", setor: "Estrutura", data: "2026-04-20 10:15", status: "completo" },
  { id: 3, operario: "Pedro Costa", tarefa: "Escavação", setor: "Fundação", data: "2026-04-20 08:45", status: "completo" },
];

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

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-6 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-900">Painel Administrativo</h1>
          <p className="text-slate-600 mt-1">Gestão de segurança da obra</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="setores">Setores</TabsTrigger>
            <TabsTrigger value="tarefas">Tarefas</TabsTrigger>
            <TabsTrigger value="ordens">Ordens de Serviço</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          {/* TAB: DASHBOARD */}
          <TabsContent value="dashboard" className="space-y-6 mt-6">
            {/* Métricas */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-600">Check-ins Hoje</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">{dashboardData.checkinsHoje}</div>
                  <p className="text-xs text-slate-500 mt-1">Verificações de segurança</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-600">Total de Check-ins</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">{dashboardData.totalCheckins}</div>
                  <p className="text-xs text-slate-500 mt-1">Todos os registros</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-600">OS Pendentes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-orange-600">{dashboardData.osPendentes}</div>
                  <p className="text-xs text-slate-500 mt-1">Aguardando assinatura</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-600">OS Assinadas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">{dashboardData.osAssinadas}</div>
                  <p className="text-xs text-slate-500 mt-1">Concluídas</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-600">Setores Ativos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-600">{dashboardData.setoresAtivos}</div>
                  <p className="text-xs text-slate-500 mt-1">Em operação</p>
                </CardContent>
              </Card>
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Check-ins vs Ordens de Serviço</CardTitle>
                  <CardDescription>Últimos 5 dias</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="dia" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="checkins" fill="#3b82f6" name="Check-ins" />
                      <Bar dataKey="os" fill="#10b981" name="Ordens de Serviço" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tendência de Segurança</CardTitle>
                  <CardDescription>Últimos 5 dias</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="dia" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="checkins" stroke="#3b82f6" name="Check-ins" />
                      <Line type="monotone" dataKey="os" stroke="#10b981" name="Ordens" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB: SETORES */}
          <TabsContent value="setores" className="space-y-6 mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Setores da Obra</h2>
              <Button className="bg-blue-600 hover:bg-blue-700">Novo Setor</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {setores.map((setor) => (
                <Card key={setor.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{setor.nome}</CardTitle>
                      <Badge className="bg-green-600">Ativo</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600 mb-4">
                      <Building2 className="inline h-4 w-4 mr-2" />
                      {setor.operarios} operários
                    </p>
                    <Button variant="outline" className="w-full">Editar</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* TAB: TAREFAS */}
          <TabsContent value="tarefas" className="space-y-6 mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Tipos de Tarefa</h2>
              <Button className="bg-blue-600 hover:bg-blue-700">Nova Tarefa</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-semibold text-slate-900">Tarefa</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-900">Risco</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-900">EPIs</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-900">EPCs</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-900">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {tiposTarefa.map((tarefa) => (
                    <tr key={tarefa.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 text-slate-900">{tarefa.nome}</td>
                      <td className="py-3 px-4">
                        <Badge className={getRiscoBadgeColor(tarefa.risco)}>
                          {tarefa.risco.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{tarefa.epis}</td>
                      <td className="py-3 px-4 text-slate-600">{tarefa.epcs}</td>
                      <td className="py-3 px-4">
                        <Button variant="ghost" size="sm">Editar</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* TAB: ORDENS DE SERVIÇO */}
          <TabsContent value="ordens" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Ordens Assinadas
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 px-4 font-semibold text-slate-900">Número</th>
                        <th className="text-left py-2 px-4 font-semibold text-slate-900">Operário</th>
                        <th className="text-left py-2 px-4 font-semibold text-slate-900">Tarefa</th>
                        <th className="text-left py-2 px-4 font-semibold text-slate-900">Data</th>
                        <th className="text-left py-2 px-4 font-semibold text-slate-900">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ordensServico.filter(o => o.status === "assinada").map((os) => (
                        <tr key={os.id} className="border-b border-slate-100">
                          <td className="py-2 px-4 text-slate-900">{os.numero}</td>
                          <td className="py-2 px-4 text-slate-600">{os.operario}</td>
                          <td className="py-2 px-4 text-slate-600">{os.tarefa}</td>
                          <td className="py-2 px-4 text-slate-600">{os.data}</td>
                          <td className="py-2 px-4">
                            <Button variant="ghost" size="sm">Visualizar</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  Ordens Pendentes
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 px-4 font-semibold text-slate-900">Número</th>
                        <th className="text-left py-2 px-4 font-semibold text-slate-900">Operário</th>
                        <th className="text-left py-2 px-4 font-semibold text-slate-900">Tarefa</th>
                        <th className="text-left py-2 px-4 font-semibold text-slate-900">Data</th>
                        <th className="text-left py-2 px-4 font-semibold text-slate-900">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ordensServico.filter(o => o.status === "pendente").map((os) => (
                        <tr key={os.id} className="border-b border-slate-100">
                          <td className="py-2 px-4 text-slate-900">{os.numero}</td>
                          <td className="py-2 px-4 text-slate-600">{os.operario}</td>
                          <td className="py-2 px-4 text-slate-600">{os.tarefa}</td>
                          <td className="py-2 px-4 text-slate-600">{os.data}</td>
                          <td className="py-2 px-4">
                            <Button variant="ghost" size="sm">Visualizar</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB: HISTÓRICO */}
          <TabsContent value="historico" className="space-y-6 mt-6">
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <History className="h-5 w-5 text-blue-600" />
                Histórico de Check-ins (Últimos 5 dias)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 font-semibold text-slate-900">Operário</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900">Tarefa</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900">Setor</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900">Data/Hora</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historicoCheckins.map((checkin) => (
                      <tr key={checkin.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4 text-slate-900">{checkin.operario}</td>
                        <td className="py-3 px-4 text-slate-600">{checkin.tarefa}</td>
                        <td className="py-3 px-4 text-slate-600">{checkin.setor}</td>
                        <td className="py-3 px-4 text-slate-600">{checkin.data}</td>
                        <td className="py-3 px-4">
                          <Badge className="bg-green-600">Completo</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
