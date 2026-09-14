"use client";

import React, { useState } from "react";
import { CheckCircle2, Clock, XCircle, AlertCircle, X } from "lucide-react";

interface StatusBadgeProps {
  status: string;
  failureReason?: string | null;
}

export function StatusBadge({ status, failureReason }: StatusBadgeProps) {
  const [showModal, setShowModal] = useState(false);

  const map: Record<string, { cls: string; icon: React.ReactNode; label: string }> = {
    PENDING: { cls: "badge-pending", icon: <Clock size={12} />, label: "Pending" },
    PROCESSING: { cls: "badge-processing", icon: <Clock size={12} />, label: "Processing" },
    PROCESSED: { cls: "badge-processed", icon: <CheckCircle2 size={12} />, label: "Processed" },
    FAILED: { cls: "badge-failed", icon: <XCircle size={12} />, label: "Failed" },
  };

  const s = map[status] || map.PENDING;

  if (status === "FAILED") {
    const errorText = failureReason || "Recognition error or unreadable document";

    return (
      <>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowModal(true);
          }}
          className={`badge ${s.cls}`}
          title={`Error reason: ${errorText}\n(Click for full details)`}
          style={{
            cursor: "pointer",
            border: "none",
            outline: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            transition: "transform 0.15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.04)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          {s.icon}
          <span>{s.label}</span>
          <AlertCircle size={11} style={{ opacity: 0.8 }} />
        </button>

        {showModal && (
          <div
            className="modal-backdrop"
            onClick={(e) => {
              e.stopPropagation();
              setShowModal(false);
            }}
            style={{ zIndex: 9999 }}
          >
            <div
              className="modal-card"
              style={{ maxWidth: 440 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <XCircle size={20} style={{ color: "var(--danger)" }} />
                  <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "var(--text)" }}>
                    Invoice Processing Failed
                  </h3>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-muted)",
                    padding: 4,
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              <div
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  padding: "12px 14px",
                  fontSize: "0.875rem",
                  color: "var(--text)",
                  lineHeight: 1.5,
                  marginBottom: 16,
                  wordBreak: "break-word",
                }}
              >
                <div style={{ fontWeight: 600, color: "var(--danger)", marginBottom: 4 }}>
                  Reason:
                </div>
                <div>{errorText}</div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowModal(false)}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <span className={`badge ${s.cls}`}>
      {s.icon} {s.label}
    </span>
  );
}
