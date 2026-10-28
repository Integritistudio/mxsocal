"use client";
import { useLayoutEffect, useRef, type ReactNode } from "react";
export default function DetailBreadcrumbs({ children, className, pageKey }: { children: ReactNode; className: string; pageKey: string }) {
  const nav = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    let frame = 0;
    let followup = 0;
    const scroll = () => nav.current?.scrollIntoView({ block: "start", behavior: "instant" });
    const position = () => {
      cancelAnimationFrame(frame); cancelAnimationFrame(followup);
      scroll();
      // Reapply after router/browser scroll restoration finishes.
      frame = requestAnimationFrame(() => { followup = requestAnimationFrame(scroll); });
    };
    position();
    window.addEventListener("pageshow", position);
    return () => { cancelAnimationFrame(frame); cancelAnimationFrame(followup); window.removeEventListener("pageshow", position); };
  }, [pageKey]);
  return <nav ref={nav} className={className} aria-label="Breadcrumb" style={{ scrollMarginTop: 24 }}>{children}</nav>;
}
