"use client";

import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Loader2, LogOut, Plus, Trash2, Lock, User } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

export default function DeveloperPanel() {
  const { user, loading, logout } = useAuth({ redirectOnUnauthenticated: true });
  const utils = trpc.useUtils();

  const adminsQuery = trpc.developer.getAllAdmins.useQuery(undefined, {
    enabled: !!user && user.role === "developer",
  });

  const criarAdminMutation = trpc.developer.criarAdmin.useMutation({
    onSuccess: async () => {
      toast.success("Administrador criado com sucesso.");
      setOpenDialog(false);
      setFormData({ name: "", email: "", matricula: "", setor: "", gestorImediato: "" });
      await utils.developer.getAllAdmins.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Não foi possível criar o administrador.");
    },
  });

  const inativarMutation = trpc.developer.inativarUsuario.useMutation({
    onSuccess: async () => {
      toast.success("Usuário inativado.");
      await utils.developer.getAllAdmins.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Falha ao inativar.");
    },
  });

  const ativarMutation = trpc.developer.ativarUsuario.useMutation({
    onSuccess: async () => {
      toast.success("Usuário ativado.");
      await utils.developer.getAllAdmins.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Falha ao ativar.");
    },
  });

  const excluirMutation = trpc.developer.excluirUsuario.useMutation({
    onSuccess: async () => {
      toast.success("Usuário removido.");
      setDeleteConfirm(null);
      await utils.developer.getAllAdmins.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Falha ao excluir.");
    },
  });

  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    matricula: "",
    setor: "",
    gestorImediato: "",
  });
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const handleAddAdmin = () => {
    if (!formData.name.trim() || !formData.email.trim() || !formData.matricula.trim()) {
      toast.error("Preencha nome, e-mail e matrícula.");
      return;
    }
    criarAdminMutation.mutate({
      name: formData.name.trim(),
      email: formData.email.trim(),
      matricula: formData.matricula.trim(),
      setor: formData.setor.trim(),
      gestorImediato: formData.gestorImediato.trim(),
    });
  };

  const handleToggleAdmin = (id: number, ativo: boolean) => {
    if (ativo) {
      inativarMutation.mutate({ userId: id });
    } else {
      ativarMutation.mutate({ userId: id });
    }
  };

  const handleDeleteAdmin = (id: number) => {
    excluirMutation.mutate({ userId: id });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-slate-50 to-slate-100">
        <p className="flex items-center gap-2 text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          Carregando…
        </p>
      </div>
    );
  }

  if (!user) {
    return <div className="min-h-screen p-6 text-slate-600">Redirecionando…</div>;
  }

  if (user.role !== "developer") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-slate-50 to-slate-100 p-6">
        <p className="text-center text-red-600">Acesso não autorizado. Apenas perfil developer.</p>
      </div>
    );
  }

  const admins = adminsQuery.data ?? [];
  const mutatingToggle = inativarMutation.isPending || ativarMutation.isPending;

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100">
      <div className="border-b border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-5 sm:py-3.5">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <div className="flex min-w-0 items-start gap-2 sm:items-center sm:gap-3">
            <Lock className="mt-0.5 h-6 w-6 shrink-0 text-red-600 sm:mt-0 sm:h-7 sm:w-7" />
            <div className="min-w-0">
              <h1 className="text-xl font-bold leading-tight text-slate-900 sm:text-2xl md:text-3xl">
                Painel Developer
              </h1>
              <p className="mt-0.5 text-xs leading-snug text-slate-600 sm:text-sm">
                Gerenciamento de usuários administradores
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

      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-5 sm:py-6">
        <Alert className="mb-6 border-red-300 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="ml-2 text-red-800">
            <strong>Acesso restrito:</strong> este painel é exclusivo para o perfil developer.
          </AlertDescription>
        </Alert>

        <Card className="mb-6 border-red-200 bg-linear-to-r from-red-50 to-red-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-red-600" />
              Usuário developer (sessão)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-slate-600">Nome</p>
                <p className="font-semibold text-slate-900">{user.name ?? "—"}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">E-mail</p>
                <p className="font-semibold text-slate-900">{user.email ?? "—"}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Função</p>
                <p className="font-semibold text-slate-900 capitalize">{user.role}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Usuários administradores</h2>
              <p className="mt-1 text-sm text-slate-600">
                Total: {adminsQuery.isLoading ? "…" : admins.length} usuário(s) com perfil admin
              </p>
            </div>
            <Button
              type="button"
              className="gap-2 bg-blue-600 hover:bg-blue-700"
              onClick={() => setOpenDialog(true)}
            >
              <Plus className="h-4 w-4" />
              Novo administrador
            </Button>
          </div>

          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar novo administrador</DialogTitle>
                <DialogDescription>Os dados serão gravados no banco de dados.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="dev-admin-nome">Nome completo *</Label>
                  <Input
                    id="dev-admin-nome"
                    placeholder="Ex.: João da Silva"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dev-admin-email">E-mail *</Label>
                  <Input
                    id="dev-admin-email"
                    type="email"
                    placeholder="Ex.: joao@obra.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dev-admin-mat">Matrícula *</Label>
                  <Input
                    id="dev-admin-mat"
                    placeholder="Ex.: ADM-004"
                    value={formData.matricula}
                    onChange={(e) => setFormData({ ...formData, matricula: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dev-admin-setor">Setor</Label>
                  <Input
                    id="dev-admin-setor"
                    placeholder="Ex.: Segurança"
                    value={formData.setor}
                    onChange={(e) => setFormData({ ...formData, setor: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dev-admin-gestor">Gestor imediato</Label>
                  <Input
                    id="dev-admin-gestor"
                    placeholder="Ex.: Gerente de obra"
                    value={formData.gestorImediato}
                    onChange={(e) => setFormData({ ...formData, gestorImediato: e.target.value })}
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setOpenDialog(false)}>
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    disabled={criarAdminMutation.isPending}
                    onClick={handleAddAdmin}
                  >
                    {criarAdminMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Criando…
                      </>
                    ) : (
                      "Criar"
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Card>
            <CardContent className="pt-6">
              {adminsQuery.isLoading ? (
                <p className="flex items-center gap-2 text-slate-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando administradores…
                </p>
              ) : adminsQuery.isError ? (
                <p className="text-red-600">{adminsQuery.error.message}</p>
              ) : admins.length === 0 ? (
                <p className="text-slate-600">Nenhum administrador cadastrado no banco.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px]">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="px-4 py-3 text-left font-semibold text-slate-900">Nome</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-900">E-mail</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-900">Matrícula</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-900">Setor</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-900">Status</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-900">Criado em</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-900">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {admins.map((admin) => (
                        <tr key={admin.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-900">{admin.name ?? "—"}</td>
                          <td className="px-4 py-3 text-slate-600">{admin.email ?? "—"}</td>
                          <td className="px-4 py-3 text-slate-600">{admin.matricula ?? "—"}</td>
                          <td className="px-4 py-3 text-slate-600">{admin.setor ?? "—"}</td>
                          <td className="px-4 py-3">
                            <Badge className={admin.ativo ? "bg-green-600" : "bg-gray-600"}>
                              {admin.ativo ? "Ativo" : "Inativo"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">{formatDate(admin.createdAt)}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={mutatingToggle}
                                onClick={() => handleToggleAdmin(admin.id, admin.ativo)}
                                className={
                                  admin.ativo
                                    ? "border-orange-300 text-orange-600"
                                    : "border-green-300 text-green-600"
                                }
                              >
                                {admin.ativo ? "Inativar" : "Ativar"}
                              </Button>
                              {admin.id === user.id ? null : deleteConfirm === admin.id ? (
                                <div className="flex gap-1">
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    disabled={excluirMutation.isPending}
                                    onClick={() => handleDeleteAdmin(admin.id)}
                                  >
                                    Confirmar
                                  </Button>
                                  <Button type="button" variant="outline" size="sm" onClick={() => setDeleteConfirm(null)}>
                                    Cancelar
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:bg-red-50"
                                  onClick={() => setDeleteConfirm(admin.id)}
                                  title="Excluir usuário"
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
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
