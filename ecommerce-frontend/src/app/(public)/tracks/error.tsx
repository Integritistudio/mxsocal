"use client";
import Link from "next/link";
import { PublicSiteHeader, PublicSiteFooter } from "@/components/public-site/PublicSiteChrome";
import shared from "@/components/public-site/contact-design.module.css";
import listing from "@/components/public-site/coaches-design.module.css";
export default function TrackError({ reset }: { reset: () => void }) { return <div className={shared.page}><PublicSiteHeader activePath="/tracks" /><main className={listing.main}><div className={listing.message}><h1>Track temporarily unavailable</h1><p>Please try again shortly.</p><button onClick={reset}>Try again</button><p><Link href="/tracks">Back to tracks</Link></p></div></main><PublicSiteFooter /></div>; }
