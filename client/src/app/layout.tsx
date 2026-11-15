import type { Metadata } from "next";
import { DM_Sans, IBM_Plex_Mono, Instrument_Serif, Space_Grotesk } from "next/font/google";
import Script from "next/script";
import { SessionProvider } from "@/features/auth/provider";
import { SiteChrome } from "@/features/shell/site-chrome";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
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
      className={`${spaceGrotesk.variable} ${dmSans.variable} ${instrumentSerif.variable} ${ibmPlexMono.variable} h-full`}
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
