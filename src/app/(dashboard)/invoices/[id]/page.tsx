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
  ExternalLink,
  Eye,
} from "lucide-react";
import { formatDate, formatFileSize } from "@/lib/utils";
import type { ExtractedInvoiceData } from "@/lib/ocr";
import { EditableResults } from "@/components/invoice/EditableResults";
import { DocumentViewer } from "@/components/invoice/DocumentViewer";
import { decryptJson } from "@/lib/encryption";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) notFound();

  const { id } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: {
      id,
      ...(session.user.role === "ADMIN" ? {} : { userId: session.user.id }),
    },
  });

  if (!invoice) notFound();

  // Get user country for Dutch/English localization
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { country: true },
  });
  const accountCountry = user?.country || "NL";

  const rawData = invoice.extractedData;
  let data: ExtractedInvoiceData | null = null;
  if (rawData) {
    try {
      data = (typeof rawData === "string"
        ? decryptJson(rawData)
        : rawData) as ExtractedInvoiceData | null;
    } catch (err) {
      console.error("Failed to decrypt invoice data:", err);
      data = null;
    }
  }

  const filePreviewUrl = `/api/invoices/${invoice.id}/file`;

  return (
    <div className="animate-fade-in" style={{ paddingBottom: "2rem" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <Link
          href="/invoices"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: "var(--text-secondary)",
            textDecoration: "none",
            fontSize: "0.875rem",
            marginBottom: "0.75rem",
          }}
        >
          <ArrowLeft size={16} /> Back to Invoices
        </Link>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            <h1
              className="page-title"
              style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "1.5rem" }}
            >
              <FileText size={26} style={{ color: "var(--secondary)" }} />
              {invoice.fileName}
            </h1>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                marginTop: "0.4rem",
                flexWrap: "wrap",
              }}
            >
              <StatusChip status={invoice.status} />
              <span style={{ color: "var(--text-muted)", fontSize: "0.8125rem" }}>
                {formatDate(invoice.createdAt)}
              </span>
              <span style={{ color: "var(--text-muted)", fontSize: "0.8125rem" }}>
                {formatFileSize(invoice.fileSize)}
              </span>
              <span style={{ color: "var(--text-muted)", fontSize: "0.8125rem" }}>
                {invoice.pageCount} {invoice.pageCount === 1 ? "page" : "pages"}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <a
              href={filePreviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-sm"
              title="Open document in new tab"
            >
              <ExternalLink size={15} /> Open Document
            </a>
            <a
              href={filePreviewUrl}
              download={invoice.fileName}
              className="btn btn-secondary btn-sm"
            >
              <Download size={15} /> Download Original
            </a>
          </div>
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

      {/* Review Screen — Desktop: Left PDF Viewer / Right Form; Mobile: Top PDF / Bottom Form */}
      {data && invoice.status === "PROCESSED" && (
        <div className="invoice-split-layout">
          {/* LEFT / TOP: Document Viewer (PDF or Image) */}
          <DocumentViewer
            fileUrl={filePreviewUrl}
            fileName={invoice.fileName}
            mimeType={invoice.mimeType}
          />

          {/* RIGHT / BELOW: Extracted & Editable Form */}
          <div style={{ minWidth: 0 }}>
            <EditableResults
              invoiceId={invoice.id}
              initialData={data}
              accountCountry={accountCountry}
            />
          </div>
        </div>
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
  return (
    <span className={`badge ${s.cls}`}>
      {s.icon} {s.label}
    </span>
  );
}
