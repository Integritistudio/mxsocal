import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ message: "Invalid origin" }, { status: 403 });
  if (Number(request.headers.get("content-length") || 0) > 16000) return NextResponse.json({ message: "Request too large" }, { status: 413 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ message: "Invalid request" }, { status: 400 }); }
  try {
    const base = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    const response = await fetch(`${base.replace(/\/$/, "")}/contact`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
    return NextResponse.json({ message: response.ok ? "Message received" : "Unable to send message" }, { status: response.ok ? 201 : response.status === 400 ? 400 : 503 });
  } catch { return NextResponse.json({ message: "Contact service unavailable" }, { status: 503 }); }
}
