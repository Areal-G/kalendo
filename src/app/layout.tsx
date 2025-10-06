import "./globals.css";

import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import { Toaster } from "sonner";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Kalendo - Scheduling for service businesses", template: "%s · Kalendo" },
  description: "Online booking, calendars and payments for clinics, salons and studios.",
};

export const viewport: Viewport = {
  themeColor: "#fbf8f4",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={montserrat.variable}>
      <body className="min-h-dvh font-sans">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
