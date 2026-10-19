import { NextResponse } from "next/server";
async function handle(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const path = (await params).path.join("/");
  const valid = request.method === "GET" ? /^(catalog|mine|availability\/[a-f0-9-]{36}|sessions\/cs_test_[a-zA-Z0-9]+(?:\/embedded)?)$/.test(path) : request.method === "POST" && (["quote", "checkout"].includes(path) || /^sessions\/cs_test_[a-zA-Z0-9]+\/release$/.test(path));
  if (!valid) return NextResponse.json({ message: "Not found." }, { status: 404 });
  if (request.method === "POST" && request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({ message: "Please use the booking form on this website." }, { status: 403 });
  try {
    let body: string | undefined;
    if (request.method === "POST") {
      const reader = request.body?.getReader(); const chunks: Uint8Array[] = []; let size = 0;
      if (reader) while (true) { const next = await reader.read(); if (next.done) break; size += next.value.byteLength; if (size > 16000) { await reader.cancel(); return NextResponse.json({ message: "Booking data is too large." }, { status: 413 }); } chunks.push(next.value); }
      try { body = JSON.stringify(JSON.parse(Buffer.concat(chunks).toString())); } catch { return NextResponse.json({ message: "Invalid booking data." }, { status: 400 }); }
    }
    const base = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const query = path === "mine" ? `?period=${encodeURIComponent(new URL(request.url).searchParams.get("period") || "upcoming")}` : path.startsWith("availability/") ? `?date=${encodeURIComponent(new URL(request.url).searchParams.get("date") || "")}` : "";
    const response = await fetch(`${base.replace(/\/$/, "")}/rental-checkout/${path}${query}`, { method: request.method, headers: { cookie: request.headers.get("cookie") || "", "Content-Type": "application/json" }, body, cache: "no-store", signal: AbortSignal.timeout(60000) });
    return NextResponse.json(await response.json(), { status: response.status, headers: { "Cache-Control": "no-store", Vary: "Cookie" } });
  } catch { return NextResponse.json({ message: "Unable to reach the booking service. Please try again." }, { status: 503 }); }
}
export const GET = handle;
export const POST = handle;
