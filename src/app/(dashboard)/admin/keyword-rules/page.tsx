"use client";

import { useState, useEffect } from "react";
import { Sliders, Plus, Edit2, Trash2, CheckCircle2, AlertCircle, Sparkles, TestTube } from "lucide-react";

interface KeywordRule {
  id: string;
  fieldName: string;
  ruleType?: string;
  keywords: string;
  matchType: string;
  regexPattern: string | null;
  enabled: boolean;
  priority: number;
}

export default function KeywordRulesPage() {
  const [rules, setRules] = useState<KeywordRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "documentField" | "lineItemColumn">("all");

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [ruleType, setRuleType] = useState("documentField");
  const [fieldName, setFieldName] = useState("invoiceNumber");
  const [keywordsInput, setKeywordsInput] = useState("");
  const [matchType, setMatchType] = useState("FUZZY");
  const [regexPattern, setRegexPattern] = useState("");
  const [priority, setPriority] = useState(5);
  const [enabled, setEnabled] = useState(true);

  // Test Extractor state
  const [testText, setTestText] = useState("");
  const [testResult, setTestResult] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/keyword-rules");
      const data = await res.json();
      if (data.rules) setRules(data.rules);
    } catch {
      setError("Failed to load keyword rules");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setRuleType("documentField");
    setFieldName("invoiceNumber");
    setKeywordsInput("");
    setMatchType("FUZZY");
    setRegexPattern("");
    setPriority(5);
    setEnabled(true);
    setShowModal(true);
  };

  const handleOpenEdit = (rule: KeywordRule) => {
    setEditingId(rule.id);
    setRuleType(rule.ruleType || "documentField");
    setFieldName(rule.fieldName);
    let parsedKw = rule.keywords;
    try {
      const arr = JSON.parse(rule.keywords);
      if (Array.isArray(arr)) parsedKw = arr.join(", ");
    } catch {
      // ignore
    }
    setKeywordsInput(parsedKw);
    setMatchType(rule.matchType);
    setRegexPattern(rule.regexPattern || "");
    setPriority(rule.priority);
    setEnabled(rule.enabled);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const kwArray = keywordsInput
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    const payload = {
      fieldName,
      ruleType,
      keywords: kwArray,
      matchType,
      regexPattern: regexPattern || null,
      priority: Number(priority),
      enabled,
    };

    try {
      const url = editingId ? `/api/admin/keyword-rules/${editingId}` : "/api/admin/keyword-rules";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSuccess(editingId ? "Rule updated successfully" : "Rule created successfully");
        setShowModal(false);
        fetchRules();
        setTimeout(() => setSuccess(""), 3000);
      } else {
        const d = await res.json();
        setError(d.error || "Failed to save rule");
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this rule?")) return;
    try {
      const res = await fetch(`/api/admin/keyword-rules/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSuccess("Rule deleted");
        fetchRules();
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch {
      setError("Failed to delete rule");
    }
  };

  const handleToggle = async (rule: KeywordRule) => {
    try {
      await fetch(`/api/admin/keyword-rules/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !rule.enabled }),
      });
      fetchRules();
    } catch {
      setError("Failed to update status");
    }
  };

  const runTestExtraction = () => {
    if (!testText.trim()) return;
    const lines = testText.split("\n");
    const extracted: Record<string, string> = {};

    for (const rule of rules) {
      if (!rule.enabled) continue;
      let kws: string[] = [];
      try {
        kws = JSON.parse(rule.keywords);
      } catch {
        kws = rule.keywords.split(",");
      }

      for (const kw of kws) {
        const lowerKw = kw.trim().toLowerCase();
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.toLowerCase().includes(lowerKw)) {
            const idx = line.toLowerCase().indexOf(lowerKw);
            const val = line.substring(idx + kw.length).replace(/^[:\s-]+/, "").trim();
            if (val && !extracted[rule.fieldName]) {
              extracted[rule.fieldName] = val;
            }
          }
        }
      }
    }
    setTestResult(extracted);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
        <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
      </div>
    );
  }

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
        <div>
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Sliders size={26} style={{ color: "var(--secondary)" }} />
            Keyword Matching Rules
          </h1>
          <p className="page-subtitle">
            Configure Dutch & English invoice label mappings for automated field extraction.
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenNew}>
          <Plus size={16} /> Add Keyword Rule
        </button>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: "1.5rem" }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success" style={{ marginBottom: "1.5rem" }}>
          <CheckCircle2 size={16} /> {success}
        </div>
      )}

      {/* Category Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <button
          className={`btn ${activeTab === "all" ? "btn-primary" : "btn-ghost"} btn-sm`}
          onClick={() => setActiveTab("all")}
        >
          All Rules ({rules.length})
        </button>
        <button
          className={`btn ${activeTab === "documentField" ? "btn-primary" : "btn-ghost"} btn-sm`}
          onClick={() => setActiveTab("documentField")}
        >
          Document Fields ({rules.filter((r) => r.ruleType !== "lineItemColumn").length})
        </button>
        <button
          className={`btn ${activeTab === "lineItemColumn" ? "btn-primary" : "btn-ghost"} btn-sm`}
          onClick={() => setActiveTab("lineItemColumn")}
        >
          Line-Item Columns ({rules.filter((r) => r.ruleType === "lineItemColumn").length})
        </button>
      </div>

      {/* Rules Table */}
      <div className="glass-card" style={{ marginBottom: "2rem", overflow: "hidden" }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Target Field</th>
                <th>Category</th>
                <th>Keywords (NL / EN Label Variants)</th>
                <th>Type</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules
                .filter((r) => {
                  if (activeTab === "all") return true;
                  if (activeTab === "lineItemColumn") return r.ruleType === "lineItemColumn";
                  return r.ruleType !== "lineItemColumn";
                })
                .map((rule) => {
                let kwList: string[] = [];
                try {
                  kwList = JSON.parse(rule.keywords);
                } catch {
                  kwList = rule.keywords.split(",");
                }
                const isColumnRule = rule.ruleType === "lineItemColumn";
                return (
                  <tr key={rule.id}>
                    <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                      <span className="badge badge-pending" style={{ fontFamily: "monospace" }}>
                        {rule.fieldName}
                      </span>
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: isColumnRule ? "rgba(59,130,246,0.15)" : "rgba(168,85,247,0.15)",
                          color: isColumnRule ? "#60a5fa" : "#c084fc",
                          fontSize: "0.75rem",
                        }}
                      >
                        {isColumnRule ? "Line Column" : "Document Field"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {kwList.map((kw, i) => (
                          <span
                            key={i}
                            style={{
                              background: "rgba(255,255,255,0.06)",
                              padding: "2px 8px",
                              borderRadius: 4,
                              fontSize: "0.8rem",
                              color: "var(--text-primary)",
                            }}
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        {rule.matchType}
                      </span>
                    </td>
                    <td>{rule.priority}</td>
                    <td>
                      <button
                        className={`badge ${rule.enabled ? "badge-processed" : "badge-failed"}`}
                        onClick={() => handleToggle(rule)}
                        style={{ cursor: "pointer", border: "none" }}
                      >
                        {rule.enabled ? "Enabled" : "Disabled"}
                      </button>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleOpenEdit(rule)}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleDelete(rule.id)}
                          style={{ color: "var(--error)" }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Rule Tester */}
      <div className="glass-card" style={{ padding: "1.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1rem" }}>
          <TestTube size={20} style={{ color: "var(--accent)" }} />
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
            Live Keyword Extraction Tester
          </h2>
        </div>
        <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
          Paste raw invoice text below to test how your configured keyword rules extract field values.
        </p>

        <textarea
          rows={5}
          value={testText}
          onChange={(e) => setTestText(e.target.value)}
          placeholder="Factuurnummer: INV-2024-9988&#10;Factuurdatum: 15-08-2024&#10;BTW-nummer: NL854568731B01&#10;Totaal: € 1.250,00"
          className="form-input"
          style={{ fontFamily: "monospace", fontSize: "0.875rem", marginBottom: "1rem" }}
        />

        <button className="btn btn-secondary" onClick={runTestExtraction}>
          <Sparkles size={16} /> Run Test Extraction
        </button>

        {testResult && (
          <div
            style={{
              marginTop: "1.5rem",
              padding: "1rem",
              background: "rgba(0,0,0,0.2)",
              borderRadius: 8,
            }}
          >
            <h3 style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
              Extracted Output:
            </h3>
            <pre style={{ fontSize: "0.85rem", color: "var(--success)" }}>
              {JSON.stringify(testResult, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Edit / Create Modal */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            className="glass-card"
            style={{
              width: "100%",
              maxWidth: 540,
              padding: "2rem",
              background: "var(--bg-card)",
            }}
          >
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1.5rem" }}>
              {editingId ? "Edit Keyword Rule" : "Add Keyword Rule"}
            </h2>

            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label className="form-label">Rule Scope / Category</label>
                <select
                  className="form-input"
                  value={ruleType}
                  onChange={(e) => {
                    const next = e.target.value;
                    setRuleType(next);
                    if (next === "lineItemColumn") {
                      setFieldName("description");
                    } else {
                      setFieldName("invoiceNumber");
                    }
                  }}
                >
                  <option value="documentField">Document Field Rule (e.g. Invoice #, Vendor, Total)</option>
                  <option value="lineItemColumn">Line-Item Column Rule (e.g. Description, Netto, Bruto, BTW)</option>
                </select>
              </div>

              <div>
                <label className="form-label">Target Field Name</label>
                {ruleType === "lineItemColumn" ? (
                  <select
                    className="form-input"
                    value={fieldName}
                    onChange={(e) => setFieldName(e.target.value)}
                  >
                    <option value="description">description (Item description / Product name column)</option>
                    <option value="quantity">quantity (Quantity / Aantal column)</option>
                    <option value="amount">amount (General Amount / Bedrag column)</option>
                    <option value="netAmount">netAmount (Net Amount / Netto column - Excl. VAT)</option>
                    <option value="grossAmount">grossAmount (Gross Amount / Bruto column - Incl. VAT)</option>
                    <option value="vatRate">vatRate (VAT percent / BTW% column)</option>
                  </select>
                ) : (
                  <select
                    className="form-input"
                    value={fieldName}
                    onChange={(e) => setFieldName(e.target.value)}
                  >
                    <option value="classifiedType">classifiedType (Document Classification)</option>
                    <option value="invoiceNumber">invoiceNumber</option>
                    <option value="invoiceDate">invoiceDate</option>
                    <option value="dueDate">dueDate</option>
                    <option value="vendorName">vendorName</option>
                    <option value="vendorAddress">vendorAddress</option>
                    <option value="vendorVAT">vendorVAT</option>
                    <option value="clientName">clientName</option>
                    <option value="clientAddress">clientAddress</option>
                    <option value="paymentTerms">paymentTerms</option>
                    <option value="iban">iban</option>
                    <option value="subtotal">subtotal</option>
                    <option value="taxAmount">taxAmount</option>
                    <option value="totalAmount">totalAmount</option>
                    <option value="notes">notes</option>
                  </select>
                )}
              </div>

              <div>
                <label className="form-label">Keywords (Comma separated label variants)</label>
                <input
                  type="text"
                  className="form-input"
                  value={keywordsInput}
                  onChange={(e) => setKeywordsInput(e.target.value)}
                  placeholder="Factuurnummer, Invoice No, Invoice Number"
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label className="form-label">Match Type</label>
                  <select
                    className="form-input"
                    value={matchType}
                    onChange={(e) => setMatchType(e.target.value)}
                  >
                    <option value="FUZZY">FUZZY (Contains)</option>
                    <option value="EXACT">EXACT</option>
                    <option value="REGEX">REGEX</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Priority</label>
                  <input
                    type="number"
                    className="form-input"
                    value={priority}
                    onChange={(e) => setPriority(Number(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Optional Custom Regex Pattern</label>
                <input
                  type="text"
                  className="form-input"
                  value={regexPattern}
                  onChange={(e) => setRegexPattern(e.target.value)}
                  placeholder="(NL\d{9}B\d{2})"
                />
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: "1rem" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Rule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
