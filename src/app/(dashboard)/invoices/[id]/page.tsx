import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  Download,
} from "lucide-react";
import { formatDate, formatFileSize } from "@/lib/utils";
import type { ExtractedInvoiceData } from "@/lib/ocr";
import { EditableResults } from "@/components/invoice/EditableResults";
import { decryptJson } from "@/lib/encryption";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { id, userId: session!.user.id },
  });

  if (!invoice) notFound();

  const rawData = invoice.extractedData;
  const data = (typeof rawData === "string"
    ? decryptJson(rawData)
    : rawData) as ExtractedInvoiceData | null;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <Link
          href="/invoices"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: "var(--text-secondary)",
            textDecoration: "none",
            fontSize: "0.875rem",
            marginBottom: "1rem",
          }}
        >
          <ArrowLeft size={16} /> Back to Invoices
        </Link>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <FileText size={28} style={{ color: "var(--secondary)" }} />
              {invoice.fileName}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
              <StatusChip status={invoice.status} />
              <span style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
                {formatDate(invoice.createdAt)}
              </span>
              <span style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
                {formatFileSize(invoice.fileSize)}
              </span>
              <span style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
                {invoice.pageCount} {invoice.pageCount === 1 ? "page" : "pages"}
              </span>
            </div>
          </div>
          <a
            href={`/api/invoices/${invoice.id}/download`}
            download
            className="btn btn-secondary"
          >
            <Download size={16} /> Download Original
          </a>
        </div>
      </div>

      {/* Status States */}
      {invoice.status === "PENDING" || invoice.status === "PROCESSING" ? (
        <div className="alert alert-info" style={{ marginBottom: "1.5rem" }}>
          <Clock size={16} style={{ flexShrink: 0, animation: "spin 2s linear infinite" }} />
          Your invoice is being processed. This usually takes a few seconds — please refresh shortly.
        </div>
      ) : invoice.status === "FAILED" ? (
        <div className="alert alert-error" style={{ marginBottom: "1.5rem" }}>
          <XCircle size={16} style={{ flexShrink: 0 }} />
          Data recognition failed for this invoice. Please try uploading again or contact support.
        </div>
      ) : null}

      {/* Extracted Data */}
      {data && invoice.status === "PROCESSED" && (
        <EditableResults invoiceId={invoice.id} initialData={data} />
      )}
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, { cls: string; icon: React.ReactNode; label: string }> = {
    PENDING: { cls: "badge-pending", icon: <Clock size={12} />, label: "Pending" },
    PROCESSING: { cls: "badge-processing", icon: <Clock size={12} />, label: "Processing" },
    PROCESSED: { cls: "badge-processed", icon: <CheckCircle2 size={12} />, label: "Processed" },
    FAILED: { cls: "badge-failed", icon: <XCircle size={12} />, label: "Failed" },
  };
  const s = map[status] || map.PENDING;
  return <span className={`badge ${s.cls}`}>{s.icon} {s.label}</span>;
}
