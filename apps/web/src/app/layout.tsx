import { BRAND_DESCRIPTION } from "@/lib/brand";
import type { Metadata } from "next";
import { AppProviders } from "@/providers/AppProviders";
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
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
