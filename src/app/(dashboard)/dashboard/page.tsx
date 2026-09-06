import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  FileText,
  Upload,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { formatDate, formatFileSize } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [invoices, profile] = await Promise.all([
    prisma.invoice.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    session!.user.accountType === "COMPANY"
      ? prisma.companyProfile.findUnique({ where: { userId } })
      : prisma.individualProfile.findUnique({ where: { userId } }),
  ]);

  const totalInvoices = await prisma.invoice.count({ where: { userId } });
  const processedCount = await prisma.invoice.count({
    where: { userId, status: "PROCESSED" },
  });
  const pendingCount = await prisma.invoice.count({
    where: { userId, status: { in: ["PENDING", "PROCESSING"] } },
  });

  const displayName =
    session!.user.accountType === "COMPANY"
      ? (profile as { companyName?: string })?.companyName
      : (profile as { fullName?: string })?.fullName;

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">
          Welcome back{displayName ? `, ${displayName}` : ""}! 👋
        </h1>
        <p className="page-subtitle">
          Here&apos;s an overview of your invoice processing activity.
        </p>
      </div>

      {/* Quick Actions */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem" }}>
        <Link href="/upload" className="btn btn-primary btn-lg" style={{ textDecoration: "none" }}>
          <Upload size={20} /> Upload Invoice
        </Link>
        <Link href="/invoices" className="btn btn-secondary btn-lg" style={{ textDecoration: "none" }}>
          <FileText size={20} /> View All Invoices
        </Link>
      </div>

      {/* Stats Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ background: "var(--primary-light)", color: "var(--secondary)" }}
          >
            <FileText size={22} />
          </div>
          <div className="stat-value">{totalInvoices}</div>
          <div className="stat-label">Total Invoices</div>
        </div>

        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ background: "var(--success-light)", color: "var(--success)" }}
          >
            <CheckCircle2 size={22} />
          </div>
          <div className="stat-value" style={{ color: "var(--success)" }}>
            {processedCount}
          </div>
          <div className="stat-label">Processed</div>
        </div>

        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ background: "var(--warning-light)", color: "var(--warning)" }}
          >
            <Clock size={22} />
          </div>
          <div className="stat-value" style={{ color: "var(--warning)" }}>
            {pendingCount}
          </div>
          <div className="stat-label">Pending / Processing</div>
        </div>

        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ background: "var(--accent-light)", color: "var(--accent)" }}
          >
            <TrendingUp size={22} />
          </div>
          <div className="stat-value" style={{ color: "var(--accent)" }}>
            {totalInvoices > 0
              ? Math.round((processedCount / totalInvoices) * 100)
              : 0}
            %
          </div>
          <div className="stat-label">Success Rate</div>
        </div>
      </div>

      {/* Recent Invoices */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <h2
            style={{
              fontSize: "1.125rem",
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            Recent Invoices
          </h2>
          <Link
            href="/invoices"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              color: "var(--secondary)",
              textDecoration: "none",
              fontSize: "0.875rem",
              fontWeight: 500,
            }}
          >
            View all <ArrowRight size={14} />
          </Link>
        </div>

        {invoices.length === 0 ? (
          <div
            className="glass-card"
            style={{
              padding: "3rem",
              textAlign: "center",
              borderStyle: "dashed",
            }}
          >
            <Upload
              size={40}
              style={{ color: "var(--text-muted)", margin: "0 auto 1rem" }}
            />
            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: "1rem",
                marginBottom: "1rem",
              }}
            >
              No invoices yet. Upload your first invoice to get started.
            </p>
            <Link href="/upload" className="btn btn-primary" style={{ textDecoration: "none" }}>
              <Upload size={16} /> Upload Invoice
            </Link>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>Size</th>
                  <th>Pages</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <FileText size={16} style={{ color: "var(--text-muted)" }} />
                        <span
                          style={{
                            maxWidth: 200,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {invoice.fileName}
                        </span>
                      </div>
                    </td>
                    <td>{formatFileSize(invoice.fileSize)}</td>
                    <td>{invoice.pageCount}</td>
                    <td>
                      <StatusBadge status={invoice.status} />
                    </td>
                    <td>{formatDate(invoice.createdAt)}</td>
                    <td>
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="btn btn-ghost btn-sm"
                        style={{ textDecoration: "none" }}
                      >
                        View <ArrowRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; icon: React.ReactNode; label: string }> = {
    PENDING: { cls: "badge-pending", icon: <Clock size={11} />, label: "Pending" },
    PROCESSING: { cls: "badge-processing", icon: <Clock size={11} />, label: "Processing" },
    PROCESSED: { cls: "badge-processed", icon: <CheckCircle2 size={11} />, label: "Processed" },
    FAILED: { cls: "badge-failed", icon: <XCircle size={11} />, label: "Failed" },
  };
  const s = map[status] || map.PENDING;
  return (
    <span className={`badge ${s.cls}`}>
      {s.icon} {s.label}
    </span>
  );
}
