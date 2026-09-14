"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Building2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Search,
  FileText,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Account {
  id: string;
  email: string;
  role: string;
  accountType: string;
  country: string;
  createdAt: string;
  companyName: string | null;
  contactName: string;
  businessType: string | null;
  coc: string | null;
  invoiceCount: number;
}

export default function AdminAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filterQuery, setFilterQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "COMPANY" | "USER">("ALL");

  // Deletion Modal state
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null);
  const [confirmInput, setConfirmInput] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/accounts");
      const data = await res.json();
      if (data.accounts) setAccounts(data.accounts);
    } catch {
      setError("Failed to load accounts");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDelete = (account: Account) => {
    setDeletingAccount(account);
    setConfirmInput("");
    setError("");
  };

  const handleConfirmDelete = async () => {
    if (!deletingAccount) return;
    if (confirmInput !== "DELETE") {
      setError("Please type DELETE to confirm account destruction.");
      return;
    }

    setDeleting(true);
    setError("");

    try {
      const res = await fetch("/api/admin/accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: deletingAccount.id }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to delete account");
      }

      setSuccess(`Account (${deletingAccount.email}) permanently deleted.`);
      setDeletingAccount(null);
      fetchAccounts();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const filtered = accounts.filter((acc) => {
    if (activeTab === "COMPANY" && acc.accountType !== "COMPANY") return false;
    if (activeTab === "USER" && acc.accountType === "COMPANY") return false;

    if (!filterQuery) return true;
    const q = filterQuery.toLowerCase();
    return (
      acc.email.toLowerCase().includes(q) ||
      (acc.companyName && acc.companyName.toLowerCase().includes(q)) ||
      (acc.contactName && acc.contactName.toLowerCase().includes(q)) ||
      acc.country.toLowerCase().includes(q)
    );
  });

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
            <Users size={22} style={{ color: "var(--secondary)" }} />
            Accounts Management
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: 4 }}>
            Manage registered companies and users. Destructive deletions require explicit confirmation.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <input
              className="form-input"
              style={{ paddingLeft: "2.25rem", width: 240, fontSize: "0.875rem" }}
              placeholder="Search accounts..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
            />
            <Search
              size={15}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
              }}
            />
          </div>
        </div>
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

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          className={`btn btn-sm ${activeTab === "ALL" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setActiveTab("ALL")}
        >
          All Accounts ({accounts.length})
        </button>
        <button
          className={`btn btn-sm ${activeTab === "COMPANY" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setActiveTab("COMPANY")}
        >
          <Building2 size={14} /> Companies ({accounts.filter((a) => a.accountType === "COMPANY").length})
        </button>
        <button
          className={`btn btn-sm ${activeTab === "USER" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setActiveTab("USER")}
        >
          Users ({accounts.filter((a) => a.accountType !== "COMPANY").length})
        </button>
      </div>

      {/* Accounts Table */}
      <div className="glass-card" style={{ padding: "1.5rem" }}>
        <div className="table-container" style={{ margin: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Account / Company</th>
                <th>Contact Name</th>
                <th>Email</th>
                <th>Type</th>
                <th>Country</th>
                <th>Invoices</th>
                <th>Registered</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "2rem" }}>
                    <span className="spinner" /> Loading accounts...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}
                  >
                    No accounts match the criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((acc) => (
                  <tr key={acc.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background:
                              acc.accountType === "COMPANY"
                                ? "var(--primary-light)"
                                : "var(--accent-light)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color:
                              acc.accountType === "COMPANY"
                                ? "var(--secondary)"
                                : "var(--accent)",
                            flexShrink: 0,
                          }}
                        >
                          {acc.accountType === "COMPANY" ? (
                            <Building2 size={16} />
                          ) : (
                            <Users size={16} />
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                            {acc.companyName || acc.contactName || "—"}
                          </div>
                          {acc.coc && (
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                              KVK: {acc.coc}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                        {acc.contactName || "—"}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                        {acc.email}
                      </span>
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background:
                            acc.accountType === "COMPANY"
                              ? "rgba(99,102,241,0.12)"
                              : "rgba(168,85,247,0.12)",
                          color:
                            acc.accountType === "COMPANY"
                              ? "var(--secondary)"
                              : "var(--accent)",
                          fontWeight: 700,
                          fontSize: "0.75rem",
                        }}
                      >
                        {acc.accountType}
                        {acc.role === "ADMIN" && " (ADMIN)"}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{acc.country}</span>
                    </td>
                    <td>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: "0.875rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        <FileText size={13} /> {acc.invoiceCount}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                        {formatDate(acc.createdAt)}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: "var(--error)", padding: "4px 8px" }}
                        onClick={() => handleOpenDelete(acc)}
                        title={`Delete ${acc.accountType.toLowerCase()} account`}
                      >
                        <Trash2 size={15} /> Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Destructive Deletion Confirmation Modal */}
      {deletingAccount && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
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
              maxWidth: 480,
              padding: "2rem",
              background: "var(--bg-card)",
              border: "1px solid rgba(239, 68, 68, 0.4)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1rem" }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: "var(--error-light)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--error)",
                }}
              >
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0, color: "var(--error)" }}>
                  Confirm Destructive Deletion
                </h3>
                <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                  This action cannot be undone.
                </span>
              </div>
            </div>

            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "1.25rem" }}>
              You are about to permanently delete the{" "}
              <strong>{deletingAccount.accountType.toLowerCase()}</strong> account for{" "}
              <strong style={{ color: "var(--text-primary)" }}>{deletingAccount.email}</strong>. All associated
              company profiles, settings, and {deletingAccount.invoiceCount} uploaded invoice(s) will be erased.
            </p>

            <div className="form-group" style={{ marginBottom: "1.5rem" }}>
              <label className="form-label" style={{ fontSize: "0.8125rem" }}>
                Type <span style={{ color: "var(--error)", fontWeight: 800 }}>DELETE</span> to confirm:
              </label>
              <input
                className="form-input"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="DELETE"
                autoFocus
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setDeletingAccount(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: "var(--error)", borderColor: "var(--error)" }}
                onClick={handleConfirmDelete}
                disabled={deleting || confirmInput !== "DELETE"}
              >
                {deleting ? "Deleting..." : "Permanently Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
