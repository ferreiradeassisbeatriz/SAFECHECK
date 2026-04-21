import { useState } from "react";
import { trpc } from "@/lib/trpc";

export function useAuthLocal() {
  const [error, setError] = useState<string | null>(null);

  const registrarMutation = trpc.auth.registrarOperario.useMutation({
    onError: (err) => {
      setError(err.message);
    },
    onSuccess: () => {
      setError(null);
    }
  });

  const loginOperarioMutation = trpc.auth.loginOperario.useMutation({
    onError: (err) => {
      setError(err.message);
    },
    onSuccess: () => {
      setError(null);
    }
  });

  const loginDeveloperMutation = trpc.auth.loginDeveloper.useMutation({
    onError: (err) => {
      setError(err.message);
    },
    onSuccess: () => {
      setError(null);
    }
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      window.location.href = "/";
    },
    onError: (err) => {
      setError(err.message);
    }
  });

  const registrarOperario = async (dados: {
    nomeCompleto: string;
    matricula: string;
    email: string;
    setor: string;
    gestorImediato: string;
    senhaDigitos: string;
  }) => {
    return registrarMutation.mutateAsync(dados);
  };

  const loginOperario = async (username: string, senhaDigitos: string) => {
    return loginOperarioMutation.mutateAsync({
      username,
      senhaDigitos
    });
  };

  const loginDeveloper = async (email: string, senha: string) => {
    return loginDeveloperMutation.mutateAsync({
      email,
      senha
    });
  };

  const logout = async () => {
    return logoutMutation.mutateAsync();
  };

  return {
    isLoading: registrarMutation.isPending || loginOperarioMutation.isPending || loginDeveloperMutation.isPending || logoutMutation.isPending,
    error,
    registrarOperario,
    loginOperario,
    loginDeveloper,
    logout
  };
}
