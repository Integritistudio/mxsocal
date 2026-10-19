export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[\da-f-]{36}$/i.test(id)) return new Response(null, { status: 404 });
  try {
    const base = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const response = await fetch(`${base.replace(/\/$/, "")}/products/review-images/${id}`, { cache: "no-store", headers: { cookie: request.headers.get("cookie") || "" }, signal: AbortSignal.timeout(10000) });
    const type = response.headers.get("content-type")?.split(";")[0];
    if (!response.ok || !type || !["image/jpeg", "image/png"].includes(type)) return new Response(null, { status: response.status === 404 ? 404 : 503 });
    return new Response(await response.arrayBuffer(), { headers: { "Content-Type": type, "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'", "Cache-Control": "no-store" } });
  } catch { return new Response(null, { status: 503 }); }
}
