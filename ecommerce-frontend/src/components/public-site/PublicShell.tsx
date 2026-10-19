import Link from "next/link";
import { publicSite, type MenuLink } from "@/data/public-site";
import styles from "./public-site.module.css";

type ShellProps = {
  children: React.ReactNode;
  menu?: MenuLink[];
  footerMenu?: MenuLink[];
  footerText?: string;
};

export function SiteHeader({ menu = publicSite.menu }: { menu?: MenuLink[] }) {
  return <header className={styles.header}>
    <div className={styles.container}>
      <a className={styles.wordmark} href="/contact-us" aria-label={`${publicSite.name} contact page`}>MX<span>SoCal</span><span className={styles.brandDot}>®</span></a>
      <nav aria-label="Main navigation" className={styles.desktopNav}>{menu.map(link => <Link key={link.href} href={link.href}>{link.label}</Link>)}</nav>
      <details className={styles.mobileMenu}><summary>Menu <span aria-hidden="true">＋</span></summary><nav aria-label="Mobile navigation">{menu.map(link => <Link key={link.href} href={link.href}>{link.label}</Link>)}</nav></details>
    </div>
  </header>;
}

export function SiteFooter({ menu = publicSite.menu, text = publicSite.footerText }: { menu?: MenuLink[]; text?: string }) {
  return <footer className={styles.footer}><div className={styles.container}>
    <div className={styles.footerTop}><div><p className={styles.wordmark}>MX<span>SoCal</span></p><p>{text}</p></div><nav aria-label="Footer navigation">{menu.map(link => <Link key={link.href} href={link.href}>{link.label}</Link>)}</nav></div>
    <div className={styles.footerBottom}><small>© {new Date().getFullYear()} {publicSite.name}. All rights reserved.</small><a href="#top">Back to top ↑</a></div>
  </div></footer>;
}

export default function PublicShell({ children, menu, footerMenu, footerText }: ShellProps) {
  return <div id="top" className={styles.site}><a className={styles.skipLink} href="#main-content">Skip to content</a><SiteHeader menu={menu} />{children}<SiteFooter menu={footerMenu} text={footerText} /></div>;
}
