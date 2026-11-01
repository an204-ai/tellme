'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Menu, X, Heart } from 'lucide-react';
import { navigation, site } from '@/lib/content';

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); toggleRef.current?.focus(); } };
    const outside = (event: PointerEvent) => { if (!menuRef.current?.contains(event.target as Node) && !toggleRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('keydown', key); document.addEventListener('pointerdown', outside);
    return () => { document.removeEventListener('keydown', key); document.removeEventListener('pointerdown', outside); };
  }, [open]);
  return <header className="site-header"><div className="nav-shell">
    <Link href="/" className="brand" aria-label="Tellme — Trang chủ"><img src="/brand/logos/tellme-wordmark-on-light.png" alt="tellme" width="367" height="115" /></Link>
    <nav aria-label="Điều hướng chính" className="desktop-nav">{navigation.map((item) => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? 'page' : undefined}>{item.label}</Link>)}</nav>
    <a className="button button-small nav-cta" href={site.appUrl}>Ghé Tellme <ArrowUpRight size={17} /></a>
    <button ref={toggleRef} type="button" className="menu-toggle" aria-label={open ? 'Đóng menu' : 'Mở menu'} aria-controls="mobile-menu" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
    <div ref={menuRef} id="mobile-menu" className={`mobile-menu ${open ? 'is-open' : ''}`} inert={!open}>{navigation.map((item) => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? 'page' : undefined}>{item.label}<ArrowUpRight size={18} /></Link>)}<a href={site.appUrl}>Ghé Tellme <ArrowUpRight size={18} /></a></div>
  </div></header>;
}
export function SiteFooter() {
  return <footer className="site-footer"><div className="footer-top"><Link href="/" className="brand"><img src="/brand/logos/tellme-wordmark-on-light.png" alt="Tellme — Trang chủ" width="367" height="115" /></Link><p>Your day.<br /><strong>Your stories.</strong></p><a href={site.appUrl} className="footer-join">Có chuyện gì, kể nhau nghe.<ArrowUpRight /></a></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Tellme</span><nav aria-label="Điều hướng cuối trang">{navigation.slice(1).map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}<a href={`mailto:${site.email}`}>Liên hệ</a></nav><span className="made-with">Chăm chút cho ngày thường <Heart size={14} /></span></div></footer>;
}
