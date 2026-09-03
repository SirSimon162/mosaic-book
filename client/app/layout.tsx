import type { Metadata } from "next";
import { Figtree, Geist_Mono, Roboto } from "next/font/google";

import { ThemeProvider } from "@/components/providers/theme-provider";
import { cn } from "@/lib/utils";

import "./globals.css";

const heading = Figtree({ subsets: ["latin"], variable: "--font-heading" });
const sans = Roboto({ subsets: ["latin"], variable: "--font-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "Mosaic — Your sources, one place to ask",
  description:
    "Drop in notes, websites, YouTube videos, PDFs, and spreadsheets. Ask questions grounded in those files, then turn answers into quizzes, reports, and charts.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "h-full antialiased font-sans",
        heading.variable,
        sans.variable,
        mono.variable,
      )}
    >
      <body className="min-h-full overflow-x-clip">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
