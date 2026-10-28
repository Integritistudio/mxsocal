import { NextResponse } from "next/server";
async function handle(request: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  const path = (await params).path?.join("/") || "";
  const valid = request.method === "GET" ? ["catalog", "mine", "admin", "pricing"].includes(path) : request.method === "POST" ? ["", "quote"].includes(path) : request.method === "PUT" ? path === "pricing" : request.method === "PATCH" && /^admin\/[a-f0-9-]{36}$/i.test(path);
  if (!valid) return NextResponse.json({ message: "Not found." }, { status: 404 });
  try {
    let body: string | undefined;
    if (request.method !== "GET") {
      const reader = request.body?.getReader(); const chunks: Uint8Array[] = []; let size = 0;
      if (reader) while (true) { const part = await reader.read(); if (part.done) break; size += part.value.length; if (size > 64000) { await reader.cancel(); return NextResponse.json({ message: "Booking details are too large." }, { status: 413 }); } chunks.push(part.value); }
      try { body = JSON.stringify(JSON.parse(Buffer.concat(chunks).toString())); } catch { return NextResponse.json({ message: "Invalid booking details." }, { status: 400 }); }
    }
    const query = new URLSearchParams(); const input = new URL(request.url).searchParams;
    if (path === "catalog") for (const key of ["startDate", "endDate"]) if (input.has(key)) query.set(key, input.get(key)!);
    const base = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");
    const response = await fetch(`${base}/ride-requests/${path}${query.size ? `?${query}` : ""}`, { method: request.method, headers: { cookie: request.headers.get("cookie") || "", "Content-Type": "application/json" }, body, cache: "no-store", signal: AbortSignal.timeout(30000) });
    return NextResponse.json(await response.json(), { status: response.status, headers: { "Cache-Control": "no-store", Vary: "Cookie" } });
  } catch { return NextResponse.json({ message: "Unable to reach the booking service. Please try again." }, { status: 503 }); }
}
export const GET = handle; export const POST = handle; export const PATCH = handle; export const PUT = handle;
