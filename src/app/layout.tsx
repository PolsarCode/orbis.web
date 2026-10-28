import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import { TopLoadingBar } from "@/components/organisms/top-loading-bar";
import { wakeServerScript } from "@/lib/api";
import { authScript } from "@/stores/auth-store";
import { themeScript } from "@/stores/theme-store";
import { AntdProvider } from "./antd-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["700", "800"],
});

const siteTitle =
  process.env.NODE_ENV === "development" ? "Orbis (Development)" : "Orbis";

const description =
  "Orbis is a home for fan communities, with a feed for quick updates, a forum for the discussions worth keeping, and a library to track what you’re watching, reading, and playing.";

export const metadata: Metadata = {
  title: { default: siteTitle, template: `%s · ${siteTitle}` },
  description,
  applicationName: "Orbis",
  appleWebApp: { capable: true, title: "Orbis" },
  openGraph: {
    type: "website",
    siteName: "Orbis",
    title: "Orbis — Your fandom. Your people.",
    description,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Orbis — Your fandom. Your people.",
    description,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eae5dc" },
    { media: "(prefers-color-scheme: dark)", color: "#151613" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${barlowCondensed.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: themeScript + authScript + wakeServerScript }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <TopLoadingBar />
        <AntdProvider>{children}</AntdProvider>
        <Analytics />
      </body>
    </html>
  );
}
