"use client";

import { useState, useEffect } from "react";
import { Cookie, ShieldCheck } from "lucide-react";

export function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie_consent");
    if (!consent) {
      setShow(true);
    }
  }, []);

  const handleAccept = (type: "all" | "essential") => {
    localStorage.setItem("cookie_consent", type);
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "1.5rem",
        left: "1.5rem",
        right: "1.5rem",
        maxWidth: 600,
        margin: "0 auto",
        background: "rgba(15, 23, 42, 0.95)",
        backdropFilter: "blur(12px)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "1.25rem 1.5rem",
        boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
      className="animate-slide-up"
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "var(--primary-light)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--secondary)",
            flexShrink: 0,
          }}
        >
          <Cookie size={20} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)", marginBottom: 4 }}>
            Cookie & GDPR Privacy Preference
          </div>
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
            We use essential cookies to maintain secure authentication and session status. Optional analytics help improve your experience under GDPR guidelines.
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => handleAccept("essential")}
        >
          Essential Only
        </button>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => handleAccept("all")}
        >
          <ShieldCheck size={14} /> Accept All
        </button>
      </div>
    </div>
  );
}
