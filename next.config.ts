import type { NextConfig } from "next";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";

// Ensure tessdata/eng.traineddata exists (decompressed from .gz if needed)
// This runs at build time so Vercel has the file available during deployment
const tessdataDir = path.join(process.cwd(), "tessdata");
const trainedDataPath = path.join(tessdataDir, "eng.traineddata");
const gzPath = path.join(tessdataDir, "eng.traineddata.gz");

if (!fs.existsSync(trainedDataPath) && fs.existsSync(gzPath)) {
  console.log("[next.config] Decompressing eng.traineddata.gz for Vercel build...");
  try {
    execSync(`node scripts/decompress-tessdata.js`, { stdio: "inherit" });
  } catch (e) {
    console.error("[next.config] Failed to decompress tessdata:", e);
  }
}

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "@prisma/client", "tesseract.js", "sharp"],

  // Include tessdata in the server output so it's available on Vercel
  outputFileTracingIncludes: {
    "/api/upload": ["./tessdata/**"],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
