import type { Metadata } from "next";
import "./globals.css";
import { CookieBanner } from "@/components/CookieBanner";

export const metadata: Metadata = {
  title: "ProcInvoice — Smart Invoice Processing",
  description:
    "Automate your invoice processing with AI-powered OCR data recognition. Upload or scan invoices and extract structured financial data instantly.",
  keywords: ["invoice processing", "OCR", "data recognition", "invoice management"],
  robots: "noindex, nofollow", // private B2B app
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}

