import ProductSkeleton from "@/components/public-site/ProductSkeleton";
import { PublicSiteHeader, PublicSiteFooter } from "@/components/public-site/PublicSiteChrome";
import shared from "@/components/public-site/contact-design.module.css";
import s from "@/components/public-site/product-design.module.css";
export default function Loading() {
  return <div className={shared.page}><PublicSiteHeader activePath="/coaches" /><main className={s.main}><ProductSkeleton /></main><PublicSiteFooter /></div>;
}
