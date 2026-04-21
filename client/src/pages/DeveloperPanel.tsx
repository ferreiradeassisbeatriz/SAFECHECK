"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Plus, Trash2, Lock, User } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Admin {
  id: number;
  name: string;
  email: string;
  matricula: string;
  setor: string;
  gestorImediato: string;
  ativo: boolean;
  criadoEm: string;
}

const adminsExemplo: Admin[] = [
  {
    id: 1,
    name: "Carlos Técnico",
    email: "carlos.tecnico@obra.com",
    matricula: "ADM-001",
    setor: "Segurança",
    gestorImediato: "Gerente de Obra",
    ativo: true,
    criadoEm: "2026-04-15"
  },
  {
    id: 2,
    name: "Fernanda Gestora",
    email: "fernanda.gestora@obra.com",
    matricula: "ADM-002",
    setor: "Gestão",
    gestorImediato: "Diretor",
    ativo: true,
    criadoEm: "2026-04-10"
  },
  {
    id: 3,
    name: "Roberto Inspetor",
    email: "roberto.inspetor@obra.com",
    matricula: "ADM-003",
    setor: "Inspeção",
    gestorImediato: "Gerente de Obra",
    ativo: false,
    criadoEm: "2026-03-20"
  }
];

export default function DeveloperPanel() {
  const [admins, setAdmins] = useState<Admin[]>(adminsExemplo);
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    matricula: "",
    setor: "",
    gestorImediato: ""
  });
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const handleAddAdmin = () => {
    if (!formData.name || !formData.email || !formData.matricula) {
      alert("Preencha todos os campos obrigatórios");
      return;
    }

    const newAdmin: Admin = {
      id: Math.max(...admins.map(a => a.id), 0) + 1,
      ...formData,
      ativo: true,
      criadoEm: new Date().toISOString().split('T')[0]
    };

    setAdmins([...admins, newAdmin]);
    setFormData({ name: "", email: "", matricula: "", setor: "", gestorImediato: "" });
    setOpenDialog(false);
  };

  const handleToggleAdmin = (id: number) => {
    setAdmins(admins.map(admin =>
      admin.id === id ? { ...admin, ativo: !admin.ativo } : admin
    ));
  };

  const handleDeleteAdmin = (id: number) => {
    setAdmins(admins.filter(admin => admin.id !== id));
    setDeleteConfirm(null);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-6 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Lock className="h-8 w-8 text-red-600" />
            <h1 className="text-3xl font-bold text-slate-900">Painel Developer</h1>
          </div>
          <p className="text-slate-600 mt-1">Gerenciamento de usuários administradores</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Alert de Acesso Restrito */}
        <Alert className="mb-6 bg-red-50 border-red-300">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 ml-2">
            <strong>Acesso Restrito:</strong> Este painel é exclusivo para o usuário developer. 
            Apenas Beatriz Assis pode gerenciar usuários administradores.
          </AlertDescription>
        </Alert>

        {/* Informações do Developer */}
        <Card className="mb-6 bg-linear-to-r from-red-50 to-red-100 border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-red-600" />
              Usuário Developer Ativo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-slate-600">Nome</p>
                <p className="font-semibold text-slate-900">Beatriz Assis</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Email</p>
                <p className="font-semibold text-slate-900">beaatrizfas@gmail.com</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Função</p>
                <p className="font-semibold text-slate-900">Developer</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seção de Gerenciamento */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Usuários Administradores</h2>
              <p className="text-slate-600 mt-1">Total: {admins.length} usuários</p>
            </div>
            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Administrador
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Administrador</DialogTitle>
                  <DialogDescription>
                    Preencha os dados do novo usuário administrador
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Nome Completo *</label>
                    <Input
                      placeholder="Ex: João da Silva"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email *</label>
                    <Input
                      type="email"
                      placeholder="Ex: joao@obra.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Matrícula *</label>
                    <Input
                      placeholder="Ex: ADM-004"
                      value={formData.matricula}
                      onChange={(e) => setFormData({ ...formData, matricula: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Setor</label>
                    <Input
                      placeholder="Ex: Segurança"
                      value={formData.setor}
                      onChange={(e) => setFormData({ ...formData, setor: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Gestor Imediato</label>
                    <Input
                      placeholder="Ex: Gerente de Obra"
                      value={formData.gestorImediato}
                      onChange={(e) => setFormData({ ...formData, gestorImediato: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setOpenDialog(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                      onClick={handleAddAdmin}
                    >
                      Criar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Tabela de Administradores */}
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 font-semibold text-slate-900">Nome</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900">Email</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900">Matrícula</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900">Setor</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900">Criado em</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admins.map((admin) => (
                      <tr key={admin.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4 text-slate-900 font-medium">{admin.name}</td>
                        <td className="py-3 px-4 text-slate-600">{admin.email}</td>
                        <td className="py-3 px-4 text-slate-600">{admin.matricula}</td>
                        <td className="py-3 px-4 text-slate-600">{admin.setor}</td>
                        <td className="py-3 px-4">
                          <Badge className={admin.ativo ? "bg-green-600" : "bg-gray-600"}>
                            {admin.ativo ? "Ativo" : "Inativo"}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-sm">{admin.criadoEm}</td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleAdmin(admin.id)}
                              className={admin.ativo ? "text-orange-600 border-orange-300" : "text-green-600 border-green-300"}
                            >
                              {admin.ativo ? "Inativar" : "Ativar"}
                            </Button>
                            {deleteConfirm === admin.id ? (
                              <div className="flex gap-1">
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteAdmin(admin.id)}
                                >
                                  Confirmar
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setDeleteConfirm(null)}
                                >
                                  Cancelar
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:bg-red-50"
                                onClick={() => setDeleteConfirm(admin.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
