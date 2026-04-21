import { ENV } from "@server/_core/env";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  const { path: segments } = await context.params;
  const key = segments?.join("/") ?? "";
  if (!key) {
    return new NextResponse("Missing storage key", { status: 400 });
  }

  if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
    return new NextResponse("Storage proxy not configured", { status: 500 });
  }

  try {
    const forgeUrl = new URL(
      "v1/storage/presign/get",
      ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
    );
    forgeUrl.searchParams.set("path", key);

    const forgeResp = await fetch(forgeUrl, {
      headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
    });

    if (!forgeResp.ok) {
      const body = await forgeResp.text().catch(() => "");
      console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
      return new NextResponse("Storage backend error", { status: 502 });
    }

    const { url } = (await forgeResp.json()) as { url?: string };
    if (!url) {
      return new NextResponse("Empty signed URL from backend", { status: 502 });
    }

    return NextResponse.redirect(url, 307);
  } catch (err) {
    console.error("[StorageProxy] failed:", err);
    return new NextResponse("Storage proxy error", { status: 502 });
  }
}
