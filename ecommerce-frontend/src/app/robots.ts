import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/stories";
export default function robots(): MetadataRoute.Robots { return { rules: { userAgent: "*", allow: ["/", "/api/story-image/"], disallow: ["/dashboard", "/admin/", "/account", "/api/", "/sign-in", "/sign-up", "/forgot-password", "/reset-password", "/managers", "/bookings"] }, sitemap: `${siteUrl()}/stories-sitemap.xml` }; }
