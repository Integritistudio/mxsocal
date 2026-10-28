"use client";
import Link from "next/link";
import { FiMenu, FiX, FiArrowUpRight } from "react-icons/fi";
import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";
import UserDropdown from "@/components/header/UserDropdown";
import { useSidebar } from "@/context/SidebarContext";
import s from "./admin-theme.module.css";
export default function AppHeader() {
 const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();
 return <header className={s.header}><div className={s.headerLeft}><button type="button" className={s.menuToggle} aria-label="Toggle navigation" onClick={() => { if (window.innerWidth >= 1024) toggleSidebar(); else toggleMobileSidebar(); }}>{isMobileOpen ? <FiX /> : <FiMenu />}</button><div><strong>MXSoCal administration</strong><small>Ride operations</small></div></div><div className={s.headerRight}><Link href="/" className={s.siteLink}>View website<FiArrowUpRight aria-hidden="true" /></Link><ThemeToggleButton /><UserDropdown /></div></header>;
}
