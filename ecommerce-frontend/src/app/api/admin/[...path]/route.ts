import { NextResponse } from "next/server";

const allowedRoots = new Set(["tracks", "analytics", "contact", "footer-contacts", "auth", "user", "products", "coach", "operations", "bookings", "notifications", "upload"]);

async function handle(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  if (!allowedRoots.has(path[0]) || path.some(segment => !/^[a-z0-9_-]+$/i.test(segment))) {
    return NextResponse.json({ message: "Not found." }, { status: 404 });
  }
  try {
    const base = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const target = new URL(`${base.replace(/\/$/, "")}/${path.map(encodeURIComponent).join("/")}`);
    target.search = new URL(request.url).search;
    const headers = new Headers();
    for (const name of ["cookie", "content-type", "authorization"]) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }
    // Forward multipart bodies unchanged, including the original boundary.
    const body = ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer();
    const upstream = await fetch(target, { method: request.method, headers, body, cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(30000) });
    const responseHeaders = new Headers({ "Cache-Control": "no-store", "Vary": "Cookie", "X-Content-Type-Options": "nosniff" });
    const contentType = upstream.headers.get("content-type");
    if (contentType) responseHeaders.set("Content-Type", contentType);
    for (const cookie of upstream.headers.getSetCookie()) responseHeaders.append("Set-Cookie", cookie);
    return new Response([204, 205, 304].includes(upstream.status) ? null : await upstream.arrayBuffer(), { status: upstream.status, headers: responseHeaders });
  } catch {
    return NextResponse.json({ message: "Unable to reach MXSoCal. Please try again shortly." }, { status: 503 });
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
