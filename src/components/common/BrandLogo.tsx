"use client";

import Image from "next/image";
import Link from "next/link";
import { BRANDING } from "@/lib/branding";

interface BrandLogoProps {
  variant?: "full" | "icon" | "horizontal";
  size?: number;
  className?: string;
  withLink?: boolean;
  href?: string;
  priority?: boolean;
}

export function BrandLogo({
  variant = "horizontal",
  size,
  className = "",
  withLink = false,
  href = "/dashboard",
  priority = true,
}: BrandLogoProps) {
  let content: React.ReactNode;

  if (variant === "icon") {
    const s = size || 32;
    content = (
      <div
        className={`brand-logo brand-logo-icon ${className}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: s,
          height: s,
          flexShrink: 0,
        }}
      >
        <Image
          src={BRANDING.logoIcon}
          alt={BRANDING.name}
          width={s}
          height={s}
          priority={priority}
          style={{ objectFit: "contain" }}
        />
      </div>
    );
  } else if (variant === "full") {
    const s = size || 80;
    content = (
      <div
        className={`brand-logo brand-logo-full ${className}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: s,
          height: s,
          flexShrink: 0,
        }}
      >
        <Image
          src={BRANDING.logo}
          alt={BRANDING.name}
          width={s}
          height={s}
          priority={priority}
          style={{
            objectFit: "contain",
            filter: "drop-shadow(0 4px 12px rgba(0, 0, 0, 0.25))",
          }}
        />
      </div>
    );
  } else {
    // Horizontal lockup (Logo + Wordmark)
    const s = size || 36;
    content = (
      <div
        className={`brand-logo brand-logo-horizontal ${className}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 12,
          textDecoration: "none",
        }}
      >
        <Image
          src={BRANDING.logo}
          alt={BRANDING.name}
          width={s}
          height={s}
          priority={priority}
          style={{
            objectFit: "contain",
            borderRadius: "50%",
            filter: "drop-shadow(0 2px 6px rgba(0, 0, 0, 0.3))",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
          <span
            style={{
              fontSize: "1.2rem",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "var(--text-primary, #ffffff)",
            }}
          >
            {BRANDING.name}
          </span>
          <span
            style={{
              fontSize: "0.6875rem",
              fontWeight: 600,
              letterSpacing: "0.08em",
              color: "var(--primary, #38bdf8)",
              textTransform: "uppercase",
            }}
          >
            Smart OCR
          </span>
        </div>
      </div>
    );
  }

  if (withLink) {
    return (
      <Link href={href} style={{ textDecoration: "none" }}>
        {content}
      </Link>
    );
  }

  return <>{content}</>;
}
