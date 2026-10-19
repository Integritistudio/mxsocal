import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedRoutes = [
    "/dashboard",
];

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const token = req.cookies.get("token")?.value;

    const isProtected = protectedRoutes.some((route) =>
        pathname.startsWith(route)
    );

    if (isProtected && !token) {
        return NextResponse.redirect(new URL("/admin/login", req.url));
    }

    if (isProtected && token) {
        try {
            const base = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const response = await fetch(`${base.replace(/\/$/, "")}/auth/me`, { headers: { cookie: req.headers.get("cookie") || "" }, cache: "no-store", signal: AbortSignal.timeout(10000) });
            if (!response.ok) return NextResponse.redirect(new URL("/admin/login", req.url));
            const user = await response.json();
            if (user.role === "user") return NextResponse.redirect(new URL("/account", req.url));
            if (!["admin", "manager"].includes(user.role)) return NextResponse.redirect(new URL("/admin/login", req.url));
        } catch { return NextResponse.redirect(new URL("/admin/login", req.url)); }
    }

    return NextResponse.next();
}
export const config = {
    matcher: ["/dashboard/:path*"],
};
