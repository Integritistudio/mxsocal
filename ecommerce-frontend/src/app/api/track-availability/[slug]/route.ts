import { NextResponse } from "next/server";
export async function PUT(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,180}$/.test(slug)) return NextResponse.json({ message: "Not found." }, { status: 404 });
  if (request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({ message: "Please use this website to edit track availability." }, { status: 403 });
  try {
    const reader = request.body?.getReader(); const chunks: Uint8Array[] = []; let size = 0;
    if (reader) while (true) { const item = await reader.read(); if (item.done) break; size += item.value.byteLength; if (size > 32000) { await reader.cancel(); return NextResponse.json({ message: "Calendar is too large." }, { status: 413 }); } chunks.push(item.value); }
    let body; try { body = JSON.stringify(JSON.parse(Buffer.concat(chunks).toString())); } catch { return NextResponse.json({ message: "Invalid calendar." }, { status: 400 }); }
    const base = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");
    const response = await fetch(`${base}/tracks/${slug}/availability`, { method: "PUT", headers: { "Content-Type": "application/json", cookie: request.headers.get("cookie") || "" }, body, cache: "no-store", signal: AbortSignal.timeout(10000) });
    return NextResponse.json(await response.json(), { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ message: "Unable to save track availability." }, { status: 503 }); }
}
