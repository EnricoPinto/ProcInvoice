/**
 * Centralized Branding Constants for ProcInvoice
 * Update logo paths or brand metadata here to propagate across the entire application.
 */

export const BRANDING = {
  name: "ProcInvoice",
  tagline: "Automated Invoice Recognition & Compliance",
  
  // Logos
  logo: "/logo/procinvoice-logo.png",            // Full circular badge
  logo256: "/logo/procinvoice-logo-256.png",
  logo128: "/logo/procinvoice-logo-128.png",
  logo64: "/logo/procinvoice-logo-64.png",
  logoIcon: "/logo/procinvoice-icon.png",        // Crisp checkmark document icon
  logoHorizontal: "/logo/procinvoice-horizontal.png", // Icon + Wordmark lockup
  
  // Favicons & Icons
  favicon: "/favicon.ico",
  favicon16: "/favicon-16x16.png",
  favicon32: "/favicon-32x32.png",
  appleTouchIcon: "/apple-touch-icon.png",
  android192: "/android-chrome-192x192.png",
  android512: "/android-chrome-512x512.png",
  
  // Social & Meta
  ogImage: "/og-image.png",

  // Support & Contact
  // Configured via SUPPORT_ADMIN_EMAIL / NEXT_PUBLIC_SUPPORT_EMAIL env vars
  // Defaults to clearly marked placeholder address: support@procinvoice.example
  supportEmail:
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL ||
    process.env.SUPPORT_ADMIN_EMAIL ||
    "support@procinvoice.example",
} as const;

/**
 * Returns a configured mailto: link for ProcInvoice support.
 */
export function getSupportMailto(subject = "ProcInvoice Support Request", body = ""): string {
  const params = new URLSearchParams();
  if (subject) params.set("subject", subject);
  if (body) params.set("body", body);
  const query = params.toString();
  return `mailto:${BRANDING.supportEmail}${query ? `?${query}` : ""}`;
}
