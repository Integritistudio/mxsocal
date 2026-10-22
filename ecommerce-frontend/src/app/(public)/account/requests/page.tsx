import RideRequestsList from "@/components/products/RideRequestsList";
import { PublicSiteHeader, PublicSiteFooter } from "@/components/public-site/PublicSiteChrome";
import shared from "@/components/public-site/contact-design.module.css";
export default function Page() { return <div className={shared.page}><PublicSiteHeader activePath="/account" /><main style={{ maxWidth: 1100, margin: "40px auto", padding: "0 20px" }}><RideRequestsList /></main><PublicSiteFooter /></div>; }
