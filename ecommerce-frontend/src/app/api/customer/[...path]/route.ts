import { NextResponse } from "next/server";
const routes: Record<string, { target: string; methods: string[] }> = {
  accounts: { target: "accounts", methods: ["GET"] },
  signup: { target: "signup", methods: ["POST"] }, "verify-email": { target: "verify-email", methods: ["POST"] }, "resend-otp": { target: "resend-otp", methods: ["POST"] }, login: { target: "login", methods: ["POST"] }, logout: { target: "logout", methods: ["POST"] }, "forgot-password": { target: "forgot-password", methods: ["POST"] }, "reset-password": { target: "reset-password", methods: ["POST"] }, me: { target: "me", methods: ["GET"] }, profile: { target: "me", methods: ["PUT"] }, avatar: { target: "me/avatar", methods: ["GET", "POST"] }, saved: { target: "saved", methods: ["GET"] }, reviews: { target: "my-reviews", methods: ["GET"] }, customers: { target: "customers", methods: ["GET", "POST"] },
};
async function handle(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const path = (await params).path.join("/");
  const route = routes[path] || (/^customers\/[\da-f-]{36}\/avatar$/i.test(path) ? { target: path, methods: ["GET"] } : null) || (/^saved\/[\da-f-]{36}$/i.test(path) ? { target: path, methods: ["PUT", "DELETE"] } : null);
  if (!route || !route.methods.includes(request.method)) return NextResponse.json({ message: "Not found." }, { status: 404 });
  if (request.method !== "GET") { const origin = request.headers.get("origin"); if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ message: "Please use the form on this website." }, { status: 403 }); }
  try {
    let body: FormData | string | undefined;
    const isUpload = path === "avatar" && request.method === "POST";
    if (!["GET", "DELETE"].includes(request.method)) {
      const max = isUpload ? 5 * 1024 * 1024 + 65536 : 20000;
      if (Number(request.headers.get("content-length")) > max) return NextResponse.json({ message: "This upload is too large." }, { status: 413 });
      const reader = request.body?.getReader(); const chunks: Uint8Array[] = []; let length = 0;
      if (reader) while (true) { const next = await reader.read(); if (next.done) break; length += next.value.length; if (length > max) { await reader.cancel(); return NextResponse.json({ message: "This upload is too large." }, { status: 413 }); } chunks.push(next.value); }
      const raw = Buffer.concat(chunks);
      if (isUpload) { const form = await new Response(raw, { headers: { "Content-Type": request.headers.get("content-type") || "" } }).formData(); if (form.getAll("images").length !== 1) return NextResponse.json({ message: "Choose one profile photo." }, { status: 400 }); form.set("ratings", "{}"); body = form; }
      else { try { body = JSON.stringify(raw.length ? JSON.parse(raw.toString()) : {}); } catch { return NextResponse.json({ message: "Invalid form data." }, { status: 400 }); } }
    }
    const base = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const response = await fetch(`${base.replace(/\/$/, "")}/auth/${route.target}`, { method: request.method, headers: { cookie: request.headers.get("cookie") || "", ...(!isUpload ? { "Content-Type": "application/json" } : {}) }, body, cache: "no-store", signal: AbortSignal.timeout(30000) });
    let result: Response;
    const type = response.headers.get("content-type") || "";
    if ((path === "avatar" || /^customers\/.+\/avatar$/.test(path)) && request.method === "GET" && response.ok && ["image/png", "image/jpeg"].includes(type.split(";")[0])) result = new Response(await response.arrayBuffer(), { headers: { "Content-Type": type, "X-Content-Type-Options": "nosniff" } });
    else result = NextResponse.json(await response.json().catch(() => ({ message: response.status === 401 ? "Please sign in to continue." : "Unable to complete this request." })), { status: response.status });
    result.headers.set("Cache-Control", "no-store"); result.headers.set("Vary", "Cookie");
    for (const cookie of response.headers.getSetCookie()) result.headers.append("Set-Cookie", cookie);
    return result;
  } catch { return NextResponse.json({ message: "Unable to reach MXSoCal. Please try again shortly." }, { status: 503 }); }
}
export const GET = handle; export const POST = handle; export const PUT = handle; export const DELETE = handle;
