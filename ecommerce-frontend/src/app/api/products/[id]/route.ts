import { NextResponse } from "next/server";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9-]{1,200}$/i.test(id)) return NextResponse.json({ message: "Product not found." }, { status: 404 });
  try {
    const base = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const response = await fetch(`${base.replace(/\/$/, "")}/products/${encodeURIComponent(id)}/detail`, { headers: { cookie: request.headers.get("cookie") || "" }, cache: "no-store", signal: AbortSignal.timeout(10000) });
    if (!response.ok) return NextResponse.json({ message: response.status === 404 ? "Product not found." : "Product details are temporarily unavailable." }, { status: response.status === 404 ? 404 : 503 });
    return NextResponse.json(await response.json(), { headers: { "Cache-Control": "no-store", Vary: "Cookie" } });
  } catch { return NextResponse.json({ message: "Product details are temporarily unavailable." }, { status: 503 }); }
}
