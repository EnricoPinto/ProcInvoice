import type { Metadata } from "next";
import Link from "next/link";
import { Building2, User } from "lucide-react";

export const metadata: Metadata = {
  title: "Create Account — ProcInvoice",
  description: "Register for ProcInvoice. Choose between a company or individual account to get started.",
};

export default function RegisterPage() {
  return (
    <div className="auth-container">
      <div className="auth-card animate-slide-up">
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div
            style={{
              width: 56,
              height: 56,
              background: "var(--gradient-primary)",
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1rem",
              boxShadow: "0 8px 24px rgba(99,102,241,0.4)",
              fontSize: "1.5rem",
              fontWeight: 800,
              color: "white",
            }}
          >
            P
          </div>
          <h1
            style={{
              fontSize: "1.875rem",
              fontWeight: 800,
              color: "var(--text-primary)",
              letterSpacing: "-0.03em",
              lineHeight: 1.2,
            }}
          >
            Create your account
          </h1>
          <p
            style={{
              color: "var(--text-secondary)",
              marginTop: "0.5rem",
              fontSize: "0.9375rem",
            }}
          >
            How will you be using ProcInvoice?
          </p>
        </div>

        {/* Account Type Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <Link href="/register/company" style={{ textDecoration: "none" }}>
            <div
              className="glass-card"
              style={{
                padding: "1.5rem",
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                cursor: "pointer",
                border: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  background: "var(--primary-light)",
                  borderRadius: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  color: "var(--secondary)",
                }}
              >
                <Building2 size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "1rem",
                    color: "var(--text-primary)",
                    marginBottom: 4,
                  }}
                >
                  Company Account
                </div>
                <div
                  style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}
                >
                  For businesses — includes VAT, COC, and IBAN fields
                </div>
              </div>
              <div style={{ color: "var(--text-muted)", fontSize: "1.25rem" }}>
                →
              </div>
            </div>
          </Link>

          <Link href="/register/individual" style={{ textDecoration: "none" }}>
            <div
              className="glass-card"
              style={{
                padding: "1.5rem",
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  background: "var(--accent-light)",
                  borderRadius: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  color: "var(--accent)",
                }}
              >
                <User size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "1rem",
                    color: "var(--text-primary)",
                    marginBottom: 4,
                  }}
                >
                  Individual Account
                </div>
                <div
                  style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}
                >
                  For freelancers & personal invoice processing
                </div>
              </div>
              <div style={{ color: "var(--text-muted)", fontSize: "1.25rem" }}>
                →
              </div>
            </div>
          </Link>
        </div>

        <div
          style={{
            textAlign: "center",
            marginTop: "2rem",
            fontSize: "0.9rem",
            color: "var(--text-secondary)",
          }}
        >
          Already have an account?{" "}
          <Link
            href="/login"
            style={{ color: "var(--secondary)", textDecoration: "none", fontWeight: 600 }}
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
