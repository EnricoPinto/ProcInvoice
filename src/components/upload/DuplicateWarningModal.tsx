"use client";

import { AlertTriangle, Trash2, ArrowRight } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";

interface DuplicateInfo {
  existingId: string;
  existingFileName: string;
  existingDate: string;
  vendor?: string;
  invoiceNumber?: string;
  amount?: number | string;
}

interface DuplicateWarningModalProps {
  isOpen: boolean;
  duplicateInfo: DuplicateInfo | null;
  onDiscard: () => void;
  onContinue: () => void;
  isProcessing?: boolean;
}

export function DuplicateWarningModal({
  isOpen,
  duplicateInfo,
  onDiscard,
  onContinue,
  isProcessing = false,
}: DuplicateWarningModalProps) {
  if (!isOpen || !duplicateInfo) return null;

  const vendor = duplicateInfo.vendor || "Unknown Vendor";
  const invNumber = duplicateInfo.invoiceNumber || "N/A";
  const amountStr =
    duplicateInfo.amount !== undefined && duplicateInfo.amount !== null && duplicateInfo.amount !== ""
      ? formatCurrency(Number(duplicateInfo.amount))
      : "N/A";
  const dateStr = duplicateInfo.existingDate ? formatDate(duplicateInfo.existingDate) : "earlier";

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: 520 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              backgroundColor: "rgba(245, 158, 11, 0.12)",
              color: "var(--warning)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <AlertTriangle size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: "1.125rem", fontWeight: 700, margin: "0 0 6px 0", color: "var(--text)" }}>
              Duplicate Invoice Detected
            </h3>
            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
              An invoice matching this document was already uploaded to your account on{" "}
              <strong style={{ color: "var(--text)" }}>{dateStr}</strong>.
            </p>
          </div>
        </div>

        <div
          style={{
            backgroundColor: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            padding: "14px 16px",
            marginBottom: 20,
            fontSize: "0.875rem",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", rowGap: 8 }}>
            <span style={{ color: "var(--text-secondary)" }}>Vendor:</span>
            <span style={{ fontWeight: 600, color: "var(--text)" }}>{vendor}</span>

            <span style={{ color: "var(--text-secondary)" }}>Invoice #:</span>
            <span style={{ fontWeight: 600, color: "var(--text)" }}>{invNumber}</span>

            <span style={{ color: "var(--text-secondary)" }}>Amount:</span>
            <span style={{ fontWeight: 600, color: "var(--text)" }}>{amountStr}</span>

            <span style={{ color: "var(--text-secondary)" }}>Original File:</span>
            <span style={{ color: "var(--text-muted)", wordBreak: "break-all" }}>
              {duplicateInfo.existingFileName}
            </span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 12,
            borderTop: "1px solid var(--border)",
            paddingTop: 16,
          }}
        >
          <button
            type="button"
            className="btn btn-outline"
            onClick={onDiscard}
            disabled={isProcessing}
            style={{
              color: "var(--danger)",
              borderColor: "var(--danger)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Trash2 size={16} />
            Discard Duplicate
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onContinue}
            disabled={isProcessing}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <span>Continue & Save as New</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
