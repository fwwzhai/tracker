import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Newsreader } from "next/font/google";
import { SwRegister } from "@/components/sw-register";
import "./globals.css";

const ui = Instrument_Sans({ variable: "--font-ui", subsets: ["latin"] });
const serif = Newsreader({ variable: "--font-serif", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "Daily Hub",
  description: "Food, money and steps in under five seconds.",
  appleWebApp: { capable: true, title: "Daily Hub", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f2ea" },
    { media: "(prefers-color-scheme: dark)", color: "#131411" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-MY" className={`${ui.variable} ${serif.variable} antialiased`}>
      <body className="min-h-dvh">
        {children}
        <SwRegister />
      </body>
    </html>
  );
}
