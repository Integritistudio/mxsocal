import type { ReactNode } from "react";
import { DM_Sans } from "next/font/google";
import Link from "next/link";
import AdminBrand from "@/layout/AdminBrand";
import s from "@/layout/admin-theme.module.css";
const font = DM_Sans({ subsets: ["latin"], variable: "--font-admin" });
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className={`dark ${font.variable} ${s.theme} ${s.auth}`}>
    <div className={s.authForm}><div className={s.authTop}><Link href="/"><AdminBrand /></Link><Link href="/">Back to website</Link></div>{children}</div>
    <aside className={s.authBrand}><span>MXSoCal / Staff access</span><h2>Behind every great ride.</h2><p>Manage ride requests, bikes, gear, coaches, and the people who make it happen.</p></aside>
  </div>;
}
