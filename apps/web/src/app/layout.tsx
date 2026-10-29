import type { Metadata } from "next";
import { AppProviders } from "@/providers/AppProviders";
import "../styles/globals.css";
import "../styles/moments.css";
import "../styles/refinements.css";
import "../styles/media.css";
export const metadata: Metadata = {
  title: "Tellme — Your day. Your stories.",
  description:
    "Kể câu chuyện của bạn, ghi lại Chuyện hôm nay và kết nối với những điều bình thường đáng nhớ.",
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
