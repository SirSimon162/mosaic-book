import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import Script from "next/script";
import { SessionProvider } from "@/features/auth/provider";
import { SiteChrome } from "@/features/shell/site-chrome";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Mosaic",
  description: "A private workspace for files, sheets, sites, and videos you ask about.",
  icons: { icon: "/mosaic-logo.svg" },
};

const themeScript = `try{if(localStorage.getItem("mosaic-theme")==="night")document.documentElement.dataset.theme="night"}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${geistMono.variable} ${newsreader.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-primary font-primary text-primary antialiased">
        <Script id="mosaic-theme" strategy="beforeInteractive">
          {themeScript}
        </Script>
        <SessionProvider>
          <SiteChrome>{children}</SiteChrome>
        </SessionProvider>
      </body>
    </html>
  );
}
