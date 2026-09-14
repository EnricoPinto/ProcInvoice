import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Get Started — ProcInvoice",
  description: "Create your ProcInvoice company account for automated invoice processing and UBL 2.1 export.",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
