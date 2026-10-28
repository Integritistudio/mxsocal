/* eslint-disable @next/next/no-img-element */
"use client";
import Link from "next/link";
import { motion, useAnimationControls, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import FooterContactForm from "./FooterContactForm";
import SiteSearch from "./SiteSearch";
import { FiX } from "react-icons/fi";
import { PiHouse, PiMotorcycle, PiFlagCheckered, PiBookOpen, PiInfo, PiEnvelope, PiCalendarCheck } from "react-icons/pi";
import s from "./contact-design.module.css";
import { useUser } from "@/context/UserContext";
const asset = (file: string) => `/images/contact/${file}`;
const links = [["Home", "/"], ["Bikes", "/bikes"], ["Tracks", "/tracks"], ["Stories", "/stories"], ["About us", "/about-us"], ["Contact", "/contact-us"]];
const menuIcons = [PiHouse, PiMotorcycle, PiFlagCheckered, PiBookOpen, PiInfo, PiEnvelope];

export function PublicSiteHeader({ activePath, compact = false }: { activePath: string; compact?: boolean }) {
  const { user, loadingAuth } = useUser();
  const accountUrl = loadingAuth ? "/account" : user ? (user.role === "user" ? "/account" : "/dashboard") : "/sign-in";
  const accountLabel = loadingAuth ? "Account" : user ? "My Account" : "Sign in";
  const reduceMotion = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDialogElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const menuAnimation = useAnimationControls();
  const savedOverflow = useRef<string | null>(null);
  useEffect(() => {
    const dialog = menuRef.current;
    const panel = menuPanelRef.current;
    if (!dialog || !panel) return;
    let cancelled = false;
    let frame = 0;
    const transition = { duration: reduceMotion ? 0 : 0.45, ease: [0.25, 1, 0.5, 1] as const };
    if (menuOpen) {
      if (!dialog.open) {
        savedOverflow.current = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        dialog.showModal();
        // Measure after showModal: a hidden dialog has no usable panel width.
        menuAnimation.set({ x: panel.getBoundingClientRect().width });
      }
      frame = requestAnimationFrame(() => { void menuAnimation.start({ x: 0, transition }); });
    } else if (dialog.open) {
      void menuAnimation.start({ x: panel.getBoundingClientRect().width, transition }).then(() => {
        if (cancelled) return;
        dialog.close();
        document.body.style.overflow = savedOverflow.current ?? "";
        savedOverflow.current = null;
      });
    }
    return () => { cancelled = true; cancelAnimationFrame(frame); };
  }, [menuOpen, menuAnimation, reduceMotion]);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1051px)");
    const closeOnDesktop = () => { if (desktop.matches) setMenuOpen(false); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => {
      if (savedOverflow.current !== null) document.body.style.overflow = savedOverflow.current;
      desktop.removeEventListener("change", closeOnDesktop);
    };
  }, []);
  return <>
    <section className={`${s.hero} ${compact ? s.heroCompact : ""}`} aria-label="Motocross in Southern California">
      {!compact && <img className={s.heroImage} src={asset("b541a.png")} alt="Motocross rider on a sunlit dirt track" fetchPriority="high" />}
      <header className={s.header}>
        <Link href="/" aria-label="MXSoCal home"><img className={s.logo} src={asset("2051f.png")} alt="MXSoCal" width="129" height="53" /></Link>
        <SiteSearch />
        <nav className={s.nav} aria-label="Main navigation">{links.map(([label, href]) => <a key={label} href={href} aria-current={href === activePath ? "page" : undefined}>{label}</a>)}<Link className={s.signIn} href={accountUrl} aria-busy={loadingAuth}><img src={asset("bb3de.svg")} alt="" />{accountLabel}</Link></nav>
        <motion.a className={s.book} href="/bikes" whileTap={reduceMotion ? undefined : { scale: 0.985 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>Book Now</motion.a>
        <button className={`${s.mobile} ${s.menuToggle}`} type="button" aria-label="Open navigation menu" aria-controls="mobile-navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}><span /><span /><span /></button>
      </header>
    </section>
    <dialog ref={menuRef} id="mobile-navigation" className={s.drawer} aria-labelledby="mobile-navigation-title" onCancel={event => { event.preventDefault(); setMenuOpen(false); }} onClose={() => setMenuOpen(false)} onClick={event => { if (event.target === event.currentTarget) setMenuOpen(false); }}>
      <motion.div ref={menuPanelRef} className={s.drawerPanel} initial={{ x: "100%" }} animate={menuAnimation}>
        <div className={s.drawerHeading}><h2 id="mobile-navigation-title">Explore <span>MXSoCal</span></h2><button autoFocus type="button" aria-label="Close navigation menu" onClick={() => setMenuOpen(false)}><FiX size={22} aria-hidden="true" /></button></div>
        <SiteSearch mobile onNavigate={() => setMenuOpen(false)} />
        <nav className={s.drawerNav} aria-label="Mobile navigation">{links.map(([label, href], index) => { const Icon = menuIcons[index]; return <a key={label} href={href} aria-current={href === activePath ? "page" : undefined} onClick={() => setMenuOpen(false)}>{label}<Icon size={21} aria-hidden="true" /></a>; })}<Link href={accountUrl} aria-busy={loadingAuth} onClick={() => setMenuOpen(false)}>{accountLabel}<img src={asset("bb3de.svg")} alt="" /></Link></nav>
        <Link className={s.drawerBook} href="/bikes" onClick={() => setMenuOpen(false)}>Book your next ride <PiCalendarCheck size={19} aria-hidden="true" /></Link>
      </motion.div>
    </dialog>
  </>;
}

export function PublicSiteFooter() {
  return (
    <footer className={s.footer}><div className={s.footerBrand}><Link href="/" aria-label="MXSoCal home"><img src={asset("2051f.png")} alt="MXSoCal" width="212" height="87" /></Link><div className={s.footerSocial}>{[["08790.svg", "YouTube", "https://youtube.com/"], ["88500.svg", "Google", "https://google.com/"], ["d72a1.svg", "Instagram", "https://instagram.com/"], ["c56a7.svg", "LinkedIn", "https://linkedin.com/"]].map(([file, name, href]) => <a href={href} key={file} aria-label={name}><img src={asset(file)} alt="" /></a>)}</div></div>
      <nav className={s.footerNav} aria-label="Footer navigation">{[...links.slice(0, 3), ["Coaches", "/coaches"], ...links.slice(3)].map(([label, href]) => <a href={href} key={label}>{label}</a>)}</nav>
      <div className={s.footerContact}><p>Stop wrenching<br />Start experiencing</p><FooterContactForm /></div>
    </footer>
  );
}
