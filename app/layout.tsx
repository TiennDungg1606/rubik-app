// ...existing code...

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { usePathname } from 'next/navigation';





const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rubik App",
  description: "Solving Rubik's Cube online with friends",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Dùng hook để lấy pathname, nhưng hook chỉ dùng được trong component con của body
  // Nên phải tạo một component phụ để render script quảng cáo đúng cách
  function AdSenseScript() {
    const pathname = usePathname();
    // Không render script nếu là trang phòng đấu
    const isRoomPage = /^\/room\//.test(pathname);
    if (isRoomPage) return null;
    return (
      <Script
        async
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8360769059197588"
        crossOrigin="anonymous"
        strategy="afterInteractive"
      />
    );
  }
  return (
    <html lang="en">
      <head>
        {/* Stringee SDK cho video call */}
        <Script
          src="https://cdn.stringee.com/sdk/web/latest/stringee-web-sdk.min.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* Bỏ SessionProviderWrapper, render children trực tiếp */}
        <AdSenseScript />
        {children}
      </body>
    </html>
  );
}