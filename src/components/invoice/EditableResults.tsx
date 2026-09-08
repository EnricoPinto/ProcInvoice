"use client";

import { useState } from "react";
import { Edit2, Save, X, CheckCircle2 } from "lucide-react";
import type { ExtractedInvoiceData } from "@/lib/ocr";

interface EditableResultsProps {
  invoiceId: string;
  initialData: ExtractedInvoiceData;
}

type Field = { label: string; key: keyof ExtractedInvoiceData; prefix?: string };

const MAIN_FIELDS: Field[] = [
  { label: "Invoice Number", key: "invoiceNumber" },
  { label: "Invoice Date", key: "invoiceDate" },
  { label: "Due Date", key: "dueDate" },
  { label: "Currency", key: "currency" },
  { label: "Payment Terms", key: "paymentTerms" },
];

const VENDOR_FIELDS: Field[] = [
  { label: "Vendor Name", key: "vendorName" },
  { label: "Vendor Address", key: "vendorAddress" },
  { label: "Vendor VAT", key: "vendorVAT" },
];

const CLIENT_FIELDS: Field[] = [
  { label: "Client Name", key: "clientName" },
  { label: "Client Address", key: "clientAddress" },
];

const AMOUNT_FIELDS: Field[] = [
  { label: "Subtotal", key: "subtotal" },
  { label: "Tax Rate (%)", key: "taxRate" },
  { label: "Tax Amount", key: "taxAmount" },
  { label: "Total Amount", key: "totalAmount" },
];

export function EditableResults({ invoiceId, initialData }: EditableResultsProps) {
  const [data, setData] = useState<ExtractedInvoiceData>(initialData);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ExtractedInvoiceData>(initialData);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extractedData: draft }),
      });
      if (res.ok) {
        setData(draft);
        setEditing(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDraft(data);
    setEditing(false);
  };

  const updateDraft = (key: keyof ExtractedInvoiceData, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const renderField = (f: Field) => {
    const val = (editing ? draft : data)[f.key];
    if (editing) {
      return (
        <div key={f.key} className="form-group">
          <label className="form-label">{f.label}</label>
          <input
            className="form-input"
            value={val !== undefined && val !== null ? String(val) : ""}
            onChange={(e) => updateDraft(f.key, e.target.value)}
          />
        </div>
      );
    }
    return (
      <div key={f.key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
          {f.label}
        </span>
        <span style={{ color: val ? "var(--text-primary)" : "var(--text-muted)", fontWeight: val ? 500 : 400 }}>
          {val !== undefined && val !== null ? String(val) : "—"}
        </span>
      </div>
    );
  };

  const renderSection = (title: string, fields: Field[]) => (
    <div className="glass-card" style={{ padding: "1.5rem", marginBottom: "1rem" }}>
      <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "1.25rem" }}>
        {title}
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.25rem" }}>
        {fields.map((f) => renderField(f))}
      </div>
    </div>
  );

  return (
    <div>
      {/* Header bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--text-primary)" }}>
          Recognized Data
        </h2>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          {saved && (
            <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--success)", fontSize: "0.875rem" }}>
              <CheckCircle2 size={16} /> Saved
            </span>
          )}
          {editing ? (
            <>
              <button className="btn btn-ghost btn-sm" onClick={handleCancel}>
                <X size={16} /> Cancel
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                {saving ? <span className="spinner" /> : <Save size={16} />}
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </>
          ) : (
            <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>
              <Edit2 size={16} /> Edit
            </button>
          )}
        </div>
      </div>

      {renderSection("Invoice Details", MAIN_FIELDS)}
      {renderSection("Vendor", VENDOR_FIELDS)}
      {renderSection("Client", CLIENT_FIELDS)}
      {renderSection("Amounts", AMOUNT_FIELDS)}

      {/* Line Items */}
      {data.lineItems && data.lineItems.length > 0 && (
        <div className="glass-card" style={{ padding: "1.5rem", marginBottom: "1rem" }}>
          <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "1.25rem" }}>
            Line Items
          </h3>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {data.lineItems.map((item, i) => (
                  <tr key={i}>
                    <td style={{ color: "var(--text-primary)" }}>{item.description}</td>
                    <td>{item.quantity}</td>
                    <td>
                      {data.currency} {item.unitPrice.toFixed(2)}
                    </td>
                    <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                      {data.currency} {item.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bank & Notes */}
      {(data.bankDetails || data.notes) && (
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "1.25rem" }}>
            Additional Information
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {data.bankDetails && (
              <div>
                <span style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
                  Bank Details
                </span>
                <p style={{ color: "var(--text-primary)", marginTop: 4 }}>{data.bankDetails}</p>
              </div>
            )}
            {data.notes && (
              <div>
                <span style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
                  Notes
                </span>
                <p style={{ color: "var(--text-secondary)", marginTop: 4 }}>{data.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
