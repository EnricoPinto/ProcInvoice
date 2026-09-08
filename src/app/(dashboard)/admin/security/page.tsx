"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, Server, Key, Users, History, Search, Download } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface UserRecord {
  id: string;
  email: string;
  accountType: string;
  role: string;
  country: string;
  lastLoginAt: string | null;
  createdAt: string;
}

interface AuditRecord {
  id: string;
  action: string;
  resource: string;
  ipAddress: string | null;
  createdAt: string;
  user: { email: string };
}

interface SecurityMetrics {
  activeUsers: number;
  currentKeyVersion: string;
  totalInvoices: number;
  flaggedInvoices: number;
  euHostingRegion: string;
  iso27001Status: string;
}

export default function SecurityAdminPage() {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [logs, setLogs] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (actionFilter) q.set("action", actionFilter);
      if (search) q.set("search", search);

      const res = await fetch(`/api/admin/security?${q.toString()}`);
      const data = await res.json();
      if (data.securityMetrics) setMetrics(data.securityMetrics);
      if (data.users) setUsers(data.users);
      if (data.auditLogs) setLogs(data.auditLogs);
    } catch {
      console.error("Failed to load security dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    const q = new URLSearchParams();
    if (actionFilter) q.set("action", actionFilter);
    if (search) q.set("search", search);

    fetch(`/api/admin/security?${q.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (!ignore) {
          if (data.securityMetrics) setMetrics(data.securityMetrics);
          if (data.users) setUsers(data.users);
          if (data.auditLogs) setLogs(data.auditLogs);
        }
      })
      .catch(() => {
        if (!ignore) console.error("Failed to load security dashboard data");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [actionFilter, search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const exportAuditTrail = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["ID,User,Action,Resource,IP Address,Timestamp"]
        .concat(
          logs.map(
            (l) =>
              `"${l.id}","${l.user?.email || ""}","${l.action}","${l.resource}","${l.ipAddress || ""}","${l.createdAt}"`
          )
        )
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `iso27001_audit_log_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && !metrics) {
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
            <ShieldCheck size={28} style={{ color: "var(--success)" }} />
            Security & ISO 27001 Evidence Dashboard
          </h1>
          <p className="page-subtitle">
            Field-level encryption, access traceability audit trail, and EU market compliance evidence.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={exportAuditTrail}>
          <Download size={16} /> Export Audit Log (CSV)
        </button>
      </div>

      {/* Metrics Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ background: "var(--success-light)", color: "var(--success)" }}
          >
            <ShieldCheck size={22} />
          </div>
          <div className="stat-value" style={{ fontSize: "1.1rem", color: "var(--success)" }}>
            AES-256-GCM
          </div>
          <div className="stat-label">Encryption Standard</div>
        </div>

        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ background: "var(--primary-light)", color: "var(--secondary)" }}
          >
            <Key size={22} />
          </div>
          <div className="stat-value" style={{ fontSize: "1.1rem" }}>
            {metrics?.currentKeyVersion || "v1"}
          </div>
          <div className="stat-label">Active Key Version</div>
        </div>

        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ background: "var(--warning-light)", color: "var(--warning)" }}
          >
            <Server size={22} />
          </div>
          <div className="stat-value" style={{ fontSize: "0.95rem", color: "var(--warning)" }}>
            {metrics?.euHostingRegion || "EU Frankfurt"}
          </div>
          <div className="stat-label">GDPR Hosting Region</div>
        </div>

        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ background: "var(--accent-light)", color: "var(--accent)" }}
          >
            <Users size={22} />
          </div>
          <div className="stat-value" style={{ color: "var(--accent)" }}>
            {metrics?.activeUsers || 0}
          </div>
          <div className="stat-label">Registered Accounts</div>
        </div>
      </div>

      {/* Active Users Table */}
      <div className="glass-card" style={{ padding: "1.5rem", marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1rem", color: "var(--text-primary)" }}>
          User Accounts & Last Login Times
        </h2>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>User Email</th>
                <th>Account Type</th>
                <th>Country</th>
                <th>Role</th>
                <th>Last Login Time</th>
                <th>Registered Date</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ color: "var(--text-primary)", fontWeight: 500 }}>{u.email}</td>
                  <td>
                    <span className="badge badge-pending">{u.accountType}</span>
                  </td>
                  <td>{u.country}</td>
                  <td>
                    <span className="badge badge-processed">{u.role}</span>
                  </td>
                  <td style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
                    {u.lastLoginAt ? formatDate(u.lastLoginAt) : "Never logged in"}
                  </td>
                  <td style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
                    {formatDate(u.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Search & Audit Log Viewer */}
      <div className="glass-card" style={{ padding: "1.5rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <History size={20} style={{ color: "var(--secondary)" }} />
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Access Traceability Audit Log (ISO 27001 A.12.4)
            </h2>
          </div>

          <form onSubmit={handleSearch} style={{ display: "flex", gap: 8 }}>
            <select
              className="form-input"
              style={{ width: "auto", fontSize: "0.85rem" }}
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              <option value="">All Actions</option>
              <option value="VIEW_INVOICE">VIEW_INVOICE</option>
              <option value="EDIT_INVOICE">EDIT_INVOICE</option>
              <option value="DELETE_INVOICE">DELETE_INVOICE</option>
              <option value="LOGIN">LOGIN</option>
              <option value="REGISTER">REGISTER</option>
              <option value="EXPORT_DATA">EXPORT_DATA</option>
              <option value="DELETE_ACCOUNT">DELETE_ACCOUNT</option>
            </select>

            <input
              type="text"
              className="form-input"
              placeholder="Search resource or IP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 180, fontSize: "0.85rem" }}
            />
            <button type="submit" className="btn btn-secondary btn-sm">
              <Search size={14} />
            </button>
          </form>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User Email</th>
                <th>Action</th>
                <th>Resource</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ whiteSpace: "nowrap", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                    {formatDate(log.createdAt)}
                  </td>
                  <td style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                    {log.user?.email || "System"}
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        log.action.startsWith("DELETE")
                          ? "badge-failed"
                          : log.action.startsWith("VIEW")
                          ? "badge-pending"
                          : "badge-processed"
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>{log.resource}</td>
                  <td style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                    {log.ipAddress || "127.0.0.1"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
