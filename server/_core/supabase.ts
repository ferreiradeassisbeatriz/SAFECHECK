import { createServerClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Request, Response } from "express";

export function hasSupabaseConfig(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  return Boolean(url && key);
}

/**
 * Cliente Supabase para o servidor (cookies do request/response Express),
 * equivalente ao padrão `createServerClient` + cookies do Next.js.
 */
export function createSupabaseServerClient(req: Request, res: Response): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !anonKey) {
    throw new Error(
      "Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY no .env ou .env.local",
    );
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(req.headers.cookie ?? "").map((c) => ({
          name: c.name,
          value: c.value ?? "",
        }));
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value, options } of cookiesToSet) {
          res.appendHeader("Set-Cookie", serializeCookieHeader(name, value, options));
        }
        for (const [key, value] of Object.entries(headers)) {
          res.setHeader(key, value);
        }
      },
    },
  });
}
