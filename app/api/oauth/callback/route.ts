import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { NextRequest, NextResponse } from "next/server";
import * as db from "@server/db";
import { getSessionCookieOptions } from "@server/_core/cookies";
import { sdk } from "@server/_core/sdk";

function getQueryParam(req: NextRequest, key: string): string | undefined {
  return req.nextUrl.searchParams.get(key) ?? undefined;
}

function toExpressLikeRequest(req: NextRequest) {
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const https = proto === "https" || req.nextUrl.protocol === "https:";
  const headers: Record<string, string | undefined> = {};
  req.headers.forEach((v, k) => {
    headers[k.toLowerCase()] = v;
  });
  return {
    protocol: https ? "https" : "http",
    headers,
    get(name: string) {
      return req.headers.get(name) ?? undefined;
    },
  } as Parameters<typeof getSessionCookieOptions>[0];
}

export async function GET(req: NextRequest) {
  const code = getQueryParam(req, "code");
  const state = getQueryParam(req, "state");

  if (!code || !state) {
    return NextResponse.json({ error: "code and state are required" }, { status: 400 });
  }

  try {
    const tokenResponse = await sdk.exchangeCodeForToken(code, state);
    const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

    if (!userInfo.openId) {
      return NextResponse.json({ error: "openId missing from user info" }, { status: 400 });
    }

    await db.upsertUser({
      openId: userInfo.openId,
      name: userInfo.name || null,
      email: userInfo.email ?? null,
      loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
      lastSignedIn: new Date(),
    });

    const sessionToken = await sdk.createSessionToken(userInfo.openId, {
      name: userInfo.name || "",
      expiresInMs: ONE_YEAR_MS,
    });

    const cookieOptions = getSessionCookieOptions(toExpressLikeRequest(req));
    const res = NextResponse.redirect(new URL("/", req.url), 302);
    res.cookies.set(COOKIE_NAME, sessionToken, {
      httpOnly: cookieOptions.httpOnly,
      path: cookieOptions.path ?? "/",
      sameSite: cookieOptions.sameSite === "none" ? "none" : "lax",
      secure: cookieOptions.secure ?? false,
      maxAge: Math.floor(ONE_YEAR_MS / 1000),
    });
    return res;
  } catch (error) {
    console.error("[OAuth] Callback failed", error);
    return NextResponse.json({ error: "OAuth callback failed" }, { status: 500 });
  }
}
