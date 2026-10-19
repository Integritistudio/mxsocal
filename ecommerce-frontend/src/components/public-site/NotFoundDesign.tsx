"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DM_Sans } from "next/font/google";
import GridShape from "@/components/common/GridShape";
import { PublicSiteHeader, PublicSiteFooter } from "./PublicSiteChrome";
import shared from "./contact-design.module.css";
import s from "./not-found-design.module.css";

const font = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "700"] });

export default function NotFoundDesign() {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setTimeout(() => router.replace("/"), 5000);
    return () => window.clearTimeout(timer);
  }, [router]);

  return (
    <div data-public-not-found className={`${shared.page} ${s.page} ${font.className}`}>
      <a className={shared.skip} href="#main-content">Skip to content</a>
      <PublicSiteHeader activePath="" compact />
      <main id="main-content" className={s.main}>
        <video className={s.video} autoPlay muted loop playsInline controls={false} disablePictureInPicture preload="auto" aria-hidden="true" tabIndex={-1} onVolumeChange={event => { event.currentTarget.muted = true; }}>
          <source src="/videos/404-video.mov" />
        </video>
        <div className={s.overlay} aria-hidden="true" />
        <div className={s.grid} aria-hidden="true"><GridShape /></div>
        <div className={s.content}>
          <h1>ERROR</h1>
          <Image src="/images/error/404-mxsocal.svg" alt="404" width={472} height={158} priority />
          <p>We can’t seem to find the page you are looking for!</p>
          <Link href="/">Back to Home Page</Link>
        </div>
      </main>
      <PublicSiteFooter />
    </div>
  );
}
