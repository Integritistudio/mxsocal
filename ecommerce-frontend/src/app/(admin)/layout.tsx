"use client";

import { useSidebar } from "@/context/SidebarContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import React from "react";
import { DM_Sans } from "next/font/google";
import s from "@/layout/admin-theme.module.css";
const font = DM_Sans({ subsets: ["latin"], variable: "--font-admin" });
import { useUser } from "@/context/UserContext";


export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  const { user, loadingAuth } = useUser()



  // Dynamic class for main content margin based on sidebar state
  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
      ? "lg:ml-[290px]"
      : "lg:ml-[90px]";

  if (loadingAuth || !user || user.role === "user") return <div className={`dark ${font.variable} ${s.theme} p-8`} role="status">Loading your account...</div>;

  return (
    <div className={`dark ${font.variable} ${s.theme} min-h-screen xl:flex xl:overflow-x-hidden`}>
      {/* Sidebar and Backdrop */}
      <AppSidebar />
      <Backdrop />
      {/* Main Content Area */}
      <div
        className={`flex-1 transition-all  duration-300 ease-in-out ${mainContentMargin}`}
      >
        {/* Header */}
        <AppHeader />
        {/* Page Content */}
        <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6">{children}</div>
      </div>
    </div>
  );
}
