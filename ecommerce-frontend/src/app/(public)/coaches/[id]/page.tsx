import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicCoach } from "@/lib/public-coach";
import CoachDetail from "@/components/public-site/CoachDetail";
import { PublicSiteHeader, PublicSiteFooter } from "@/components/public-site/PublicSiteChrome";
import shared from "@/components/public-site/contact-design.module.css";
import s from "@/components/public-site/product-design.module.css";

const font = DM_Sans({ subsets: ["latin"], weight: ["300", "400", "500", "700"] });
type Props = { params: Promise<{ id: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { coach } = await getPublicCoach((await params).id);
  if (!coach) return { title: "Coach Details | MXSoCal", robots: { index: false } };
  const name = `${coach.firstName} ${coach.lastName}`;
  return { title: `${name} | MXSoCal Coaching`, description: coach.bio?.slice(0, 160) || `Explore ${name}'s coaching specialties, experience, and rider levels.`, alternates: { canonical: `/coaches/${coach.id}` } };
}
export default async function CoachPage({ params }: Props) {
  const { coach, status } = await getPublicCoach((await params).id);
  if (status === 404) notFound();
  return <div className={font.className}>{coach ? <CoachDetail coach={coach} /> : <div className={shared.page}><PublicSiteHeader activePath="/coaches" /><main className={s.main}><div className={s.error} role="alert"><h1>We couldn’t load this coach.</h1><p>Please try again shortly.</p><Link href="/coaches">Back to coaches</Link></div></main><PublicSiteFooter /></div>}</div>;
}
