import type { NextConfig } from "next";

const forwardedPublicEnv: Record<string, string> = {};
if (process.env.NEXT_PUBLIC_OAUTH_PORTAL_URL) {
  forwardedPublicEnv.NEXT_PUBLIC_OAUTH_PORTAL_URL =
    process.env.NEXT_PUBLIC_OAUTH_PORTAL_URL;
} else if (process.env.VITE_OAUTH_PORTAL_URL) {
  forwardedPublicEnv.NEXT_PUBLIC_OAUTH_PORTAL_URL = process.env.VITE_OAUTH_PORTAL_URL;
}
if (process.env.NEXT_PUBLIC_APP_ID) {
  forwardedPublicEnv.NEXT_PUBLIC_APP_ID = process.env.NEXT_PUBLIC_APP_ID;
} else if (process.env.VITE_APP_ID) {
  forwardedPublicEnv.NEXT_PUBLIC_APP_ID = process.env.VITE_APP_ID;
}
if (process.env.NEXT_PUBLIC_FRONTEND_FORGE_API_KEY) {
  forwardedPublicEnv.NEXT_PUBLIC_FRONTEND_FORGE_API_KEY =
    process.env.NEXT_PUBLIC_FRONTEND_FORGE_API_KEY;
} else if (process.env.VITE_FRONTEND_FORGE_API_KEY) {
  forwardedPublicEnv.NEXT_PUBLIC_FRONTEND_FORGE_API_KEY =
    process.env.VITE_FRONTEND_FORGE_API_KEY;
}
if (process.env.NEXT_PUBLIC_FRONTEND_FORGE_API_URL) {
  forwardedPublicEnv.NEXT_PUBLIC_FRONTEND_FORGE_API_URL =
    process.env.NEXT_PUBLIC_FRONTEND_FORGE_API_URL;
} else if (process.env.VITE_FRONTEND_FORGE_API_URL) {
  forwardedPublicEnv.NEXT_PUBLIC_FRONTEND_FORGE_API_URL =
    process.env.VITE_FRONTEND_FORGE_API_URL;
}

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg"],
  env: forwardedPublicEnv,
};

export default nextConfig;
