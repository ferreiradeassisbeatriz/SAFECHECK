import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { SupabaseClient } from "@supabase/supabase-js";
import { serializeCookieHeader } from "@supabase/ssr";
import type {
  CookieOptions,
  Request as ExpressRequest,
  Response as ExpressResponse,
} from "express";
import type { IncomingHttpHeaders } from "node:http";
import type { User } from "../../drizzle/schema";
import { createSupabaseServerClient, hasSupabaseConfig } from "./supabase";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: ExpressRequest;
  res: ExpressResponse;
  user: User | null;
  /** Presente quando `NEXT_PUBLIC_SUPABASE_*` estão definidos no .env / .env.local */
  supabase: SupabaseClient | null;
};

function webRequestToExpress(webReq: Request): ExpressRequest {
  const url = new URL(webReq.url);
  const xf = webReq.headers.get("x-forwarded-proto");
  const https =
    xf?.split(",")[0]?.trim().toLowerCase() === "https" || url.protocol === "https:";
  const headers: Record<string, string | string[] | undefined> = {};
  webReq.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });
  return {
    protocol: https ? "https" : "http",
    hostname: url.hostname,
    headers: headers as IncomingHttpHeaders,
    get(name: string) {
      return webReq.headers.get(name) ?? undefined;
    },
  } as unknown as ExpressRequest;
}

function headersToExpressResponse(resHeaders: Headers): ExpressResponse {
  return {
    cookie(name: string, value: string, options: CookieOptions = {}) {
      resHeaders.append("Set-Cookie", serializeCookieHeader(name, value, options));
    },
    clearCookie(name: string, options: CookieOptions = {}) {
      resHeaders.append(
        "Set-Cookie",
        serializeCookieHeader(name, "", {
          ...options,
          maxAge: 0,
          expires: new Date(0),
        }),
      );
    },
    appendHeader(name: string, value: string) {
      resHeaders.append(name, value);
    },
    setHeader(name: string, value: string) {
      resHeaders.set(name, value);
    },
  } as unknown as ExpressResponse;
}

async function buildTrpcContext(
  expressReq: ExpressRequest,
  expressRes: ExpressResponse,
): Promise<TrpcContext> {
  let user: User | null = null;
  try {
    user = await sdk.authenticateRequest(expressReq);
  } catch {
    user = null;
  }

  const supabase = hasSupabaseConfig()
    ? createSupabaseServerClient(expressReq, expressRes)
    : null;

  return {
    req: expressReq,
    res: expressRes,
    user,
    supabase,
  };
}

/** Contexto tRPC no Next.js App Router (`fetchRequestHandler`). */
export async function createFetchTrpcContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  return buildTrpcContext(webRequestToExpress(opts.req), headersToExpressResponse(opts.resHeaders));
}
