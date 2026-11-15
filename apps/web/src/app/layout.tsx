import { cookies } from "next/headers";
import { BRAND_DESCRIPTION } from "@/lib/brand";
import type { Metadata, Viewport } from "next";
import { AppProviders } from "@/providers/AppProviders";
import { BrandIntro } from "@/components/app/BrandIntro";
import "../styles/globals.css";
import "../styles/moments.css";
import "../styles/refinements.css";
import "../styles/media.css";
import "../styles/settings.css";
import "../styles/messaging.css";
import "../styles/conversation-tools.css";
import "../styles/pull-refresh.css";
import "../styles/reactions.css";
import "../styles/mobile-type.css";
import "../styles/navigation-motion.css";
import "../styles/music.css";
import "../styles/social-composition.css";
import "../styles/camera.css";
import "../styles/form-typography.css";
import "../styles/support.css";
import "../styles/profile-journey.css";
import "../styles/stickers.css";
import "../styles/brand-intro.css";
import "../styles/social-scale.css";
import "../styles/close-friends.css";
import "../styles/sleeping-cat.css";
import "../styles/close-messages.css";
import "../styles/themes.css";
import "../styles/theme-switch.css";
import "../styles/story-stack.css";
import "../styles/profile-close.css";
import "../styles/founding-members.css";
import "../styles/moment-layout.css";
import "../styles/moment-stream.css";
import "../styles/locket-refinements.css";
import "../styles/upload-hamster.css";
import "../styles/app-finish.css";
import "../styles/ui-system.css";
import "../styles/photo-groups.css";
export async function generateViewport(): Promise<Viewport> {
  const dark = (await cookies()).get("tellme_theme")?.value === "dark";
  return { width: "device-width", initialScale: 1, viewportFit: "cover", interactiveWidget: "resizes-content", themeColor: dark ? "#18181b" : "#ffffff" };
}
export const metadata: Metadata = {
  title: "Tellme — Your day. Your stories.",
  description: BRAND_DESCRIPTION,
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme = (await cookies()).get("tellme_theme")?.value === "dark" ? "dark" : "light";
  return (
    <html lang="vi" data-theme={theme} data-scroll-behavior="smooth">
      <head><link rel="preload" href="/brand/fonts/fredoka-tellme-700.ttf" as="font" type="font/ttf" crossOrigin="anonymous" /></head>
      <body>
        <BrandIntro><AppProviders initialTheme={theme}>{children}</AppProviders></BrandIntro>
      </body>
    </html>
  );
}
