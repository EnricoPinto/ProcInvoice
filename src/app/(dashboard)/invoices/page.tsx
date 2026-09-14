"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FileText,
  Upload,
  ArrowRight,
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  User,
  Calendar,
  Loader2,
} from "lucide-react";
import { formatDate, formatFileSize } from "@/lib/utils";
import { StatusBadge } from "@/components/invoice/StatusBadge";

interface InvoiceItem {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  pageCount: number;
  status: string;
  failureReason?: string | null;
  createdAt: string;
  uploaderName: string;
  vendorName: string;
  documentType: string;
  invoiceNumber: string;
  totalAmount?: number | null;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [docType, setDocType] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "fileName" | "status" | "size">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status !== "ALL") params.set("status", status);
      if (docType !== "ALL") params.set("docType", docType);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);
      params.set("page", String(page));
      params.set("limit", "10");

      const res = await fetch(`/api/invoices?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalCount(data.pagination?.total || 0);
      }
    } catch (err) {
      console.error("Failed to load invoices:", err);
    } finally {
      setLoading(false);
    }
  }, [search, status, docType, dateFrom, dateTo, sortBy, sortOrder, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInvoices();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchInvoices]);

  const handleResetFilters = () => {
    setSearch("");
    setStatus("ALL");
    setDocType("ALL");
    setDateFrom("");
    setDateTo("");
    setSortBy("date");
    setSortOrder("desc");
    setPage(1);
  };

  const toggleSort = (field: "date" | "fileName" | "status" | "size") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setPage(1);
  };

  const startRecord = totalCount === 0 ? 0 : (page - 1) * 10 + 1;
  const endRecord = Math.min(page * 10, totalCount);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div className="page-header" style={{ margin: 0 }}>
          <h1 className="page-title">My Invoices</h1>
          <p className="page-subtitle">
            All your processed and pending invoices — {totalCount} total
          </p>
        </div>
        <Link href="/upload" className="btn btn-primary" style={{ textDecoration: "none" }}>
          <Upload size={16} /> Upload New
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="glass-card"
        style={{
          padding: "1rem 1.25rem",
          marginBottom: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
        }}
      >
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
          {/* Search */}
          <div style={{ position: "relative", flex: "1 1 240px", minWidth: 200 }}>
            <Search
              size={16}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
              }}
            />
            <input
              type="text"
              placeholder="Search filename, vendor, or invoice #..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="form-control"
              style={{ paddingLeft: 36, height: 38 }}
            />
          </div>

          {/* Status Filter */}
          <div style={{ minWidth: 140 }}>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="form-control"
              style={{ height: 38 }}
            >
              <option value="ALL">All Statuses</option>
              <option value="PROCESSED">Processed</option>
              <option value="PROCESSING">Processing</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          {/* Document Type Filter */}
          <div style={{ minWidth: 150 }}>
            <select
              value={docType}
              onChange={(e) => {
                setDocType(e.target.value);
                setPage(1);
              }}
              className="form-control"
              style={{ height: 38 }}
            >
              <option value="ALL">All Types</option>
              <option value="Factuur">Factuur</option>
              <option value="Overige document">Overige document</option>
            </select>
          </div>

          {/* Date From */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>From:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="form-control"
              style={{ height: 38, width: 140 }}
            />
          </div>

          {/* Date To */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>To:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="form-control"
              style={{ height: 38, width: 140 }}
            />
          </div>

          {/* Reset Filters */}
          {(search || status !== "ALL" || docType !== "ALL" || dateFrom || dateTo) && (
            <button
              onClick={handleResetFilters}
              className="btn btn-ghost btn-sm"
              style={{ height: 38, display: "flex", alignItems: "center", gap: 6 }}
              title="Reset all filters"
            >
              <RotateCcw size={14} /> Reset
            </button>
          )}
        </div>
      </div>

      {/* Table Content */}
      {loading ? (
        <div style={{ padding: "4rem", textAlign: "center", color: "var(--text-muted)" }}>
          <Loader2 size={32} style={{ animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
          <div>Loading invoices...</div>
        </div>
      ) : invoices.length === 0 ? (
        <div
          className="glass-card"
          style={{ padding: "4rem", textAlign: "center", borderStyle: "dashed" }}
        >
          <FileText size={48} style={{ color: "var(--text-muted)", margin: "0 auto 1rem" }} />
          <h2 style={{ color: "var(--text-primary)", marginBottom: "0.5rem" }}>
            {search || status !== "ALL" || docType !== "ALL" || dateFrom || dateTo
              ? "No matching invoices found"
              : "No invoices yet"}
          </h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
            {search || status !== "ALL" || docType !== "ALL" || dateFrom || dateTo
              ? "Try adjusting your search criteria or resetting filters."
              : "Upload your first invoice to get started with automated data recognition."}
          </p>
          {search || status !== "ALL" || docType !== "ALL" || dateFrom || dateTo ? (
            <button onClick={handleResetFilters} className="btn btn-secondary">
              <RotateCcw size={16} /> Reset Filters
            </button>
          ) : (
            <Link href="/upload" className="btn btn-primary" style={{ textDecoration: "none" }}>
              <Upload size={16} /> Upload Invoice
            </Link>
          )}
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th
                  onClick={() => toggleSort("fileName")}
                  style={{ cursor: "pointer", userSelect: "none" }}
                  title="Click to sort by file name"
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    File & Vendor
                    <ArrowUpDown size={12} style={{ opacity: sortBy === "fileName" ? 1 : 0.4 }} />
                  </div>
                </th>
                <th>Type</th>
                <th
                  onClick={() => toggleSort("size")}
                  style={{ cursor: "pointer", userSelect: "none" }}
                  title="Click to sort by file size"
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    Size
                    <ArrowUpDown size={12} style={{ opacity: sortBy === "size" ? 1 : 0.4 }} />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort("status")}
                  style={{ cursor: "pointer", userSelect: "none" }}
                  title="Click to sort by status"
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    Status
                    <ArrowUpDown size={12} style={{ opacity: sortBy === "status" ? 1 : 0.4 }} />
                  </div>
                </th>
                <th>Uploaded By</th>
                <th
                  onClick={() => toggleSort("date")}
                  style={{ cursor: "pointer", userSelect: "none" }}
                  title="Click to sort by date"
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    Uploaded Date
                    <ArrowUpDown size={12} style={{ opacity: sortBy === "date" ? 1 : 0.4 }} />
                  </div>
                </th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <FileText size={18} style={{ color: "var(--primary)", flexShrink: 0 }} />
                      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                        <span
                          style={{
                            maxWidth: 240,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            fontWeight: 600,
                          }}
                          title={invoice.fileName}
                        >
                          {invoice.fileName}
                        </span>
                        {invoice.vendorName && (
                          <span
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--text-muted)",
                              maxWidth: 240,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Vendor: {invoice.vendorName}
                            {invoice.invoiceNumber ? ` · #${invoice.invoiceNumber}` : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        padding: "2px 8px",
                        borderRadius: 6,
                        backgroundColor:
                          invoice.documentType === "Factuur"
                            ? "rgba(16, 185, 129, 0.12)"
                            : "rgba(148, 163, 184, 0.15)",
                        color:
                          invoice.documentType === "Factuur"
                            ? "var(--success)"
                            : "var(--text-secondary)",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {invoice.documentType || "Factuur"}
                    </span>
                  </td>
                  <td style={{ fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                    {formatFileSize(invoice.fileSize)}
                  </td>
                  <td>
                    <StatusBadge
                      status={invoice.status}
                      failureReason={invoice.failureReason}
                    />
                  </td>
                  <td>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: "0.75rem",
                        padding: "2px 8px",
                        borderRadius: 12,
                        backgroundColor: "var(--bg-secondary)",
                        border: "1px solid var(--border)",
                        color: "var(--text-secondary)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <User size={11} />
                      {invoice.uploaderName}
                    </span>
                  </td>
                  <td style={{ whiteSpace: "nowrap", fontSize: "0.85rem" }}>
                    {formatDate(invoice.createdAt)}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <Link
                      href={`/invoices/${invoice.id}`}
                      className="btn btn-ghost btn-sm"
                      style={{ textDecoration: "none", whiteSpace: "nowrap" }}
                    >
                      View <ArrowRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "1rem 1.25rem",
              borderTop: "1px solid var(--border)",
              flexWrap: "wrap",
              gap: "0.75rem",
            }}
          >
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              Showing <strong>{startRecord}</strong> to <strong>{endRecord}</strong> of{" "}
              <strong>{totalCount}</strong> invoices
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                style={{ display: "flex", alignItems: "center", gap: 4 }}
              >
                <ChevronLeft size={16} /> Previous
              </button>

              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", padding: "0 6px" }}>
                Page {page} of {totalPages}
              </span>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                style={{ display: "flex", alignItems: "center", gap: 4 }}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
