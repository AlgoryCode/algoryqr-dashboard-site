import type { Metadata } from "next";
import localFont from "next/font/local";

import "./globals.css";
import Providers from "@/components/providers";
import { buildMetadata } from "@/lib/seo";

const geistSans = localFont({
  src: "../../public/fonts/GeistVariableVF.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
});

const geistMono = localFont({
  src: "../../public/fonts/GeistMonoVariableVF.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = buildMetadata({
  title: "AlgoryQR Dashboard",
  description: "AlgoryQR işletme paneli",
  path: "/",
  noIndex: true,
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=block"
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
