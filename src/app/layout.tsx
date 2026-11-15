import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Plus_Jakarta_Sans, Bricolage_Grotesque, Geist_Mono } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import NativeShell from "@/components/NativeShell";
import DeviceShell from "@/components/DeviceShell";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ledger — Personal Finance",
  description: "Private income & expense tracker.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ledger",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0f17" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const h = await headers();
  const shell = h.get("x-device-shell") === "mobile" ? "mobile" : "desktop";

  return (
    <html
      lang="en"
      data-shell={shell}
      className={`${jakarta.variable} ${bricolage.variable} ${geistMono.variable} antialiased`}
    >
      <body className="min-h-full">
        {children}
        <DeviceShell initial={shell} />
        <NativeShell />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
