import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Tellme — Kết nối • Lắng nghe • Kiến tạo giá trị",
  description: "Kết nối mọi người bằng những điều quan trọng. Tellme giúp bạn giao tiếp, chia sẻ và kết nối dễ dàng hơn mỗi ngày."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="antialiased min-h-screen bg-[#FFFFFF] text-[#2D3748]">
        {children}
      </body>
    </html>
  );
}

