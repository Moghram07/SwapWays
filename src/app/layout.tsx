import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { AnalyticsProvider } from "@/components/providers/AnalyticsProvider";
import { ConditionalShell } from "@/components/layout/ConditionalShell";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Swap Ways — Trip & Vacation Swaps for Crew",
  description: "Stop searching. Start swapping. Match trip and vacation swaps with your airline crew.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "any" }],
    apple: [{ url: "/apple-icon.png", sizes: "512x512", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#1E6FB9",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${geistMono.variable} font-sans antialiased`}>
        <SessionProvider>
          <AnalyticsProvider />
          <ConditionalShell>
            {children}
            <ServiceWorkerRegistration />
          </ConditionalShell>
        </SessionProvider>
      </body>
    </html>
  );
}
