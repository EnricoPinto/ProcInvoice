import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Get Started — ProcInvoice",
  description: "Create your ProcInvoice account. Choose between a company or individual account.",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
