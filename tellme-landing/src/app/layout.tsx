import type { Metadata, Viewport } from 'next';
import '@fontsource/be-vietnam-pro/400.css';
import '@fontsource/be-vietnam-pro/500.css';
import '@fontsource/be-vietnam-pro/600.css';
import '@fontsource/be-vietnam-pro/700.css';
import './globals.css';
import './brand-intro.css';
import { BrandIntro } from '@/components/BrandIntro';
import { Providers } from '@/components/Providers';
import { SiteHeader, SiteFooter } from '@/components/SiteChrome';
const landingOrigin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tellme-landing.onrender.com';
export const metadata: Metadata = { metadataBase: new URL(landingOrigin), title: { default: 'Tellme — Đi làm cũng có chuyện để kể.', template: '%s · Tellme' }, description: 'Chia sẻ những khoảnh khắc đời thường trong ngày đi làm. Chụp một tấm, kể một chút và gặp những người cùng nhịp sống trên Tellme.', icons: { icon: '/icon.png' }, openGraph: { title: 'Tellme — Your day. Your stories.', description: 'Đi làm cũng có chuyện để kể.', images: [{ url: '/moments/lunch.webp', width: 900, height: 1125, alt: 'Một bữa trưa cùng những người bạn tại Tellme' }], locale: 'vi_VN', type: 'website' } };
export const viewport: Viewport = { themeColor: '#07327f', width: 'device-width', initialScale: 1 };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="vi"><head><link rel="preload" href="/brand/fonts/fredoka-tellme-700.ttf" as="font" type="font/ttf" crossOrigin="anonymous" /></head><body><BrandIntro><a className="skip-link" href="#main">Đến nội dung</a><Providers><SiteHeader /><main id="main">{children}</main><SiteFooter /></Providers></BrandIntro></body></html>; }
