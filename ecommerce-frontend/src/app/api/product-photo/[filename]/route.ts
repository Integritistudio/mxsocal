export async function GET(_request: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  if (!/^[a-f0-9-]{36}\.(jpg|png)$/.test(filename)) return new Response(null, { status: 404 });
  try {
    const base = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const response = await fetch(`${base.replace(/\/$/, "")}/products/photos/${filename}`, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) return new Response(null, { status: 404 });
    return new Response(response.body, { headers: { "Content-Type": filename.endsWith(".png") ? "image/png" : "image/jpeg", "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } });
  } catch { return new Response(null, { status: 503 }); }
}
