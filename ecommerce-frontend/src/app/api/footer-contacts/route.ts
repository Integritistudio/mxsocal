import { NextRequest, NextResponse } from "next/server";
const message = "Thanks for your interest in MXSoCal!";
export async function POST(request: NextRequest) {
  const respond = () => NextResponse.json({ message }, { status: 202, headers: { "Cache-Control": "no-store" } });
  const origin = request.headers.get("origin");
  if ((origin && origin !== request.nextUrl.origin) || Number(request.headers.get("content-length") || 0) > 2048) return respond();
  try {
    const text = await request.text();
    if (text.length > 2048) return respond();
    const body = JSON.parse(text);
    if (typeof body?.email !== "string" || body.email.length > 254) return respond();
    const base = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");
    const response = await fetch(`${base}/footer-contacts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: body.email, website: body.website }), signal: AbortSignal.timeout(10000), cache: "no-store" });
    if (!response.ok) console.error("Footer contact upstream failed:", response.status);
  } catch { console.error("Footer contact upstream unavailable."); }
  return respond();
}
