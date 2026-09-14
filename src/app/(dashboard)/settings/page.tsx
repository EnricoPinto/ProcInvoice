"use client";

import { useState, useEffect } from "react";
import { Settings, Shield, RotateCcw, CheckCircle2, AlertCircle, Download, Trash2, Database } from "lucide-react";
import { signOut } from "next-auth/react";

interface UserSettings {
  skipMultiPageWarning: boolean;
  retentionYears?: number;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>({ skipMultiPageWarning: false, retentionYears: 7 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) setSettings(d.settings);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async (key: keyof UserSettings, value: boolean | number) => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      if (res.ok) {
        setSettings((prev) => ({ ...prev, [key]: value }));
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError("Failed to save settings.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadData = () => {
    window.location.href = "/api/user/export";
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/user/delete", { method: "DELETE" });
      if (res.ok) {
        signOut({ callbackUrl: "/login" });
      } else {
        setError("Failed to delete account. Please try again.");
        setShowDeleteModal(false);
      }
    } catch {
      setError("Network error during deletion.");
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
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
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your preferences, security settings, and GDPR privacy rights.</p>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: "1.5rem" }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} /> {error}
        </div>
      )}

      {saved && (
        <div className="alert alert-success" style={{ marginBottom: "1.5rem" }}>
          <CheckCircle2 size={16} style={{ flexShrink: 0 }} /> Settings saved successfully.
        </div>
      )}

      {/* Invoice Processing */}
      <div className="glass-card" style={{ padding: "1.75rem", marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.5rem" }}>
          <div
            style={{
              width: 36,
              height: 36,
              background: "var(--primary-light)",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--secondary)",
            }}
          >
            <Settings size={18} />
          </div>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
            Invoice Processing & Data Retention Policy
          </h2>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "1rem",
            background: "rgba(255,255,255,0.03)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
            marginBottom: "1rem",
          }}
        >
          <div>
            <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
              Skip multi-page warning
            </div>
            <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
              Automatically proceed with the first page when uploading multi-page documents,
              without showing the confirmation dialog.
            </div>
          </div>
          <div style={{ marginLeft: "1.5rem", flexShrink: 0 }}>
            <ToggleSwitch
              checked={settings.skipMultiPageWarning}
              onChange={(v) => handleToggle("skipMultiPageWarning", v)}
              disabled={saving}
            />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "1rem",
            background: "rgba(255,255,255,0.03)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
          }}
        >
          <div>
            <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
              Data Retention Policy (Tax & ISO Audit)
            </div>
            <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
              Invoices older than this threshold (years) are automatically flagged for retention review according to EU tax compliance rules.
            </div>
          </div>
          <div style={{ marginLeft: "1.5rem", flexShrink: 0 }}>
            <select
              className="form-input"
              style={{ width: "auto", fontSize: "0.875rem" }}
              value={settings.retentionYears || 7}
              onChange={(e) => handleToggle("retentionYears", Number(e.target.value))}
            >
              <option value={5}>5 Years</option>
              <option value={7}>7 Years (EU/NL Tax Default)</option>
              <option value={10}>10 Years</option>
            </select>
          </div>
        </div>
      </div>

      {/* GDPR Rights Section */}
      <div className="glass-card" style={{ padding: "1.75rem", marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.5rem" }}>
          <div
            style={{
              width: 36,
              height: 36,
              background: "var(--accent-light)",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent)",
            }}
          >
            <Database size={18} />
          </div>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
            GDPR Rights & Data Control
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div
            style={{
              padding: "1.25rem",
              background: "rgba(255,255,255,0.02)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <h3 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: 6, color: "var(--text-primary)" }}>
              Download My Data (Portability)
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
              Export an archive of your account profile, settings, uploaded invoices, and audit log history in JSON format.
            </p>
            <button className="btn btn-secondary btn-sm" onClick={handleDownloadData}>
              <Download size={14} /> Download My Data
            </button>
          </div>

          <div
            style={{
              padding: "1.25rem",
              background: "rgba(239,68,68,0.05)",
              border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <h3 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: 6, color: "var(--error)" }}>
              Delete My Account (Right to Erasure)
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
              Permanently erase your account, company profile, invoice files, and personal data from our servers.
            </p>
            <button
              className="btn btn-sm"
              style={{ background: "var(--error)", color: "white", border: "none" }}
              onClick={() => setShowDeleteModal(true)}
            >
              <Trash2 size={14} /> Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* Security Info */}
      <div className="glass-card" style={{ padding: "1.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.5rem" }}>
          <div
            style={{
              width: 36,
              height: 36,
              background: "var(--success-light)",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--success)",
            }}
          >
            <Shield size={18} />
          </div>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
            Security & Compliance Infrastructure
          </h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {[
            "Field-level AES-256-GCM encryption with keyVersion tag covers VAT, IBAN, address, contact details, and invoice data.",
            "Database and storage hosted strictly in EU region (Frankfurt / eu-central-1) per GDPR requirements.",
            "Full ISO 27001 access traceability: every VIEW, EDIT, and DELETE action is logged with IP and timestamp.",
            "Passwords are hashed with bcrypt (cost factor 12) and never stored in plaintext.",
            "All sessions are managed via secure, httpOnly JWT tokens with strict CORS and security headers.",
          ].map((text, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <CheckCircle2 size={16} style={{ color: "var(--success)", flexShrink: 0, marginTop: 2 }} />
              <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Confirmation Modal for Account Deletion */}
      {showDeleteModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
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
              maxWidth: 460,
              padding: "2rem",
              background: "var(--bg-card)",
            }}
          >
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--error)", marginBottom: "0.5rem" }}>
              Confirm Permanent Account Deletion
            </h2>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
              Are you sure you want to execute your Right to Erasure? This will permanently delete your account, stored invoices, and company profile. <strong>This action cannot be undone.</strong>
            </p>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="btn"
                style={{ flex: 1, background: "var(--error)", color: "white", border: "none" }}
                onClick={handleDeleteAccount}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Yes, Delete Everything"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      style={{
        width: 48,
        height: 28,
        borderRadius: 100,
        background: checked ? "var(--primary)" : "rgba(255,255,255,0.1)",
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        position: "relative",
        transition: "background var(--transition)",
        boxShadow: checked ? "0 0 12px rgba(99,102,241,0.4)" : "none",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: checked ? "calc(100% - 25px)" : 3,
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: "white",
          transition: "left var(--transition)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
        }}
      />
    </button>
  );
}

