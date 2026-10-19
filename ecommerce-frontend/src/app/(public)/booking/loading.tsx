import BookingSkeleton from "@/components/public-site/BookingSkeleton";
import { PublicSiteHeader, PublicSiteFooter } from "@/components/public-site/PublicSiteChrome";
import shared from "@/components/public-site/contact-design.module.css";
import s from "@/components/public-site/booking.module.css";
export default function Loading() {
  return <div className={`${shared.page} ${s.page}`}><PublicSiteHeader activePath="" compact /><main className={s.main}><h1>Checkout</h1><BookingSkeleton /></main><PublicSiteFooter /></div>;
}
