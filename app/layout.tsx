// ...existing code...

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";

import SessionProviderWrapper from "./SessionProviderWrapper";
import { getServerUser } from "@/lib/getServerUser";
import "./globals.css";





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
  description: "Chơi Rubik online miễn phí, thi đấu 1vs1 với bạn bè, timer chuyên nghiệp, tạo phòng riêng. Ứng dụng giải Rubik tốt nhất cho người chơi Việt Nam.",
  keywords: "Rubik App, solo rubik, solo rubik 1vs1, solo rubik 2vs2, web app rubik, web rubik của SunRubik, rubik online, rubik timer, thi đấu rubik",
  authors: [{ name: "SunRubik" }],
  creator: "SunRubik",
  publisher: "SunRubik",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://rubik-app-buhb.vercel.app'), // Thay đổi thành domain thực của bạn
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "Rubik App",
    description: "Chơi Rubik online miễn phí, thi đấu 1vs1 với bạn bè, timer chuyên nghiệp, tạo phòng riêng.",
    url: 'https://rubik-app-buhb.vercel.app', // Thay đổi thành domain thực của bạn
    siteName: 'Rubik App',
    images: [
      {
        url: '/icon-512.png',
        width: 512,
        height: 512,
        alt: 'Rubik App Logo',
      },
    ],
    locale: 'vi_VN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Rubik App",
    description: "Chơi Rubik online miễn phí, thi đấu 1vs1 với bạn bè, timer chuyên nghiệp, tạo phòng riêng.",
    images: ['/icon-512.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code', // Thay đổi thành code verification từ Google Search Console
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const serverUser = await getServerUser().catch(() => null);
  return (
    <html lang="en">
      <head>
        {/* Stringee SDK cho video call */}
        <Script
          src="https://cdn.stringee.com/sdk/web/latest/stringee-web-sdk.min.js"
          strategy="beforeInteractive"
        />
        
        {/* SEO Meta Tags */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="language" content="vi" />
        <meta name="geo.region" content="VN" />
        <meta name="geo.placename" content="Vietnam" />
        <meta name="theme-color" content="#000000" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#000000" />
        
        {/* Social Media Meta Tags */}
        <meta property="og:title" content="Rubik App" />
        <meta property="og:description" content="Chơi Rubik online miễn phí, thi đấu 1vs1 với bạn bè, timer chuyên nghiệp, tạo phòng riêng." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://rubik-app-buhb.vercel.app" />
        <meta property="og:image" content="/icon-512.png" />
        <meta property="og:site_name" content="Rubik App" />
        <meta property="og:locale" content="vi_VN" />
        
        {/* Twitter Card Meta Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Rubik App" />
        <meta name="twitter:description" content="Chơi Rubik online miễn phí, thi đấu 1vs1 với bạn bè, timer chuyên nghiệp, tạo phòng riêng." />
        <meta name="twitter:image" content="/icon-512.png" />
        
        {/* PWA Meta Tags */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Rubik App" />
        
        {/* Structured Data for Rich Snippets */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "Rubik App",
              "alternateName": [
                "Rubik App SunRubik",
                "Solo Rubik 1vs1",
                "Solo Rubik 2vs2"
              ],
              "description": "Rubik App của SunRubik giúp solo rubik 1vs1, solo rubik 2vs2, luyện timer rubik online và thi đấu rubik với cộng đồng Việt Nam.",
              "keywords": "Rubik App, solo rubik, solo rubik 1vs1, solo rubik 2vs2, web app rubik, web rubik của SunRubik, rubik online, rubik timer",
              "url": "https://rubik-app-buhb.vercel.app",
              "applicationCategory": "Game",
              "operatingSystem": "Web Browser, iOS, Android",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "VND"
              },
              "author": {
                "@type": "Organization",
                "name": "Rubik App Team"
              }
            })
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SessionProviderWrapper initialUser={serverUser}>{children}</SessionProviderWrapper>
      </body>
    </html>
  );
}