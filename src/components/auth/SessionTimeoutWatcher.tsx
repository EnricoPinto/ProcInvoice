"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { signOut } from "next-auth/react";
import { AlertTriangle, Clock, LogOut, ShieldAlert } from "lucide-react";

interface SessionTimeoutWatcherProps {
  /** Total timeout duration in ms. Defaults to 30 minutes. */
  timeoutMs?: number;
  /** Warning lead time before logout in ms. Defaults to 60 seconds. */
  warningLeadMs?: number;
}

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const DEFAULT_WARNING_LEAD_MS = 60 * 1000; // 60 seconds

export function SessionTimeoutWatcher({
  timeoutMs = DEFAULT_TIMEOUT_MS,
  warningLeadMs = DEFAULT_WARNING_LEAD_MS,
}: SessionTimeoutWatcherProps) {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(60);
  const lastActivityRef = useRef<number>(Date.now());
  const warningActiveRef = useRef<boolean>(false);

  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (warningActiveRef.current) {
      warningActiveRef.current = false;
      setShowWarning(false);
    }
  }, []);

  const handleLogout = useCallback(() => {
    signOut({ callbackUrl: "/login?reason=timeout" });
  }, []);

  useEffect(() => {
    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];

    let throttleTimer: NodeJS.Timeout | null = null;
    const handleUserActivity = () => {
      // If warning modal is already up, require user to click "Stay Logged In"
      if (warningActiveRef.current) return;

      if (!throttleTimer) {
        lastActivityRef.current = Date.now();
        throttleTimer = setTimeout(() => {
          throttleTimer = null;
        }, 1000); // 1s throttle
      }
    };

    events.forEach((evt) => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastActivityRef.current;
      const timeLeft = timeoutMs - elapsed;

      if (timeLeft <= 0) {
        clearInterval(interval);
        handleLogout();
      } else if (timeLeft <= warningLeadMs) {
        warningActiveRef.current = true;
        setShowWarning(true);
        setSecondsRemaining(Math.max(1, Math.ceil(timeLeft / 1000)));
      } else if (warningActiveRef.current) {
        warningActiveRef.current = false;
        setShowWarning(false);
      }
    }, 1000);

    return () => {
      events.forEach((evt) => {
        window.removeEventListener(evt, handleUserActivity);
      });
      clearInterval(interval);
      if (throttleTimer) clearTimeout(throttleTimer);
    };
  }, [timeoutMs, warningLeadMs, handleLogout]);

  if (!showWarning) return null;

  return (
    <div className="modal-backdrop" style={{ zIndex: 99999 }}>
      <div
        className="modal-card animate-scale-in"
        style={{
          maxWidth: 460,
          textAlign: "center",
          padding: "2rem",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
          border: "1px solid rgba(245, 158, 11, 0.4)",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            backgroundColor: "rgba(245, 158, 11, 0.15)",
            color: "var(--warning)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.25rem",
          }}
        >
          <Clock size={28} />
        </div>

        <h3
          style={{
            fontSize: "1.25rem",
            fontWeight: 700,
            color: "var(--text-primary)",
            marginBottom: "0.5rem",
          }}
        >
          Session Inactivity Warning
        </h3>

        <p
          style={{
            fontSize: "0.925rem",
            color: "var(--text-secondary)",
            lineHeight: 1.5,
            marginBottom: "1.5rem",
          }}
        >
          Your session is about to expire due to inactivity. Click below to stay logged in.
        </p>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            backgroundColor: "rgba(245, 158, 11, 0.1)",
            padding: "8px 16px",
            borderRadius: 20,
            color: "var(--warning)",
            fontWeight: 700,
            fontSize: "1rem",
            marginBottom: "1.75rem",
          }}
        >
          <span>Expiring in: {secondsRemaining}s</span>
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleLogout}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <LogOut size={16} />
            Log Out Now
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={resetActivity}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            Stay Logged In
          </button>
        </div>
      </div>
    </div>
  );
}
