import { DM_Sans } from "next/font/google";
import { PublicSiteHeader, PublicSiteFooter } from "@/components/public-site/PublicSiteChrome";
import shared from "@/components/public-site/contact-design.module.css";
const font = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
export default function Layout({ children }: { children: React.ReactNode }) { return <div className={`${font.className} ${shared.page}`}><PublicSiteHeader activePath="/stories" compact />{children}<PublicSiteFooter /></div>; }
