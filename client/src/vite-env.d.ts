/// <reference types="next" />
/// <reference types="next/image-types/global" />

declare namespace NodeJS {
  interface ProcessEnv {
    readonly NEXT_PUBLIC_SUPABASE_URL?: string;
    readonly NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
    readonly NEXT_PUBLIC_OAUTH_PORTAL_URL?: string;
    readonly NEXT_PUBLIC_APP_ID?: string;
    readonly NEXT_PUBLIC_FRONTEND_FORGE_API_KEY?: string;
    readonly NEXT_PUBLIC_FRONTEND_FORGE_API_URL?: string;
  }
}
