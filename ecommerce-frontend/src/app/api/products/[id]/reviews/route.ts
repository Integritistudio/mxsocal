import { NextResponse } from "next/server";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[\da-f-]{36}$/i.test(id)) return NextResponse.json({ message: "Product not found." }, { status: 404 });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ message: "Please submit your review from this website." }, { status: 403 });
  try {
    const limit = 5 * 1024 * 1024 + 65536;
    if (Number(request.headers.get("content-length")) > limit) return NextResponse.json({ message: "Images must total less than 5 MB." }, { status: 413 });
    const reader = request.body?.getReader();
    if (!reader) return NextResponse.json({ message: "Please enter your review." }, { status: 400 });
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) { const result = await reader.read(); if (result.done) break; size += result.value.byteLength; if (size > limit) { await reader.cancel(); return NextResponse.json({ message: "Images must total less than 5 MB." }, { status: 413 }); } chunks.push(result.value); }
    const raw = Buffer.concat(chunks);
    const multipart = request.headers.get("content-type")?.startsWith("multipart/form-data");
    let body: FormData | string;
    if (multipart) {
      const form = await new Response(raw, { headers: { "Content-Type": request.headers.get("content-type") || "" } }).formData();
      const images = form.getAll("images");
      if (images.length > 5 || images.some(file => !(file instanceof File) || !["image/jpeg", "image/png"].includes(file.type) || !/\.(jpe?g|png)$/i.test(file.name))) return NextResponse.json({ message: "Upload at most 5 JPG or PNG images." }, { status: 400 });
      if (images.reduce((sum, file) => sum + (file instanceof File ? file.size : 0), 0) >= 5 * 1024 * 1024) return NextResponse.json({ message: "Images must total less than 5 MB." }, { status: 413 });
      body = form;
    } else { if (raw.length > 20000) return NextResponse.json({ message: "Review is too large." }, { status: 413 }); try { body = JSON.stringify(JSON.parse(raw.toString())); } catch { return NextResponse.json({ message: "Invalid review." }, { status: 400 }); } }
    const base = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const response = await fetch(`${base.replace(/\/$/, "")}/products/${encodeURIComponent(id)}/reviews`, { method: "POST", headers: { cookie: request.headers.get("cookie") || "", ...(!multipart ? { "Content-Type": "application/json" } : {}) }, body, cache: "no-store", signal: AbortSignal.timeout(30000) });
    const data = await response.json();
    return NextResponse.json({ message: data.message || "Unable to submit your review." }, { status: response.status });
  } catch { return NextResponse.json({ message: "Unable to submit your review. Please try again." }, { status: 503 }); }
}
