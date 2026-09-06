"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileText,
  X,
  Camera,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { formatFileSize, ACCEPTED_FILE_TYPES, MAX_FILE_SIZE_BYTES } from "@/lib/utils";
import { MultiPageModal } from "@/components/upload/MultiPageModal";

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [pageCount, setPageCount] = useState(0);
  const [skipWarning, setSkipWarning] = useState(false);

  // Fetch user settings to check if modal should be skipped
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.settings?.skipMultiPageWarning) {
          setSkipWarning(true);
        }
      })
      .catch(() => {});
  }, []);

  const validateFile = (f: File): string | null => {
    if (!ACCEPTED_FILE_TYPES.includes(f.type)) {
      return "Invalid file type. Only PDF, JPG, PNG, and WebP are allowed.";
    }
    if (f.size > MAX_FILE_SIZE_BYTES) {
      return "File is too large. Maximum size is 10MB.";
    }
    return null;
  };

  const handleFileSelect = (f: File) => {
    const err = validateFile(f);
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setFile(f);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelect(f);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };
  const handleDragLeave = () => setDragActive(false);

  const handleUpload = async (skip = skipWarning) => {
    if (!file) return;
    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("skipWarning", String(skip));

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Upload failed. Please try again.");
        setUploading(false);
        return;
      }

      if (data.multiPage) {
        // Server says multi-page: show modal
        setPageCount(data.pageCount);
        setShowModal(true);
        setUploading(false);
        return;
      }

      // Success — redirect to invoice detail
      router.push(`/invoices/${data.invoiceId}`);
    } catch {
      setError("Network error. Please check your connection.");
      setUploading(false);
    }
  };

  const handleModalConfirm = async (rememberSetting: boolean) => {
    setShowModal(false);
    if (rememberSetting) {
      // Persist setting
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skipMultiPageWarning: true }),
      });
      setSkipWarning(true);
    }
    await handleUpload(true);
  };

  const handleModalCancel = () => setShowModal(false);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Upload Invoice</h1>
        <p className="page-subtitle">
          Upload a PDF or image of your invoice for automated data recognition.
        </p>
      </div>

      <div style={{ maxWidth: 640 }}>
        {/* Upload Zone */}
        <div
          className={`upload-zone${dragActive ? " drag-active" : ""}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !file && fileInputRef.current?.click()}
          style={{ cursor: file ? "default" : "pointer" }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileSelect(f);
              e.target.value = "";
            }}
          />

          {file ? (
            <div style={{ width: "100%", textAlign: "left" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  padding: "1rem",
                  background: "var(--primary-light)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid rgba(99,102,241,0.3)",
                }}
              >
                <FileText size={32} style={{ color: "var(--secondary)", flexShrink: 0 }} />
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div
                    style={{
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {file.name}
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                    {formatFileSize(file.size)} · {file.type}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setError("");
                  }}
                  className="btn btn-ghost btn-icon"
                  style={{ color: "var(--error)" }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="upload-zone-icon">
                <Upload size={28} />
              </div>
              <div>
                <p
                  style={{
                    fontWeight: 600,
                    fontSize: "1rem",
                    color: "var(--text-primary)",
                    marginBottom: 4,
                  }}
                >
                  Drop your invoice here
                </p>
                <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                  or click to browse — PDF, JPG, PNG (max 10MB)
                </p>
              </div>
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="alert alert-error" style={{ marginTop: "1rem" }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            {error}
          </div>
        )}

        {/* Scan Divider */}
        <div className="divider" style={{ margin: "1.5rem 0" }}>
          or
        </div>

        {/* Scan Button */}
        <button
          className="btn btn-secondary btn-full"
          onClick={() => {
            // Camera/scan: trigger a file input filtered to images with capture
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/*";
            input.capture = "environment";
            input.onchange = (e) => {
              const f = (e.target as HTMLInputElement).files?.[0];
              if (f) handleFileSelect(f);
            };
            input.click();
          }}
          style={{ justifyContent: "center", gap: 8 }}
        >
          <Camera size={18} /> Scan Invoice with Camera
        </button>

        {/* Proceed button */}
        {file && (
          <button
            className="btn btn-primary btn-full btn-lg"
            style={{ marginTop: "1.5rem" }}
            onClick={() => handleUpload()}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Loader2 size={20} style={{ animation: "spin 0.7s linear infinite" }} />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle2 size={20} /> Proceed with Data Recognition
              </>
            )}
          </button>
        )}

        {/* Accepted types info */}
        <p
          style={{
            textAlign: "center",
            fontSize: "0.8125rem",
            color: "var(--text-muted)",
            marginTop: "1rem",
          }}
        >
          Supported formats: PDF, JPG, PNG, WebP · Max 10MB
        </p>
      </div>

      {/* Multi-page confirmation modal */}
      {showModal && (
        <MultiPageModal
          pageCount={pageCount}
          onConfirm={handleModalConfirm}
          onCancel={handleModalCancel}
        />
      )}
    </div>
  );
}
