"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuthLocal } from "@/hooks/useAuthLocal";
import { Shield, AlertCircle, Loader2 } from "lucide-react";

export default function Login() {
  const { isLoading, error, loginOperario, registrarOperario } = useAuthLocal();

  // Estado para login operário
  const [loginUsername, setLoginUsername] = useState("");
  const [loginSenha, setLoginSenha] = useState("");

  // Estado para registro operário
  const [regNomeCompleto, setRegNomeCompleto] = useState("");
  const [regMatricula, setRegMatricula] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regSetor, setRegSetor] = useState("");
  const [regGestor, setRegGestor] = useState("");
  const [regSenha, setRegSenha] = useState("");
  const [regSenhaConfirm, setRegSenhaConfirm] = useState("");
  const [registroSucesso, setRegistroSucesso] = useState(false);

  const redirecionarPorPerfil = (role?: string | null) => {
    if (role === "developer") {
      window.location.assign("/developer");
      return;
    }
    if (role === "admin" || role === "tst") {
      window.location.assign("/gestao-os");
      return;
    }
    window.location.assign("/selecionar-tarefa");
  };

  const handleLoginOperario = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await loginOperario(loginUsername, loginSenha);
      // Usa o perfil retornado pelo backend para evitar rota incorreta.
      redirecionarPorPerfil(result?.user?.role);
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (regSenha !== regSenhaConfirm) {
      alert("As senhas não coincidem");
      return;
    }

    if (regSenha.length !== 4 || !/^\d+$/.test(regSenha)) {
      alert("Senha deve ter exatamente 4 dígitos");
      return;
    }

    try {
      const result = await registrarOperario({
        nomeCompleto: regNomeCompleto,
        matricula: regMatricula,
        email: regEmail,
        setor: regSetor,
        gestorImediato: regGestor,
        senhaDigitos: regSenha
      });
      
      setRegistroSucesso(true);
      setRegNomeCompleto("");
      setRegMatricula("");
      setRegEmail("");
      setRegSetor("");
      setRegGestor("");
      setRegSenha("");
      setRegSenhaConfirm("");

      setTimeout(() => {
        setRegistroSucesso(false);
      }, 5000);
    } catch (err) {
      console.error("Registration failed:", err);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="h-10 w-10 text-blue-600" />
            <h1 className="text-3xl font-bold text-slate-900">SAFECHECK</h1>
          </div>
          <p className="text-slate-600">Sistema de Gestão de Segurança em Obra</p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="operario" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="operario">Acesso</TabsTrigger>
            <TabsTrigger value="registro">Cadastro</TabsTrigger>
          </TabsList>

          {/* TAB: LOGIN OPERÁRIO */}
          <TabsContent value="operario">
            <Card>
              <CardHeader>
                <CardTitle>Login</CardTitle>
                <CardDescription>
                  Acesse com matrícula, e-mail ou usuário (nome.sobrenome) e a senha de 4 dígitos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLoginOperario} className="space-y-4">
                  {error && (
                    <Alert className="bg-red-50 border-red-300">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800 ml-2">
                        {error}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div>
                    <label className="text-sm font-medium">Usuário</label>
                    <Input
                      placeholder="Matrícula, e-mail ou joao.silva"
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      disabled={isLoading}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Você pode usar a matrícula, o e-mail cadastrado ou o formato primeironome.últimosobrenome
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Senha</label>
                    <Input
                      type="password"
                      placeholder="••••"
                      value={loginSenha}
                      onChange={(e) => setLoginSenha(e.target.value)}
                      maxLength={4}
                      disabled={isLoading}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      4 dígitos
                    </p>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      "Entrar"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: REGISTRO OPERÁRIO */}
          <TabsContent value="registro">
            <Card>
              <CardHeader>
                <CardTitle>Primeiro Acesso</CardTitle>
                <CardDescription>
                  Crie sua conta como operário
                </CardDescription>
              </CardHeader>
              <CardContent>
                {registroSucesso && (
                  <Alert className="mb-4 bg-green-50 border-green-300">
                    <AlertCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800 ml-2">
                      Cadastro realizado com sucesso! Faça login para continuar.
                    </AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleRegistro} className="space-y-3">
                  {error && (
                    <Alert className="bg-red-50 border-red-300">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800 ml-2">
                        {error}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div>
                    <label className="text-sm font-medium">Nome Completo *</label>
                    <Input
                      placeholder="João Silva Santos"
                      value={regNomeCompleto}
                      onChange={(e) => setRegNomeCompleto(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Matrícula *</label>
                    <Input
                      placeholder="EMP-001"
                      value={regMatricula}
                      onChange={(e) => setRegMatricula(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Email *</label>
                    <Input
                      type="email"
                      placeholder="joao@example.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Setor *</label>
                    <Input
                      placeholder="Fundação"
                      value={regSetor}
                      onChange={(e) => setRegSetor(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Gestor Imediato *</label>
                    <Input
                      placeholder="Nome do gestor"
                      value={regGestor}
                      onChange={(e) => setRegGestor(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Senha (4 dígitos) *</label>
                    <Input
                      type="password"
                      placeholder="••••"
                      value={regSenha}
                      onChange={(e) => setRegSenha(e.target.value)}
                      maxLength={4}
                      disabled={isLoading}
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Confirmar Senha *</label>
                    <Input
                      type="password"
                      placeholder="••••"
                      value={regSenhaConfirm}
                      onChange={(e) => setRegSenhaConfirm(e.target.value)}
                      maxLength={4}
                      disabled={isLoading}
                      required
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-green-600 hover:bg-green-700"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Cadastrando...
                      </>
                    ) : (
                      "Cadastrar"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-slate-600">
          <p>Precisa de ajuda? Entre em contato com o administrador da obra.</p>
        </div>
      </div>
    </div>
  );
}
