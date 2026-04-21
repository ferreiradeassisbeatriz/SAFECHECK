export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/** URL do fluxo OAuth (portal). Configure `NEXT_PUBLIC_OAUTH_PORTAL_URL` e `NEXT_PUBLIC_APP_ID` (ou `VITE_*` mapeados no `next.config.ts`). */
export const getLoginUrl = () => {
  if (typeof window === "undefined") {
    return "";
  }
  const portal = (process.env.NEXT_PUBLIC_OAUTH_PORTAL_URL ?? "").trim();
  const id = process.env.NEXT_PUBLIC_APP_ID ?? "";
  if (!portal || !/^https?:\/\//i.test(portal)) {
    return "/login";
  }
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  const base = portal.replace(/\/$/, "");
  const url = new URL(`${base}/app-auth`);
  url.searchParams.set("appId", id);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
