import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["300","400","500","600","700","800"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1ab8c4",
};

export const metadata: Metadata = {
  title: "RepairTrackQR",
  description: "Sistema de Seguimiento de Reparaciones - Multi-Sucursal",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RepairTrack",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
};

import ToastProvider from "./providers";
import { PwaSetup } from "@/components/PwaSetup";
import { GlobalSearchProvider } from "@/components/GlobalSearchProvider";
import { ChakraUIProvider } from "./chakra-provider";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ToastProvider />
        <PwaSetup />
        <GlobalSearchProvider />
        <ChakraUIProvider>
          {children}
        </ChakraUIProvider>
      </body>
    </html>
  );
}
