"use client";

import { useState } from "react";
import { FileText, AlertTriangle, X } from "lucide-react";

interface MultiPageModalProps {
  pageCount: number;
  onConfirm: (rememberSetting: boolean) => void;
  onCancel: () => void;
}

export function MultiPageModal({ pageCount, onConfirm, onCancel }: MultiPageModalProps) {
  const [remember, setRemember] = useState(false);

  return (
    <div className="modal-overlay">
      <div className="modal-box animate-slide-up">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                background: "var(--warning-light)",
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--warning)",
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={22} />
            </div>
            <h2 className="modal-title" style={{ margin: 0 }}>
              Multiple Pages Detected
            </h2>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onCancel} style={{ flexShrink: 0 }}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p>
            Your file contains{" "}
            <strong style={{ color: "var(--text-primary)" }}>{pageCount} pages</strong>.
            Multiple documents are not supported — only the{" "}
            <strong style={{ color: "var(--text-primary)" }}>first page</strong> will be
            used for data recognition.
          </p>
          <p style={{ marginTop: "0.75rem" }}>Do you want to proceed?</p>
        </div>

        {/* Remember setting */}
        <label className="checkbox-wrapper" style={{ marginBottom: "1.5rem" }}>
          <input
            type="checkbox"
            className="checkbox-input"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          <span className="checkbox-label">
            Remember this choice — don&apos;t ask me again
          </span>
        </label>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onCancel}>
            No, cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={() => onConfirm(remember)}
          >
            <FileText size={16} /> Yes, proceed
          </button>
        </div>
      </div>
    </div>
  );
}
