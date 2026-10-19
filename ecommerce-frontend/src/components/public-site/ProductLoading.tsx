import { PublicSiteHeader, PublicSiteFooter } from "./PublicSiteChrome";
import ProductSkeleton from "./ProductSkeleton";
import shared from "./contact-design.module.css";
import s from "./product-design.module.css";
export default function ProductLoading() { return <div className={shared.page}><PublicSiteHeader activePath="/bikes" /><main className={s.main}><ProductSkeleton /></main><PublicSiteFooter /></div>; }
