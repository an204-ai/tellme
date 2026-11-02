import { BRAND_DESCRIPTION } from "@/lib/brand";
import type { Metadata } from "next";
import { AppProviders } from "@/providers/AppProviders";
import { BrandIntro } from "@/components/app/BrandIntro";
import "../styles/globals.css";
import "../styles/moments.css";
import "../styles/refinements.css";
import "../styles/media.css";
import "../styles/settings-archive.css";
import "../styles/messaging.css";
import "../styles/conversation-tools.css";
import "../styles/pull-refresh.css";
import "../styles/reactions.css";
import "../styles/profile-connections.css";
import "../styles/mobile-type.css";
import "../styles/weather.css";
import "../styles/mobile-navigation.css";
import "../styles/navigation-motion.css";
import "../styles/music.css";
import "../styles/social-composition.css";
import "../styles/camera.css";
import "../styles/form-typography.css";
import "../styles/support.css";
import "../styles/profile-journey.css";
import "../styles/stickers.css";
import "../styles/brand-intro.css";
export const metadata: Metadata = {
  title: "Tellme — Your day. Your stories.",
  description: BRAND_DESCRIPTION,
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" data-scroll-behavior="smooth">
      <head><link rel="preload" href="/brand/fonts/fredoka-tellme-700.ttf" as="font" type="font/ttf" crossOrigin="anonymous" /></head>
      <body>
        <BrandIntro><AppProviders>{children}</AppProviders></BrandIntro>
      </body>
    </html>
  );
}
