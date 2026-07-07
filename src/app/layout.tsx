import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin", "vietnamese"],
  variable: "--font-space-grotesk",
  display: 'swap',
});

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
      <body className={`${inter.variable} ${spaceGrotesk.variable}`}>{children}</body>
    </html>
  );
}
