import { NextResponse } from "next/server";
async function handle(request: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  const path = (await params).path?.join("/") || "";
  if ((path && !/^[a-f0-9-]{36}$/.test(path)) || (!path && !["GET", "POST"].includes(request.method)) || (path && !["GET", "PATCH", "DELETE"].includes(request.method))) return NextResponse.json({ message: "Not found." }, { status: 404 });
  const origin = request.headers.get("origin"); if (request.method !== "GET" && origin && origin !== new URL(request.url).origin) return NextResponse.json({ message: "Use this website to manage stories." }, { status: 403 });
  try {
    let body: string | undefined;
    if (["POST", "PATCH"].includes(request.method)) {
      const max = 100000; const reader = request.body?.getReader(); if (!reader) throw new Error("Missing request body"); const chunks: Uint8Array[] = []; let size = 0;
      while (true) { const part = await reader.read(); if (part.done) break; size += part.value.length; if (size > max) { await reader.cancel(); return NextResponse.json({ message: "This article is too large." }, { status: 413 }); } chunks.push(part.value); }
      body = Buffer.concat(chunks).toString("utf8"); JSON.parse(body);
    }
    const base = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const response = await fetch(`${base.replace(/\/$/, "")}/stories/admin${path ? `/${path}` : ""}`, { method: request.method, headers: { cookie: request.headers.get("cookie") || "", "Content-Type": "application/json" }, body, cache: "no-store", signal: AbortSignal.timeout(15000) });
    const result = await response.json().catch(() => ({ message: response.status === 404 ? "Story not found." : "Unable to process this request." }));
    return NextResponse.json(result, { status: response.status, headers: { "Cache-Control": "no-store", Vary: "Cookie" } });
  } catch { return NextResponse.json({ message: "Unable to save or load this story. Please try again." }, { status: 503 }); }
}
export { handle as GET, handle as POST, handle as PATCH, handle as DELETE };
