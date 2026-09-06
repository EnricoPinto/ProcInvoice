import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { FileText, Upload, ArrowRight, CheckCircle2, Clock, XCircle, Search } from "lucide-react";
import { formatDate, formatFileSize } from "@/lib/utils";

export default async function InvoicesPage() {
  const session = await auth();
  const userId = session!.user.id;

  const invoices = await prisma.invoice.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="animate-fade-in">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "2rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div className="page-header" style={{ margin: 0 }}>
          <h1 className="page-title">My Invoices</h1>
          <p className="page-subtitle">
            All your processed and pending invoices — {invoices.length} total
          </p>
        </div>
        <Link href="/upload" className="btn btn-primary" style={{ textDecoration: "none" }}>
          <Upload size={16} /> Upload New
        </Link>
      </div>

      {invoices.length === 0 ? (
        <div
          className="glass-card"
          style={{ padding: "4rem", textAlign: "center", borderStyle: "dashed" }}
        >
          <FileText size={48} style={{ color: "var(--text-muted)", margin: "0 auto 1rem" }} />
          <h2 style={{ color: "var(--text-primary)", marginBottom: "0.5rem" }}>
            No invoices yet
          </h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
            Upload your first invoice to get started with automated data recognition.
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
                <th>Uploaded</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <FileText size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                      <span
                        style={{
                          maxWidth: 280,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={invoice.fileName}
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
                  <td style={{ whiteSpace: "nowrap" }}>
                    {formatDate(invoice.createdAt)}
                  </td>
                  <td>
                    <Link
                      href={`/invoices/${invoice.id}`}
                      className="btn btn-ghost btn-sm"
                      style={{ textDecoration: "none", whiteSpace: "nowrap" }}
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
