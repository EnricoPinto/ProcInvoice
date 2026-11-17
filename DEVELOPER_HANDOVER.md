# ProcInvoice — Developer Handover & System Architecture Documentation

Welcome to the **ProcInvoice** codebase. This document is designed for incoming engineers to quickly set up, understand, maintain, and extend the platform.

---

## 1. Project Overview & Business Purpose

**ProcInvoice** is an automated, AI-driven B2B invoice-processing and compliance web application tailored for Dutch and EU corporate accounts.

### Key Capabilities
1. **Document Classification**: Evaluates incoming documents and classifies them as `"Factuur"` (official invoice) or `"Overige document"` (receipt, quote, or other non-invoice).
2. **Hybrid OCR & AI Extraction Engine**:
   - Digital PDFs: High-speed extraction via `pdf-parse`.
   - Scanned PDFs & images: Google Gemini 1.5/2.0 Flash multimodal parsing with Google Cloud Vision fallback.
   - Rule Engine: Admin-configurable keyword and regex patterns for header and line-item extraction.
3. **Side-by-Side Review Interface**: Split-screen interface displaying the source document alongside editable form fields and line-item tables with automatic Multi-VAT calculation.
4. **UBL 2.1 XML Export**: Generates validated Peppol BIS Billing 3.0 (EN 16931 compliant) XML invoices with multi-VAT subtotals.
5. **Security & GDPR Compliance**: Field-level AES-256-GCM encryption for sensitive corporate and personal data (VAT, IBAN, contact details), ISO 27001 audit logging, session inactivity timeouts, and automated data retention policies.

---

## 2. Tech Stack Summary

| Layer | Technology | Version / Details |
|---|---|---|
| **Framework** | Next.js (App Router, Turbopack) | `16.3.2` |
| **UI Library** | React / React DOM | `19.2.8` |
| **Language** | TypeScript | `^5.0.0` (Strict mode) |
| **Database** | PostgreSQL (hosted on Supabase) | PostgreSQL 15+ |
| **ORM** | Prisma Client & Prisma Pg Adapter | `^7.9.1` |
| **Authentication** | NextAuth.js (Auth.js) | `^5.0.0-beta.32` (JWT strategy) |
| **Password Hashing** | `bcryptjs` | `^3.0.3` |
| **AI / OCR** | Google Gemini API (Flash) / Google Vision | `@google/generative-ai` pattern via REST |
| **PDF Extraction** | `pdf-parse` (digital text) | `^1.1.1` |
| **Encryption** | Node.js `crypto` (AES-256-GCM) | Key-versioned envelope encryption |
| **Styling** | Tailwind CSS v4 & Modular CSS | `@tailwindcss/postcss ^4` |
| **Deployment** | Vercel (Edge & Serverless Node.js) | Production URL: `https://proc-invoice.vercel.app` |

---

## 3. Repository & Security Audit

### GitHub Status
- **Repository Remote**: `https://github.com/EnricoPinto/ProcInvoice.git`
- **Main Branch**: `master`
- **Tracking**: All changes, fixes, and features are fully committed and pushed to `origin/master`.

### Security Audit (No Secrets Leaked)
- `.env` and `.env.local` files are strictly excluded via `.gitignore` (`.env*` rule).
- **Git History Verified**: No `.env` files, production database passwords, encryption keys, or API tokens have ever been committed into the Git tree.
- A clean template is provided in [`.env.example`](./.env.example).

---

## 4. Environment Variables Reference

When deploying or running locally, create a `.env` file in the project root with the following keys:

| Environment Variable | Required | Where to Get / How to Generate | Description |
|---|---|---|---|
| `DATABASE_URL` | **Yes** | Supabase Project Settings → Database → Connection Pooling (Port 6543) | Transaction pooler connection string for runtime queries in serverless. |
| `DIRECT_URL` | **Yes** | Supabase Project Settings → Database → Connection String (Port 5432) | Direct PostgreSQL connection string for Prisma migrations. |
| `NEXTAUTH_SECRET` | **Yes** | Run: `openssl rand -base64 32` | JWT encryption and signing secret for NextAuth. |
| `NEXTAUTH_URL` | Dev only | Set to `http://localhost:3005` locally | Canonical base URL (auto-detected on Vercel). |
| `AUTH_TRUST_HOST` | **Yes** | Set to `"true"` | Instructs NextAuth to trust proxy headers from Vercel. |
| `FIELD_ENCRYPTION_KEY` | **Yes** | Run: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` | 64-character (32-byte) hex key for AES-256-GCM field encryption. |
| `KEY_VERSION` | No | Default: `"v1"` | Key version tag for data encryption rotation. |
| `GEMINI_API_KEY` | **Yes** | [Google AI Studio](https://aistudio.google.com/) | Free API key powering AI OCR document classification & line-item extraction. |
| `GOOGLE_VISION_API_KEY` | Optional | Google Cloud Console | Optional secondary fallback OCR for scanned PDFs. |
| `STORAGE_BUCKET_URL` | Optional | Supabase Storage / S3 | Optional external object storage endpoint. Invoices store in DB if omitted. |
| `STORAGE_ACCESS_KEY` | Optional | Supabase Service Role Key | Access key for Supabase Storage bucket uploads. |
| `STORAGE_BUCKET_NAME` | Optional | Default: `"invoices"` | Name of the bucket. |
| `SUPPORT_ADMIN_EMAIL` | Optional | Default: `"support@procinvoice.example"` | Configurable recipient for client support requests. |
| `NEXT_PUBLIC_SUPPORT_EMAIL`| Optional | Same as above | Client-exposed email for support mailto links. |
| `NEXT_PUBLIC_APP_URL` | Optional | `http://localhost:3005` | Canonical frontend app URL. |

---

## 5. Local Development Setup (Quickstart)

### Prerequisites
- **Node.js**: `v20.x` or `v22.x` (LTS recommended)
- **npm**: `v10+` or `v11+`
- **PostgreSQL Database**: An active PostgreSQL instance (local or hosted on Supabase/Neon).

### Step-by-Step Instructions

1. **Clone the repository**:
   ```bash
   git clone https://github.com/EnricoPinto/ProcInvoice.git
   cd ProcInvoice/procinvoice
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment**:
   ```bash
   cp .env.example .env
   # Edit .env and fill in DATABASE_URL, NEXTAUTH_SECRET, FIELD_ENCRYPTION_KEY, and GEMINI_API_KEY
   ```

4. **Initialize Database & Prisma Client**:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Seed Default Keyword & Validation Rules** (Optional):
   ```bash
   npx tsx src/lib/seed-keywords.ts
   ```

6. **Start Local Development Server**:
   ```bash
   npm run dev
   ```
   Open your browser to [http://localhost:3005](http://localhost:3005).

---

## 6. System Architecture & Core Modules

```
procinvoice/
├── prisma/
│   ├── schema.prisma           # Prisma 7 data models (User, Invoice, KeywordRule, etc.)
│   └── migrations/             # Migration history
├── prisma.config.ts            # Prisma 7 database datasource configuration
├── public/
│   ├── logo/                   # ProcInvoice brand assets & logos
│   └── favicon.*               # Favicon suite (16x16, 32x32, apple-touch)
└── src/
    ├── app/                    # Next.js 16 App Router
    │   ├── (auth)/             # Login & Registration (/login, /register/company)
    │   ├── (dashboard)/        # Authenticated views (/dashboard, /upload, /invoices, /admin, /settings)
    │   ├── api/                # Backend API routes
    │   │   ├── auth/           # NextAuth handlers
    │   │   ├── health/         # System & database health diagnostic (/api/health)
    │   │   ├── invoices/       # CRUD, file serving, UBL XML export
    │   │   ├── upload/         # Invoice ingest & OCR pipeline
    │   │   └── admin/          # Keyword rules, validation rules, user management
    │   └── layout.tsx          # Root HTML layout with OpenGraph metadata
    ├── components/             # Reusable UI components
    │   ├── invoice/            # EditableResults, StatusBadge, PDF viewer
    │   ├── dashboard/          # Sidebar, stats widgets, navigation breadcrumbs
    │   └── common/             # BrandLogo, Modal, Tooltips
    ├── lib/                    # Core business logic & services
    │   ├── auth.ts             # NextAuth v5 configuration & JWT callbacks
    │   ├── prisma.ts           # Prisma client singleton with driver adapter
    │   ├── ocr.ts              # Primary OCR orchestrator (pdf-parse + Gemini AI)
    │   ├── google-vision.ts    # Gemini / Cloud Vision API client
    │   ├── keyword-extractor.ts# Rule-based field & table column extraction engine
    │   ├── ubl-generator.ts    # Peppol BIS 3.0 UBL 2.1 XML serialization
    │   ├── encryption.ts       # AES-256-GCM data encryption at rest
    │   └── branding.ts         # Centralized brand constants & support mailto
    └── proxy.ts                # Next.js route protection & session middleware
```

---

## 7. Crucial Architectural Rules

### 1. Database Connection on Serverless (Vercel)
- Vercel functions are stateless and spin up in parallel. **Always connect via the Supabase Transaction Pooler (`DATABASE_URL` on port 6543 with `?pgbouncer=true`)** for runtime operations to prevent PostgreSQL connection exhaustion.
- The direct connection (`DIRECT_URL` on port 5432) should only be used for migrations and schema updates.

### 2. Company-Only Account Model
- Individual accounts were deprecated and removed. All newly registered users must have `accountType = "COMPANY"`.
- Registration requires: Contact Person Name, Country, Business Type, Email, and **at least ONE of KVK/COC number OR VAT number** (conditional requirement).

### 3. Field-Level Encryption Protocol
- Fields containing sensitive identifiers (`vatNumber`, `iban`, `address`, `companyEmail`, `contactName`) are encrypted before database insertion using `encrypt()` from [`src/lib/encryption.ts`](file:///c:/Users/jude/Desktop/Procinvoice/procinvoice/src/lib/encryption.ts).
- Always wrap access with `decrypt()` when displaying to authorized users or producing exports.

### 4. Line-Item Table Keyword Extraction
- The `KeywordRule` model supports two rule types:
  - `ruleType: "documentField"`: Matches top-level document fields (e.g. invoice date, invoice number).
  - `ruleType: "lineItemColumn"`: Matches column headers in item tables (`Omschrijving`, `Aantal`, `Netto`, `Bruto`, `BTW`).
- Netto (tax-exclusive) and Bruto (tax-inclusive) are extracted independently per line item.

### 5. Multi-VAT Calculation & UBL XML
- An invoice can contain line items at multiple tax rates (e.g., 21%, 9%, 0%).
- The review screen calculates per-rate tax subtotals dynamically.
- The UBL generator ([`src/lib/ubl-generator.ts`](file:///c:/Users/jude/Desktop/Procinvoice/procinvoice/src/lib/ubl-generator.ts)) groups line items by tax percentage and constructs compliant `<cac:TaxSubtotal>` nodes with appropriate Peppol duty codes (`S` for standard rate, `Z` for zero rate, etc.).

---

## 8. Common Maintenance & Troubleshooting

### Problem: "This page couldn't load" on Vercel Dashboard
- **Check `/api/health`**: Visit `https://your-domain.vercel.app/api/health`.
- If `dbConnection` reports `tenant/user ... not found`, the **Supabase project is paused**. Log into the Supabase dashboard and click **"Restore Project"**.
- Ensure `DATABASE_URL` in Vercel settings uses the active Supabase connection string.

### Problem: Vercel Build Fails on Prisma
- Ensure the `package.json` build script is `"prisma generate && next build"`.
- Verify `prisma.config.ts` exists in the project root.

---

## 9. Next Steps / Developer Backlog

1. **Accounting Software Integrations**:
   - Exact Online API integration for Dutch general ledger syncing.
   - Moneybird or Twinfield direct exports.
2. **Direct Peppol Transmission**:
   - Connect to an authorized Peppol Access Point (e.g. Storecove, Unifiedpost) to transmit UBL 2.1 XML directly via Peppol ID.
3. **Advanced Rate Limiting**:
   - Replace the in-memory Map rate limiter in [`src/lib/api-utils.ts`](file:///c:/Users/jude/Desktop/Procinvoice/procinvoice/src/lib/api-utils.ts) with Upstash Redis for distributed multi-region serverless instances.
