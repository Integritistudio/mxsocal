import { NextResponse } from "next/server";
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ message: "Use the form on this website." }, { status: 403 });
  if (!request.headers.get("cookie")) return NextResponse.json({ message: "Please sign in." }, { status: 401 });
  const max = 5 * 1024 * 1024 + 65536;
  if (Number(request.headers.get("content-length")) > max) return NextResponse.json({ message: "Choose a photo under 5 MB." }, { status: 413 });
  try {
    const reader = request.body?.getReader(); if (!reader) return NextResponse.json({ message: "Choose a photo." }, { status: 400 });
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > max) { await reader.cancel(); return NextResponse.json({ message: "Choose a photo under 5 MB." }, { status: 413 }); } chunks.push(value); }
    const buffer = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.length; }
    const base = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const response = await fetch(`${base.replace(/\/$/, "")}/stories/media`, { method: "POST", headers: { cookie: request.headers.get("cookie") || "", "Content-Type": request.headers.get("content-type") || "" }, body: buffer, cache: "no-store", signal: AbortSignal.timeout(30000) });
    return NextResponse.json(await response.json(), { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ message: "Unable to upload this photo. Please try again." }, { status: 503 }); }
}
