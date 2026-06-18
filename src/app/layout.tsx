import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import { OneSignalInit } from "@/components/OneSignalInit";

export const metadata: Metadata = {
  title: "ShiftPilot — Gig Driver Planner",
  description:
    "Plan your availability, log opportunities, track earnings, and get reminders for your gig shifts. ShiftPilot never logs into or acts on any gig platform on your behalf.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    title: "ShiftPilot",
    description: "Your personal gig-driver shift planner.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0d10",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body>
        <ServiceWorkerRegistrar />
        <OneSignalInit />
        {children}
      </body>
    </html>
  );
}
