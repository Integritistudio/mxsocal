import { NextRequest, NextResponse } from "next/server";
export async function GET(request: NextRequest) {
  const params = new URLSearchParams();
  for (const key of ["q", "page"]) {
    const value = request.nextUrl.searchParams.get(key);
    if (value) params.set(key, value);
  }
  try {
    const base = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");
    const response = await fetch(`${base}/search?${params}`, { cache: "no-store", signal: AbortSignal.timeout(10000) });
    if (!response.ok) return NextResponse.json({ message: "Search is unavailable. Please try again." }, { status: response.status === 400 ? 400 : 503 });
    return NextResponse.json(await response.json());
  } catch {
    return NextResponse.json({ message: "Search is unavailable. Please try again." }, { status: 503 });
  }
}
