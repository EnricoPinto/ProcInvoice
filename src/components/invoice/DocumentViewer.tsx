"use client";

import { useState } from "react";
import { Eye, ZoomIn, ZoomOut, RotateCw, Maximize2, AlertCircle } from "lucide-react";

interface DocumentViewerProps {
  fileUrl: string;
  fileName: string;
  mimeType: string;
}

export function DocumentViewer({ fileUrl, fileName, mimeType }: DocumentViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [hasError, setHasError] = useState(false);

  const isPdf = mimeType === "application/pdf";

  const handleZoomIn = () => setZoom((z) => Math.min(Number((z + 0.25).toFixed(2)), 3));
  const handleZoomOut = () => setZoom((z) => Math.max(Number((z - 0.25).toFixed(2)), 0.5));
  const handleResetZoom = () => {
    setZoom(1);
    setRotation(0);
  };
  const handleRotate = () => setRotation((r) => (r + 90) % 360);

  return (
    <div className="invoice-pdf-pane glass-card" style={{ padding: "0.75rem" }}>
      {/* Header with Title & Controls */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0.4rem 0.6rem 0.6rem",
          borderBottom: "1px solid var(--border)",
          marginBottom: "0.5rem",
          flexWrap: "wrap",
          gap: 6,
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: "0.8125rem",
            fontWeight: 700,
            color: "var(--text-secondary)",
          }}
        >
          <Eye size={15} style={{ color: "var(--secondary)" }} />
          Source Document
        </span>

        {/* Toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {!isPdf && !hasError && (
            <>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleZoomOut}
                title="Zoom Out"
                style={{ padding: "3px 6px", fontSize: "0.75rem", height: 26 }}
              >
                <ZoomOut size={13} />
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleResetZoom}
                title="Reset Zoom"
                style={{ padding: "3px 6px", fontSize: "0.75rem", height: 26, minWidth: 42 }}
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleZoomIn}
                title="Zoom In"
                style={{ padding: "3px 6px", fontSize: "0.75rem", height: 26 }}
              >
                <ZoomIn size={13} />
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleRotate}
                title="Rotate 90°"
                style={{ padding: "3px 6px", fontSize: "0.75rem", height: 26 }}
              >
                <RotateCw size={13} />
              </button>
            </>
          )}
          <a
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost btn-sm"
            style={{
              fontSize: "0.75rem",
              color: "var(--secondary)",
              padding: "3px 8px",
              height: 26,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontWeight: 600,
              textDecoration: "none",
            }}
            title="Open Full Screen in New Tab"
          >
            <Maximize2 size={12} /> Full Screen
          </a>
        </div>
      </div>

      {/* Content View */}
      {isPdf ? (
        <iframe
          src={`${fileUrl}#toolbar=1&navpanes=0`}
          title="Invoice PDF Preview"
          className="invoice-pdf-frame"
        />
      ) : hasError ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.3)",
            borderRadius: "var(--radius-lg)",
            padding: "2rem 1.5rem",
            textAlign: "center",
            gap: "0.75rem",
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: "rgba(99, 102, 241, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--secondary)",
            }}
          >
            <AlertCircle size={26} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: "0.9375rem", color: "var(--text-primary)" }}>
              {fileName}
            </h4>
            <p style={{ margin: "6px 0 0", fontSize: "0.8125rem", color: "var(--text-secondary)", maxWidth: 320 }}>
              Original document preview is not available for this legacy upload. All extracted details are preserved on the right.
            </p>
          </div>
          <a
            href="/upload"
            className="btn btn-secondary btn-sm"
            style={{ marginTop: 8, fontSize: "0.8125rem" }}
          >
            Re-upload Document
          </a>
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "auto",
            background: "rgba(0,0,0,0.35)",
            borderRadius: "var(--radius-lg)",
            padding: "0.75rem",
            minHeight: 400,
          }}
        >
          <div
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              transformOrigin: "center center",
              transition: "transform 0.15s ease-out",
              display: "inline-block",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fileUrl}
              alt={fileName}
              onError={() => setHasError(true)}
              style={{
                maxWidth: "100%",
                maxHeight: "calc(100vh - 12rem)",
                objectFit: "contain",
                borderRadius: 6,
                boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
                display: "block",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
