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
} as const;
