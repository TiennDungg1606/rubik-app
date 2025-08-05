// ...existing code...

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
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
  description: "Solving Rubik's Cube online with friends",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Stringee SDK cho video call */}
        <Script
          src="https://cdn.stringee.com/sdk/web/latest/stringee-web-sdk.min.js"
          strategy="beforeInteractive"
        />
        <Script
          src="https://cdn.stringee.com/sdk/web/2.2.21/stringee-call2.min.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* Bỏ SessionProviderWrapper, render children trực tiếp */}
        {children}
      </body>
    </html>
  );
}