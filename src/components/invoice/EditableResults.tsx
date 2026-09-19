"use client";

import { useState } from "react";
import {
  Edit2,
  Save,
  X,
  CheckCircle2,
  FileCode,
  AlertTriangle,
  Plus,
  Trash2,
} from "lucide-react";
import type { ExtractedInvoiceData } from "@/lib/ocr";

interface EditableResultsProps {
  invoiceId: string;
  initialData: ExtractedInvoiceData;
  accountCountry?: string;
}

type FieldKey = keyof Omit<ExtractedInvoiceData, "lineItems" | "classifiedType">;

interface FieldConfig {
  key: FieldKey;
  en: string;
  nl: string;
}

export function EditableResults({
  invoiceId,
  initialData,
  accountCountry = "NL",
}: EditableResultsProps) {
  const isNL = accountCountry?.toUpperCase() === "NL" || accountCountry?.toLowerCase() === "netherlands";

  // Ensure lineItems is an array
  const sanitizedInitial: ExtractedInvoiceData = {
    ...initialData,
    classifiedType: initialData.classifiedType || "Factuur",
    lineItems: Array.isArray(initialData.lineItems) ? initialData.lineItems : [],
  };

  const [data, setData] = useState<ExtractedInvoiceData>(sanitizedInitial);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ExtractedInvoiceData>(sanitizedInitial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Localization dictionaries
  const t = {
    recognizedData: isNL ? "Herkende Gegevens" : "Recognized Data",
    classifiedType: isNL ? "Documenttype" : "Document Type",
    factuur: "Factuur",
    overige: "Overige document",
    edit: isNL ? "Bewerken" : "Edit",
    save: isNL ? "Wijzigingen Opslaan" : "Save Changes",
    saving: isNL ? "Opslaan..." : "Saving...",
    cancel: isNL ? "Annuleren" : "Cancel",
    savedMsg: isNL ? "Opgeslagen" : "Saved",
    downloadXml: isNL ? "Download UBL XML" : "Download UBL 2.1 XML",
    xmlOnlyFactuur: isNL
      ? "UBL XML export is alleen beschikbaar voor documenten geclassificeerd als 'Factuur'"
      : "UBL XML export is only available for documents classified as 'Factuur'",
    secInvoice: isNL ? "Factuurgegevens" : "Invoice Details",
    secVendor: isNL ? "Leverancier" : "Vendor",
    secClient: isNL ? "Klant" : "Client / Customer",
    secAmounts: isNL ? "Bedragen" : "Amounts",
    secLineItems: isNL ? "Factuurregels" : "Line Items",
    secAdditional: isNL ? "Aanvullende Informatie" : "Additional Information",
    addLineItem: isNL ? "Regel toevoegen" : "Add Line Item",
    noLineItems: isNL ? "Geen factuurregels gevonden" : "No line items found",
    description: isNL ? "Omschrijving" : "Description",
    quantity: isNL ? "Aantal" : "Qty",
    unitPrice: isNL ? "Eenheidsprijs" : "Unit Price",
    total: isNL ? "Totaal" : "Total",
  };

  const MAIN_FIELDS: FieldConfig[] = [
    { key: "invoiceNumber", en: "Invoice Number", nl: "Factuurnummer" },
    { key: "invoiceDate", en: "Invoice Date", nl: "Datum" },
    { key: "dueDate", en: "Due Date", nl: "Vervaldatum" },
    { key: "currency", en: "Currency", nl: "Valuta" },
    { key: "paymentTerms", en: "Payment Terms", nl: "Betalingsvoorwaarden" },
  ];

  const VENDOR_FIELDS: FieldConfig[] = [
    { key: "vendorName", en: "Vendor Name", nl: "Leverancier" },
    { key: "vendorAddress", en: "Vendor Address", nl: "Adres leverancier" },
    { key: "vendorVAT", en: "Vendor VAT", nl: "Btw-nummer" },
  ];

  const CLIENT_FIELDS: FieldConfig[] = [
    { key: "clientName", en: "Client Name", nl: "Klant" },
    { key: "clientAddress", en: "Client Address", nl: "Klantadres" },
  ];

  const AMOUNT_FIELDS: FieldConfig[] = [
    { key: "subtotal", en: "Subtotal", nl: "Subtotaal" },
    { key: "taxRate", en: "Tax Rate (%)", nl: "Btw-tarief (%)" },
    { key: "taxAmount", en: "Tax Amount", nl: "Btw-bedrag" },
    { key: "totalAmount", en: "Total Amount", nl: "Totaalbedrag" },
  ];

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

  const updateDraftField = (key: FieldKey, value: string) => {
    setDraft((prev) => {
      let parsedVal: string | number = value;
      if (key === "subtotal" || key === "taxRate" || key === "taxAmount" || key === "totalAmount") {
        const num = parseFloat(value);
        parsedVal = isNaN(num) ? 0 : num;
      }
      return { ...prev, [key]: parsedVal };
    });
  };

  const updateLineItem = (index: number, field: string, val: string | number) => {
    setDraft((prev) => {
      const items = [...(prev.lineItems || [])];
      const target = { ...items[index] };
      if (field === "description") target.description = String(val);
      if (field === "quantity") {
        target.quantity = Number(val) || 0;
        if (target.unitPrice !== undefined) target.total = Number((target.quantity * target.unitPrice).toFixed(2));
      }
      if (field === "unitPrice") {
        target.unitPrice = Number(val) || 0;
        target.total = Number(((target.quantity || 1) * target.unitPrice).toFixed(2));
      }
      if (field === "total") target.total = Number(val) || 0;
      if (field === "netAmount") target.netAmount = val === "" ? undefined : Number(val);
      if (field === "grossAmount") target.grossAmount = val === "" ? undefined : Number(val);
      if (field === "vatRate") target.vatRate = val === "" ? undefined : Number(val);
      items[index] = target;
      return { ...prev, lineItems: items };
    });
  };

  const addLineItem = () => {
    setDraft((prev) => ({
      ...prev,
      lineItems: [
        ...(prev.lineItems || []),
        { description: "New Item", quantity: 1, unitPrice: 0, total: 0, vatRate: prev.taxRate ?? 21 },
      ],
    }));
  };

  const removeLineItem = (index: number) => {
    setDraft((prev) => ({
      ...prev,
      lineItems: (prev.lineItems || []).filter((_, i) => i !== index),
    }));
  };

  const currentClassified = (editing ? draft : data).classifiedType || "Factuur";
  const isFactuur = currentClassified === "Factuur";

  const renderField = (f: FieldConfig) => {
    const label = isNL ? f.nl : f.en;
    const current = (editing ? draft : data)[f.key];

    if (editing) {
      return (
        <div key={f.key} className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontSize: "0.8125rem" }}>
            {label}
          </label>
          <input
            className="form-input"
            style={{ fontSize: "0.875rem", padding: "8px 12px" }}
            value={current !== undefined && current !== null ? String(current) : ""}
            onChange={(e) => updateDraftField(f.key, e.target.value)}
          />
        </div>
      );
    }

    return (
      <div key={f.key} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <span
          style={{
            fontSize: "0.75rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--text-muted)",
          }}
        >
          {label}
        </span>
        <span
          style={{
            color: current ? "var(--text-primary)" : "var(--text-muted)",
            fontWeight: current ? 500 : 400,
            fontSize: "0.9375rem",
            wordBreak: "break-word",
          }}
        >
          {current !== undefined && current !== null ? String(current) : "—"}
        </span>
      </div>
    );
  };

  const Section = ({ title, fields }: { title: string; fields: FieldConfig[] }) => (
    <div className="glass-card" style={{ padding: "1.25rem", marginBottom: "1rem" }}>
      <h3
        style={{
          fontSize: "0.8125rem",
          fontWeight: 700,
          color: "var(--text-secondary)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: "1rem",
        }}
      >
        {title}
      </h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: "1rem",
        }}
      >
        {fields.map((f) => renderField(f))}
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {/* Action Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.75rem",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        <div>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 800, color: "var(--text-primary)" }}>
            {t.recognizedData}
          </h2>
          <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
            {isNL ? "Nederlandse weergave actief" : "Standard EU invoice view"}
          </span>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          {saved && (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: "var(--success)",
                fontSize: "0.875rem",
                fontWeight: 600,
              }}
            >
              <CheckCircle2 size={16} /> {t.savedMsg}
            </span>
          )}

          {/* UBL 2.1 XML Export Button */}
          {isFactuur ? (
            <a
              href={`/api/invoices/${invoiceId}/export/ubl`}
              download
              className="btn btn-secondary btn-sm"
              title="Export standard UBL 2.1 XML"
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <FileCode size={15} style={{ color: "var(--secondary)" }} />
              {t.downloadXml}
            </a>
          ) : (
            <span
              className="badge"
              style={{
                background: "rgba(245, 158, 11, 0.12)",
                color: "var(--warning)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                fontSize: "0.75rem",
                padding: "6px 10px",
              }}
              title={t.xmlOnlyFactuur}
            >
              <AlertTriangle size={13} style={{ marginRight: 4 }} /> No XML for Overige doc
            </span>
          )}

          {editing ? (
            <>
              <button className="btn btn-ghost btn-sm" onClick={handleCancel} disabled={saving}>
                <X size={15} /> {t.cancel}
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                {saving ? <span className="spinner" /> : <Save size={15} />}
                {saving ? t.saving : t.save}
              </button>
            </>
          ) : (
            <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>
              <Edit2 size={15} /> {t.edit}
            </button>
          )}
        </div>
      </div>

      {/* 1. CLASSIFIED TYPE - FIRST FIELD (Requirement 4) */}
      <div
        className="glass-card"
        style={{
          padding: "1.25rem",
          marginBottom: "1rem",
          border: isFactuur
            ? "1px solid rgba(34, 197, 94, 0.3)"
            : "1px solid rgba(245, 158, 11, 0.4)",
          background: isFactuur
            ? "linear-gradient(135deg, rgba(34, 197, 94, 0.04), rgba(99, 102, 241, 0.04))"
            : "linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(239, 68, 68, 0.04))",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--text-muted)",
              }}
            >
              {t.classifiedType} (1st Field)
            </span>
            <div style={{ marginTop: 6 }}>
              {editing ? (
                <select
                  className="form-input"
                  style={{ width: "auto", minWidth: 200, fontWeight: 700 }}
                  value={draft.classifiedType || "Factuur"}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, classifiedType: e.target.value }))
                  }
                >
                  <option value="Factuur">Factuur (Invoice)</option>
                  <option value="Overige document">Overige document (Non-invoice)</option>
                </select>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    className={`badge ${isFactuur ? "badge-processed" : "badge-pending"}`}
                    style={{ fontSize: "0.9375rem", padding: "6px 14px", fontWeight: 700 }}
                  >
                    {isFactuur ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                    {currentClassified}
                  </span>
                  <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                    {isFactuur
                      ? isNL
                        ? "Dit document is geclassificeerd als een officiële factuur."
                        : "Verified as an invoice. Eligible for UBL 2.1 XML export."
                      : isNL
                      ? "Geclassificeerd als overig document (geen factuur)."
                      : "Classified as non-invoice document. UBL export disabled."}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sections */}
      <Section title={t.secInvoice} fields={MAIN_FIELDS} />
      <Section title={t.secVendor} fields={VENDOR_FIELDS} />
      <Section title={t.secClient} fields={CLIENT_FIELDS} />

      {/* Amounts & Multi-VAT Breakdown Section */}
      {(() => {
        const activeData = editing ? draft : data;
        const currentItems = activeData.lineItems || [];
        const curr = activeData.currency || "EUR";

        // Group line items by VAT rate
        const vatMap = new Map<number, { rate: number; baseAmount: number; taxAmount: number }>();
        for (const it of currentItems) {
          const rate = it.vatRate !== undefined && it.vatRate !== null ? Number(it.vatRate) : undefined;
          if (rate !== undefined) {
            const qty = it.quantity || 1;
            const price = it.unitPrice || 0;
            const base = it.netAmount !== undefined && it.netAmount !== null
              ? Number(it.netAmount)
              : (it.total !== undefined && it.total !== null ? Number(it.total) : qty * price);
            const tax = base * (rate / 100);

            const existing = vatMap.get(rate);
            if (existing) {
              existing.baseAmount += base;
              existing.taxAmount += tax;
            } else {
              vatMap.set(rate, { rate, baseAmount: base, taxAmount: tax });
            }
          }
        }

        const vatBreakdown = Array.from(vatMap.values()).sort((a, b) => b.rate - a.rate);
        const hasMultiVat = vatBreakdown.length > 1;

        const handleAutoCalculateAmounts = () => {
          let calculatedSubtotal = 0;
          let calculatedTax = 0;
          for (const it of currentItems) {
            const qty = it.quantity || 1;
            const price = it.unitPrice || 0;
            const base = it.netAmount !== undefined && it.netAmount !== null
              ? Number(it.netAmount)
              : (it.total !== undefined && it.total !== null ? Number(it.total) : qty * price);
            const rate = it.vatRate !== undefined && it.vatRate !== null ? Number(it.vatRate) : (draft.taxRate ?? 21);
            calculatedSubtotal += base;
            calculatedTax += base * (rate / 100);
          }
          const roundedSubtotal = Number(calculatedSubtotal.toFixed(2));
          const roundedTax = Number(calculatedTax.toFixed(2));
          const roundedTotal = Number((roundedSubtotal + roundedTax).toFixed(2));

          setDraft((prev) => ({
            ...prev,
            subtotal: roundedSubtotal,
            taxAmount: roundedTax,
            totalAmount: roundedTotal,
            taxRate: hasMultiVat ? undefined : (vatBreakdown[0]?.rate ?? prev.taxRate ?? 21),
          }));
        };

        return (
          <div className="glass-card" style={{ padding: "1.25rem", marginBottom: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3
                style={{
                  fontSize: "0.8125rem",
                  fontWeight: 700,
                  color: "var(--text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  margin: 0,
                }}
              >
                {t.secAmounts}
              </h3>
              {editing && currentItems.length > 0 && (
                <button
                  type="button"
                  onClick={handleAutoCalculateAmounts}
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: "0.75rem", padding: "3px 8px" }}
                  title="Auto-calculate subtotal, tax amount, and total from line items"
                >
                  ⚡ {isNL ? "Herbereken uit regels" : "Auto-calculate from items"}
                </button>
              )}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                gap: "1rem",
              }}
            >
              {AMOUNT_FIELDS.map((f) => {
                if (f.key === "taxRate" && hasMultiVat && !editing) {
                  return (
                    <div key={f.key} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          color: "var(--text-muted)",
                        }}
                      >
                        {isNL ? "Btw-tarief" : "Tax Rate"}
                      </span>
                      <span
                        style={{
                          color: "var(--secondary)",
                          fontWeight: 600,
                          fontSize: "0.875rem",
                        }}
                      >
                        {isNL ? "Meervoudig (zie specificatie)" : "Multiple (see breakdown)"}
                      </span>
                    </div>
                  );
                }
                return renderField(f);
              })}
            </div>

            {/* Per-rate VAT Breakdown Table/Cards */}
            {vatBreakdown.length > 0 && (
              <div
                style={{
                  marginTop: "1.25rem",
                  paddingTop: "1rem",
                  borderTop: "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.75rem",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {isNL ? "Btw-specificatie (per tarief)" : "VAT Breakdown (per rate)"}
                  </span>
                  {hasMultiVat && (
                    <span
                      className="badge"
                      style={{
                        background: "rgba(99, 102, 241, 0.12)",
                        color: "#818cf8",
                        fontSize: "0.75rem",
                        padding: "2px 8px",
                        fontWeight: 600,
                      }}
                    >
                      {isNL ? `${vatBreakdown.length} btw-tarieven actief` : `${vatBreakdown.length} VAT rates active`}
                    </span>
                  )}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                    gap: "0.75rem",
                  }}
                >
                  {vatBreakdown.map((vb) => (
                    <div
                      key={vb.rate}
                      style={{
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-sm)",
                        padding: "0.75rem 1rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "0.875rem",
                          fontWeight: 700,
                          color: "var(--text-primary)",
                        }}
                      >
                        <span>{vb.rate}% {isNL ? "Btw" : "VAT"}</span>
                        <span>{curr} {vb.taxAmount.toFixed(2)}</span>
                      </div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                          marginTop: 4,
                        }}
                      >
                        {isNL ? "over" : "on"} {curr} {vb.baseAmount.toFixed(2)} {isNL ? "netto / belastbaar" : "taxable base"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Line Items Table (Mandatory for all invoices) */}
      <div className="glass-card" style={{ padding: "1.25rem", marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3
            style={{
              fontSize: "0.8125rem",
              fontWeight: 700,
              color: "var(--text-secondary)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              margin: 0,
            }}
          >
            {t.secLineItems} ({((editing ? draft : data).lineItems || []).length})
          </h3>
          {editing && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={addLineItem}
              style={{ padding: "4px 10px", fontSize: "0.8125rem" }}
            >
              <Plus size={14} /> {t.addLineItem}
            </button>
          )}
        </div>

        {((editing ? draft : data).lineItems || []).length === 0 ? (
          <div
            style={{
              padding: "1.5rem",
              textAlign: "center",
              color: "var(--text-muted)",
              fontSize: "0.875rem",
              border: "1px dashed var(--border)",
              borderRadius: 8,
            }}
          >
            {t.noLineItems}
          </div>
        ) : (
          <div className="table-container" style={{ margin: 0, overflowX: "auto" }}>
            <table className="invoice-items-table" style={{ fontSize: "0.8125rem", width: "100%" }}>
              <thead>
                {(() => {
                  const items = (editing ? draft : data).lineItems || [];
                  const showNetCol = items.some((it) => it.netAmount != null);
                  const showGrossCol = items.some((it) => it.grossAmount != null);
                  const showVatCol = editing || items.some((it) => it.vatRate != null);

                  return (
                    <>
                      <tr>
                        <th style={{ minWidth: 120 }}>{t.description}</th>
                        <th style={{ width: 55, textAlign: "center" }}>{t.quantity}</th>
                        <th style={{ width: 85, textAlign: "right" }}>{t.unitPrice}</th>
                        {showNetCol && <th style={{ width: 85, textAlign: "right" }}>Netto</th>}
                        {showVatCol && <th style={{ width: 55, textAlign: "center" }}>BTW%</th>}
                        {showGrossCol && <th style={{ width: 85, textAlign: "right" }}>Bruto</th>}
                        <th style={{ width: 90, textAlign: "right" }}>{t.total}</th>
                        {editing && <th style={{ width: 36, textAlign: "center" }}></th>}
                      </tr>
                    </>
                  );
                })()}
              </thead>
              <tbody>
                {(() => {
                  const items = (editing ? draft : data).lineItems || [];
                  const showNetCol = items.some((it) => it.netAmount != null);
                  const showGrossCol = items.some((it) => it.grossAmount != null);
                  const showVatCol = editing || items.some((it) => it.vatRate != null);

                  return items.map((item, i) => (
                    <tr key={i}>
                      <td>
                        {editing ? (
                          <input
                            className="form-input"
                            style={{ padding: "4px 6px", fontSize: "0.8125rem", width: "100%", boxSizing: "border-box" } as React.CSSProperties}
                            value={item.description || ""}
                            onChange={(e) => updateLineItem(i, "description", e.target.value)}
                          />
                        ) : (
                          <span style={{ color: "var(--text-primary)", fontWeight: 500, wordBreak: "break-word" }}>
                            {item.description}
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: "center", width: 55 }}>
                        {editing ? (
                          <input
                            className="form-input"
                            type="number"
                            style={{ padding: "4px 4px", fontSize: "0.8125rem", width: "100%", maxWidth: 50, textAlign: "center" }}
                            value={item.quantity ?? ""}
                            onChange={(e) => updateLineItem(i, "quantity", e.target.value)}
                          />
                        ) : (
                          <span>{item.quantity ?? "—"}</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right", width: 85 }}>
                        {editing ? (
                          <input
                            className="form-input"
                            type="number"
                            step="0.01"
                            style={{ padding: "4px 4px", fontSize: "0.8125rem", width: "100%", maxWidth: 80, textAlign: "right" }}
                            value={item.unitPrice ?? ""}
                            onChange={(e) => updateLineItem(i, "unitPrice", e.target.value)}
                          />
                        ) : (
                          <span style={{ whiteSpace: "nowrap" }}>
                            {item.unitPrice != null
                              ? `${data.currency || "EUR"} ${Number(item.unitPrice).toFixed(2)}`
                              : "—"}
                          </span>
                        )}
                      </td>
                      {showNetCol && (
                        <td style={{ textAlign: "right", width: 85 }}>
                          {editing ? (
                            <input
                              className="form-input"
                              type="number"
                              step="0.01"
                              style={{ padding: "4px 4px", fontSize: "0.8125rem", width: "100%", maxWidth: 80, textAlign: "right" }}
                              value={item.netAmount ?? ""}
                              onChange={(e) => updateLineItem(i, "netAmount", e.target.value)}
                            />
                          ) : (
                            <span style={{ whiteSpace: "nowrap" }}>
                              {item.netAmount != null
                                ? `${data.currency || "EUR"} ${Number(item.netAmount).toFixed(2)}`
                                : "—"}
                            </span>
                          )}
                        </td>
                      )}
                      {showVatCol && (
                        <td style={{ textAlign: "center", width: 55 }}>
                          {editing ? (
                            <input
                              className="form-input"
                              type="number"
                              step="0.1"
                              style={{ padding: "4px 4px", fontSize: "0.8125rem", width: "100%", maxWidth: 50, textAlign: "center" }}
                              value={item.vatRate ?? ""}
                              onChange={(e) => updateLineItem(i, "vatRate", e.target.value)}
                            />
                          ) : (
                            <span>{item.vatRate != null ? `${item.vatRate}%` : "—"}</span>
                          )}
                        </td>
                      )}
                      {showGrossCol && (
                        <td style={{ textAlign: "right", width: 85 }}>
                          {editing ? (
                            <input
                              className="form-input"
                              type="number"
                              step="0.01"
                              style={{ padding: "4px 4px", fontSize: "0.8125rem", width: "100%", maxWidth: 80, textAlign: "right" }}
                              value={item.grossAmount ?? ""}
                              onChange={(e) => updateLineItem(i, "grossAmount", e.target.value)}
                            />
                          ) : (
                            <span style={{ whiteSpace: "nowrap" }}>
                              {item.grossAmount != null
                                ? `${data.currency || "EUR"} ${Number(item.grossAmount).toFixed(2)}`
                                : "—"}
                            </span>
                          )}
                        </td>
                      )}
                      <td style={{ textAlign: "right", width: 90 }}>
                        {editing ? (
                          <input
                            className="form-input"
                            type="number"
                            step="0.01"
                            style={{ padding: "4px 4px", fontSize: "0.8125rem", width: "100%", maxWidth: 85, textAlign: "right" }}
                            value={item.total ?? ""}
                            onChange={(e) => updateLineItem(i, "total", e.target.value)}
                          />
                        ) : (
                          <span style={{ fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap" }}>
                            {item.total != null
                              ? `${data.currency || "EUR"} ${Number(item.total).toFixed(2)}`
                              : "—"}
                          </span>
                        )}
                      </td>
                      {editing && (
                        <td style={{ textAlign: "center", width: 36 }}>
                          <button
                            type="button"
                            onClick={() => removeLineItem(i)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "var(--error)",
                              cursor: "pointer",
                              padding: 2,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bank & Notes */}
      {(data.bankDetails || data.notes || editing) && (
        <div className="glass-card" style={{ padding: "1.25rem" }}>
          <h3
            style={{
              fontSize: "0.8125rem",
              fontWeight: 700,
              color: "var(--text-secondary)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: "1rem",
            }}
          >
            {t.secAdditional}
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--text-muted)",
                }}
              >
                {isNL ? "Bankgegevens" : "Bank Details"}
              </span>
              {editing ? (
                <input
                  className="form-input"
                  style={{ marginTop: 4 }}
                  value={draft.bankDetails || ""}
                  onChange={(e) => updateDraftField("bankDetails", e.target.value)}
                  placeholder="IBAN / BIC / Bank Account"
                />
              ) : (
                <p style={{ color: "var(--text-primary)", marginTop: 4, fontSize: "0.9375rem" }}>
                  {data.bankDetails || "—"}
                </p>
              )}
            </div>

            <div>
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--text-muted)",
                }}
              >
                {isNL ? "Opmerkingen" : "Notes"}
              </span>
              {editing ? (
                <textarea
                  className="form-input"
                  style={{ marginTop: 4, minHeight: 60 }}
                  value={draft.notes || ""}
                  onChange={(e) => updateDraftField("notes", e.target.value)}
                  placeholder="Add notes..."
                />
              ) : (
                <p style={{ color: "var(--text-secondary)", marginTop: 4, fontSize: "0.875rem" }}>
                  {data.notes || "—"}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
