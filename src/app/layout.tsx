import type { Metadata } from "next";
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#1E6FB9" />
      </head>
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
