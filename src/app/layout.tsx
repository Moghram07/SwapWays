import type { Metadata, Viewport } from "next";
import { Cairo, Inter } from "next/font/google";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { AnalyticsProvider } from "@/components/providers/AnalyticsProvider";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ConditionalShell } from "@/components/layout/ConditionalShell";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { ChunkLoadRecovery } from "@/components/ChunkLoadRecovery";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  adjustFontFallback: true,
});

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
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
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        {/* Dark is the default on dashboard routes (only an explicit "light" choice opts out).
            Applied before paint to avoid a flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(location.pathname.indexOf('/dashboard')===0&&localStorage.getItem('theme')!=='light'){document.documentElement.classList.add('dark')}}catch(e){}`,
          }}
        />
      </head>
      <body suppressHydrationWarning className={`${inter.variable} ${cairo.variable} font-sans antialiased`}>
        <SessionProvider>
          <ThemeProvider>
            <AnalyticsProvider />
            <ChunkLoadRecovery />
            <ConditionalShell>
              {children}
              <ServiceWorkerRegistration />
            </ConditionalShell>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
