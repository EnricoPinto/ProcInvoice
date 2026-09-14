import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Sliders, CheckSquare, Users, Lock } from "lucide-react";
import { BrandLogo } from "@/components/common/BrandLogo";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Strictly verify ADMIN role against database
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (user?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="animate-fade-in" style={{ paddingBottom: "3rem" }}>
      {/* Admin Top Navigation Header */}
      <div
        className="glass-card"
        style={{
          padding: "1.25rem 1.5rem",
          marginBottom: "1.75rem",
          background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.04))",
          border: "1px solid rgba(99,102,241,0.2)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
            marginBottom: "1rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <BrandLogo variant="full" size={44} />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h1 style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
                  ProcInvoice Administration
                </h1>
                <span
                  style={{
                    fontSize: "0.6875rem",
                    padding: "2px 6px",
                    borderRadius: 4,
                    backgroundColor: "rgba(56, 189, 248, 0.15)",
                    color: "var(--primary)",
                    fontWeight: 700,
                  }}
                >
                  PORTAL
                </span>
              </div>
              <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                Manage keyword rules, validation engines, and user accounts
              </span>
            </div>
          </div>
          <span
            className="badge"
            style={{
              background: "rgba(99,102,241,0.15)",
              color: "var(--secondary)",
              border: "1px solid rgba(99,102,241,0.3)",
              fontWeight: 700,
              padding: "4px 10px",
            }}
          >
            ROLE: ADMIN
          </span>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <Link
            href="/admin/keyword-rules"
            className="btn btn-ghost btn-sm"
            style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}
          >
            <Sliders size={16} /> Keyword Rules
          </Link>
          <Link
            href="/admin/validation-rules"
            className="btn btn-ghost btn-sm"
            style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}
          >
            <CheckSquare size={16} /> Validation Rules
          </Link>
          <Link
            href="/admin/accounts"
            className="btn btn-ghost btn-sm"
            style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}
          >
            <Users size={16} /> Accounts Management
          </Link>
          <Link
            href="/admin/security"
            className="btn btn-ghost btn-sm"
            style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}
          >
            <Lock size={16} /> Security & Logs
          </Link>
        </div>
      </div>

      {children}
    </div>
  );
}
