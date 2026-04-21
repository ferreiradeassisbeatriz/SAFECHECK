import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente Supabase no navegador. Variáveis `NEXT_PUBLIC_*` no `.env` / `.env.local`.
 */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (ex.: em .env.local na raiz).",
    );
  }
  return createBrowserClient(url, key, { isSingleton: true });
}
