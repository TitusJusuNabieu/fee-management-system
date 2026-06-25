import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "ENC Fee Management System — Every Nation College",
  description: "Student fee receipt and verification system · Every Nation College, Bo, Sierra Leone",
  icons: {
    icon: "/enc-logo-removebg.png",
    apple: "/enc-logo-removebg.png",
  },
  openGraph: {
    title: "ENC Fee Management System",
    description: "Student fee receipt and verification system · Every Nation College, Bo, Sierra Leone",
    images: ["/enc-logo-removebg.png"],
    siteName: "Every Nation College",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
