"use client";

import { useState, useEffect } from "react";
import {
  CheckSquare,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  TestTube,
} from "lucide-react";
import { isValidIBAN } from "ibantools";

interface ValidationRule {
  id: string;
  fieldName: string;
  name: string;
  ruleType: string;
  regexPattern: string | null;
  formatHint: string | null;
  enabled: boolean;
  createdAt: string;
}

export default function ValidationRulesPage() {
  const [rules, setRules] = useState<ValidationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fieldName, setFieldName] = useState("vatNumber");
  const [name, setName] = useState("");
  const [ruleType, setRuleType] = useState("REGEX");
  const [regexPattern, setRegexPattern] = useState("");
  const [formatHint, setFormatHint] = useState("");
  const [enabled, setEnabled] = useState(true);

  // Live Test state
  const [testInput, setTestInput] = useState("");
  const [testRuleId, setTestRuleId] = useState("");
  const [testResult, setTestResult] = useState<{
    valid: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/validation-rules");
      const data = await res.json();
      if (data.rules) {
        setRules(data.rules);
        if (data.rules.length > 0 && !testRuleId) {
          setTestRuleId(data.rules[0].id);
        }
      }
    } catch {
      setError("Failed to load validation rules");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setFieldName("vatNumber");
    setName("");
    setRuleType("REGEX");
    setRegexPattern("^NL[0-9]{9}B[0-9]{2}$");
    setFormatHint("NL 123.456.789 B01");
    setEnabled(true);
    setShowModal(true);
  };

  const handleOpenEdit = (rule: ValidationRule) => {
    setEditingId(rule.id);
    setFieldName(rule.fieldName);
    setName(rule.name);
    setRuleType(rule.ruleType);
    setRegexPattern(rule.regexPattern || "");
    setFormatHint(rule.formatHint || "");
    setEnabled(rule.enabled);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        fieldName,
        name,
        ruleType,
        regexPattern: ruleType === "REGEX" ? regexPattern : null,
        formatHint: formatHint || null,
        enabled,
      };

      let res;
      if (editingId) {
        res = await fetch(`/api/admin/validation-rules/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/admin/validation-rules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Save failed");
      }

      setSuccess(editingId ? "Rule updated successfully" : "Rule created successfully");
      setShowModal(false);
      fetchRules();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (rule: ValidationRule) => {
    try {
      const res = await fetch(`/api/admin/validation-rules/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !rule.enabled }),
      });
      if (res.ok) {
        setRules((prev) =>
          prev.map((r) => (r.id === rule.id ? { ...r, enabled: !r.enabled } : r))
        );
      }
    } catch {
      setError("Failed to toggle rule");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this validation rule?")) return;
    try {
      const res = await fetch(`/api/admin/validation-rules/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setRules((prev) => prev.filter((r) => r.id !== id));
        setSuccess("Rule deleted");
      }
    } catch {
      setError("Failed to delete rule");
    }
  };

  const runLiveTest = () => {
    const selected = rules.find((r) => r.id === testRuleId);
    if (!selected) return;

    const raw = testInput.trim();
    if (!raw) {
      setTestResult({ valid: false, message: "Please enter a value to test." });
      return;
    }

    if (selected.ruleType === "IBANTOOLS") {
      const clean = raw.replace(/\s/g, "").toUpperCase();
      const valid = isValidIBAN(clean);
      setTestResult({
        valid,
        message: valid
          ? `Valid IBAN format! (Checksum & length verified via ibantools)`
          : `Invalid IBAN format (failed checksum or bank code structure)`,
      });
      return;
    }

    if (selected.ruleType === "REGEX" && selected.regexPattern) {
      try {
        const regex = new RegExp(selected.regexPattern);
        const clean = raw.replace(/[\s.-]/g, "").toUpperCase();
        const valid = regex.test(clean) || regex.test(raw);
        setTestResult({
          valid,
          message: valid
            ? `Matches pattern ${selected.regexPattern} successfully!`
            : `Does not match pattern ${selected.regexPattern}. Expected format: ${
                selected.formatHint || "pattern match"
              }`,
        });
      } catch (err) {
        setTestResult({ valid: false, message: `Invalid regex: ${(err as Error).message}` });
      }
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h2
            style={{
              fontSize: "1.25rem",
              fontWeight: 800,
              color: "var(--text-primary)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <CheckSquare size={22} style={{ color: "var(--secondary)" }} />
            Dynamic Validation Rules
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: 4 }}>
            Configure database-backed validation rules (NL VAT, IBAN via ibantools, etc.) without code deploys.
          </p>
        </div>

        <button className="btn btn-primary" onClick={handleOpenNew}>
          <Plus size={16} /> Add Validation Rule
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {success && (
        <div className="alert alert-success">
          <CheckCircle2 size={16} /> {success}
        </div>
      )}

      {/* Rules Table */}
      <div className="glass-card" style={{ padding: "1.5rem" }}>
        <div className="table-container" style={{ margin: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Rule Name</th>
                <th>Target Field</th>
                <th>Validation Engine</th>
                <th>Regex / Spec</th>
                <th>Format Hint</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "2rem" }}>
                    <span className="spinner" /> Loading rules...
                  </td>
                </tr>
              ) : rules.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}
                  >
                    No validation rules found.
                  </td>
                </tr>
              ) : (
                rules.map((rule) => (
                  <tr key={rule.id}>
                    <td style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                      {rule.name}
                    </td>
                    <td>
                      <span className="badge badge-pending" style={{ fontFamily: "monospace" }}>
                        {rule.fieldName}
                      </span>
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background:
                            rule.ruleType === "IBANTOOLS"
                              ? "rgba(168,85,247,0.15)"
                              : "rgba(99,102,241,0.15)",
                          color:
                            rule.ruleType === "IBANTOOLS"
                              ? "var(--accent)"
                              : "var(--secondary)",
                          fontWeight: 700,
                        }}
                      >
                        {rule.ruleType}
                      </span>
                    </td>
                    <td>
                      <code
                        style={{
                          fontSize: "0.8125rem",
                          background: "rgba(0,0,0,0.2)",
                          padding: "2px 6px",
                          borderRadius: 4,
                        }}
                      >
                        {rule.regexPattern || (rule.ruleType === "IBANTOOLS" ? "ibantools checksum" : "—")}
                      </code>
                    </td>
                    <td>
                      <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                        {rule.formatHint || "—"}
                      </span>
                    </td>
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
                          title="Edit rule"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleDelete(rule.id)}
                          style={{ color: "var(--error)" }}
                          title="Delete rule"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Validation Tester */}
      <div className="glass-card" style={{ padding: "1.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "0.5rem" }}>
          <TestTube size={20} style={{ color: "var(--accent)" }} />
          <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
            Live Validation Engine Tester
          </h3>
        </div>
        <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
          Test VAT numbers, IBANs, or custom patterns against your active database validation rules in real-time.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: "1rem", alignItems: "end" }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Select Rule</label>
            <select
              className="form-input"
              value={testRuleId}
              onChange={(e) => setTestRuleId(e.target.value)}
            >
              {rules.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.fieldName})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Test Input Value</label>
            <input
              className="form-input"
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="e.g. NL999999999B99 or NL91ABNA0417164300"
            />
          </div>

          <button className="btn btn-secondary" onClick={runLiveTest} style={{ height: 42 }}>
            <Sparkles size={16} /> Test Validation
          </button>
        </div>

        {testResult && (
          <div
            style={{
              marginTop: "1.25rem",
              padding: "1rem 1.25rem",
              borderRadius: 8,
              border: testResult.valid
                ? "1px solid rgba(34, 197, 94, 0.3)"
                : "1px solid rgba(239, 68, 68, 0.3)",
              background: testResult.valid
                ? "rgba(34, 197, 94, 0.08)"
                : "rgba(239, 68, 68, 0.08)",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            {testResult.valid ? (
              <CheckCircle2 size={18} style={{ color: "var(--success)", flexShrink: 0 }} />
            ) : (
              <AlertCircle size={18} style={{ color: "var(--error)", flexShrink: 0 }} />
            )}
            <span
              style={{
                color: testResult.valid ? "var(--success)" : "var(--error)",
                fontWeight: 600,
                fontSize: "0.875rem",
              }}
            >
              {testResult.message}
            </span>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
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
            padding: "1rem",
          }}
        >
          <div
            className="glass-card"
            style={{
              width: "100%",
              maxWidth: 520,
              padding: "2rem",
              background: "var(--bg-card)",
            }}
          >
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1.25rem" }}>
              {editingId ? "Edit Validation Rule" : "Add Validation Rule"}
            </h3>

            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Rule Display Name *</label>
                <input
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. NL VAT Number"
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label className="form-label">Target Field *</label>
                  <select
                    className="form-input"
                    value={fieldName}
                    onChange={(e) => setFieldName(e.target.value)}
                  >
                    <option value="vatNumber">vatNumber (VAT / BTW)</option>
                    <option value="iban">iban (Bank IBAN)</option>
                    <option value="coc">coc (KVK / COC)</option>
                    <option value="invoiceNumber">invoiceNumber</option>
                    <option value="totalAmount">totalAmount</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Validation Engine *</label>
                  <select
                    className="form-input"
                    value={ruleType}
                    onChange={(e) => setRuleType(e.target.value)}
                  >
                    <option value="REGEX">REGEX (Pattern Match)</option>
                    <option value="IBANTOOLS">IBANTOOLS (Algorithmic IBAN)</option>
                  </select>
                </div>
              </div>

              {ruleType === "REGEX" && (
                <div className="form-group">
                  <label className="form-label">Regex Pattern *</label>
                  <input
                    className="form-input"
                    value={regexPattern}
                    onChange={(e) => setRegexPattern(e.target.value)}
                    placeholder="^NL[0-9]{9}B[0-9]{2}$"
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Format Hint (For user guidance)</label>
                <input
                  className="form-input"
                  value={formatHint}
                  onChange={(e) => setFormatHint(e.target.value)}
                  placeholder="e.g. NL 123.456.789 B01"
                />
              </div>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  color: "var(--text-secondary)",
                }}
              >
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                />
                Enable this validation rule
              </label>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "0.75rem",
                  marginTop: "1rem",
                }}
              >
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Saving..." : editingId ? "Update Rule" : "Create Rule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
