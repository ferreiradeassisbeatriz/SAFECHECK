"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Shield, Users, Lock, BarChart3, Zap, FileText, HardHat } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

export default function Home() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  useEffect(() => {
    void supabase.auth.getSession();
  }, [supabase]);

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-linear-to-r from-blue-900 to-indigo-900 px-4 py-6 text-white sm:px-6 sm:py-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-2 flex flex-wrap items-center gap-2 sm:mb-3 sm:gap-3">
            <Shield className="h-8 w-8 shrink-0 sm:h-9 sm:w-9 md:h-10 md:w-10" />
            <h1 className="text-2xl font-bold leading-tight sm:text-3xl md:text-4xl">SAFECHECK</h1>
          </div>
          <p className="mb-4 max-w-2xl text-base text-blue-100 sm:mb-5 sm:text-lg md:text-xl">
            Sistema Integrado de Gestão de Segurança em Obra
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            <Button 
              className="bg-white text-blue-900 hover:bg-blue-50 font-semibold"
              onClick={() => router.push("/login")}
            >
              Entrar no Sistema
            </Button>
            <Button 
              variant="outline" 
              className="border-white text-white hover:bg-blue-800"
              onClick={() => router.push("/login")}
            >
              Primeiro Acesso
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <HardHat className="h-6 w-6 text-blue-600" />
                <CardTitle>Segurança em Primeiro Lugar</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Validação completa de EPIs, condições do ambiente e assinatura digital antes de qualquer atividade
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <Users className="h-6 w-6 text-green-600" />
                <CardTitle>Gestão de Operários</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Controle das atividades realizadas, setores e responsabilidades de cada operário na obra
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <FileText className="h-6 w-6 text-orange-600" />
                <CardTitle>Ordens de Serviço</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Geração automática de Ordens de Serviço com assinatura digital e exportação em PDF/PNG
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <BarChart3 className="h-6 w-6 text-purple-600" />
                <CardTitle>Dashboard Administrativo</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Métricas em tempo real: check-ins, Ordens de Serviço, setores ativos e histórico completo
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <Lock className="h-6 w-6 text-red-600" />
                <CardTitle>Painel Developer</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Gerenciamento exclusivo de usuários administradores, técnicos e gestores da obra
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <Zap className="h-6 w-6 text-yellow-600" />
                <CardTitle>Formulários Dinâmicos</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Formulários adaptáveis conforme o tipo de tarefa, com validações automáticas de segurança
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <Card className="bg-linear-to-r from-blue-600 to-indigo-600 text-white border-0">
          <CardHeader>
            <CardTitle className="text-2xl">Pronto para Começar?</CardTitle>
            <CardDescription className="text-blue-100">
              Acesse o sistema com suas credenciais ou crie uma nova conta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="bg-white text-blue-600 hover:bg-blue-50 font-semibold"
              onClick={() => router.push("/login")}
            >
              Acessar Sistema
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
