import type { Metadata } from "next";
import SignInForm from "@/components/auth/SignInForm";
export const metadata: Metadata = { title: "Admin Sign In | MxSocal", description: "MxSocal staff sign-in, powered by Integriti Studio.", robots: { index: false } };
export default function AdminLogin() { return <SignInForm />; }
