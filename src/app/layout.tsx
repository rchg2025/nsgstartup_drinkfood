import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NSG STARTUP - Hệ thống bán hàng nước uống & đồ ăn vặt",
  description: "Hệ thống POS hiện đại dành cho startup bán nước uống và đồ ăn vặt. Quản lý đơn hàng, pha chế, thanh toán và thống kê doanh thu.",
  keywords: "POS, bán hàng, nước uống, đồ ăn vặt, quản lý, startup",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
