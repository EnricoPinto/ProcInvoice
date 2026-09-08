"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Upload,
  FileText,
  Settings,
  LogOut,
  User,
  Sliders,
  ShieldCheck,
} from "lucide-react";

interface SidebarProps {
  user: {
    id?: string | null;
    email?: string | null;
    name?: string | null;
    accountType?: string | null;
    role?: string | null;
  };
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "Upload Invoice", icon: Upload },
  { href: "/invoices", label: "My Invoices", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

const adminItems = [
  { href: "/admin/keyword-rules", label: "Keyword Rules", icon: Sliders },
  { href: "/admin/security", label: "Security & Audit", icon: ShieldCheck },
];

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">P</div>
        <span className="sidebar-logo-text">ProcInvoice</span>
      </div>

      {/* Navigation */}
      <nav className="nav-section" style={{ flex: 1 }}>
        <p className="nav-section-label">Navigation</p>
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`nav-link${pathname === href || (href !== "/dashboard" && pathname.startsWith(href)) ? " active" : ""}`}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}

        {user.role === "ADMIN" && (
          <>
            <p className="nav-section-label" style={{ marginTop: "1.5rem" }}>Admin Controls</p>
            {adminItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`nav-link${pathname === href || pathname.startsWith(href) ? " active" : ""}`}
              >
                <Icon size={18} />
                {label}
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* User & Sign out */}
      <div className="sidebar-footer">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "0.625rem 0.75rem",
            marginBottom: "0.5rem",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "var(--primary-light)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--secondary)",
              flexShrink: 0,
            }}
          >
            <User size={18} />
          </div>
          <div style={{ overflow: "hidden" }}>
            <div
              style={{
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "var(--text-primary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user.email}
            </div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                textTransform: "capitalize",
              }}
            >
              {user.accountType?.toLowerCase()} account
            </div>
          </div>
        </div>
        <button
          className="nav-link"
          onClick={() => signOut({ callbackUrl: "/login" })}
          style={{ color: "var(--error)", width: "100%" }}
        >
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </aside>
  );
}

