# ProcInvoice — Developer Handover & Technical Specification Document

**Project Name**: ProcInvoice  
**Repository**: [https://github.com/EnricoPinto/ProcInvoice.git](https://github.com/EnricoPinto/ProcInvoice.git)  
**Main Branch**: `master`  
**Production URL**: [https://proc-invoice.vercel.app](https://proc-invoice.vercel.app)  
**Document Version**: 1.0 (November 2026)  

---

## 1. Executive Summary & Business Purpose

**ProcInvoice** is a web-based automated B2B invoice processing and compliance platform built for Dutch and EU corporate accounts.

### Key Capabilities:
1. **Document Ingestion & Classification**: Users upload invoice files (PDFs, PNG, JPEG). The platform automatically classifies each document as either:
   - **`Factuur`** (Official commercial invoice eligible for accounting export).
   - **`Overige document`** (Receipt, quote, packing slip, or non-invoice document — UBL export disabled).
2. **Hybrid OCR & AI Extraction**:
   - Digital PDFs are parsed with high throughput using `pdf-parse`.
   - Scanned PDFs and images are processed using **Google Gemini Flash** (multimodal structured output) with fallback to Google Cloud Vision.
   - Text is run through an admin-configurable dynamic keyword matching and regex engine.
3. **Interactive Side-by-Side Review Screen**:
   - Split-screen layout displaying the source document on the left and the editable extracted form fields on the right.
   - Line-item editor supporting descriptions, quantities, unit prices, net amounts, gross amounts, and per-line VAT percentages.
4. **Multi-VAT Support**:
   - Handles invoices with mixed tax brackets (e.g. 21% standard, 9% reduced, 0% zero-rated).
   - Automatically computes per-rate tax subtotals and totals.
5. **UBL 2.1 XML Export (Peppol BIS Billing 3.0 / EN 16931)**:
   - Exports certified electronic invoice XML with grouped `<cac:TaxSubtotal>` categories, ready for EU government and enterprise ERP systems.
6. **Company-Only Account & GDPR Compliance**:
   - Enforces company registration with Dutch Chamber of Commerce (KVK) or European VAT validation.
   - Field-level AES-256-GCM encryption for stored tax identifiers, IBANs, and contact information.
   - Comprehensive ISO 27001 audit trail, GDPR Article 20 data export, and session inactivity auto-logout.

---

## 2. Tech Stack Overview

| Layer | Technology | Details |
|---|---|---|
| **Fullstack Framework** | **Next.js 16.3.2** (App Router, Turbopack) | Server Components & Route Handlers |
| **User Interface** | **React 19.2.8** | Responsive design with Lucide icons |
| **Language** | **TypeScript 5.x** | Strict type-safety across all routes |
| **Database** | **PostgreSQL 15+** | Hosted on Supabase |
| **Database ORM** | **Prisma 7.9.1** | Uses `@prisma/adapter-pg` driver adapter |
| **Authentication** | **NextAuth.js (Auth.js) v5 beta 32** | JWT strategy, role-based authorization |
| **Password Security** | **bcryptjs 3.0.3** | Salt rounds = 10 |
| **OCR & AI Extraction** | **Google Gemini Flash & pdf-parse** | Multimodal structured JSON extraction |
| **Data Encryption** | **AES-256-GCM (Node.js crypto)** | Envelope encryption with key versioning (`v1`) |
| **Styling** | **Tailwind CSS v4** | Modular CSS variables & glassmorphism theme |
| **Deployment** | **Vercel** | Serverless Node.js runtime |

---

## 3. GitHub & Security Status

- **Remote URL**: `https://github.com/EnricoPinto/ProcInvoice.git`
- **Branch**: `master`
- **Synchronization**: Up to date. All recent fixes, logo assets, multi-VAT calculations, and diagnostic endpoints are pushed.
- **Security Audit**:
  - The real `.env` file is excluded via `.gitignore` and has **never been committed to Git**.
  - All database passwords, encryption keys, JWT secrets, and AI API keys have been verified absent from Git commit history.
  - A sanitized template is provided in [`.env.example`](file:///c:/Users/jude/Desktop/Procinvoice/procinvoice/.env.example).

---

## 4. Environment Variables Checklist

Incoming developers must create a `.env` file in `procinvoice/` based on [`.env.example`](file:///c:/Users/jude/Desktop/Procinvoice/procinvoice/.env.example).

```ini
# ==============================================================================
# ProcInvoice - Environment Variables Template
# ==============================================================================

# 1. Database (PostgreSQL / Supabase)
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"

# 2. Authentication (NextAuth v5)
NEXTAUTH_SECRET="your-32-byte-base64-secret"
NEXTAUTH_URL="http://localhost:3005"
AUTH_TRUST_HOST="true"

# 3. Field-Level Encryption (AES-256-GCM)
FIELD_ENCRYPTION_KEY="your-64-character-hex-encryption-key"
KEY_VERSION="v1"

# 4. OCR & AI Structured Extraction
GEMINI_API_KEY="your-gemini-api-key"
# GOOGLE_VISION_API_KEY="optional-fallback-key"

# 5. File Storage (Optional - Database blob storage used by default)
# STORAGE_BUCKET_URL="https://[PROJECT_REF].supabase.co/storage/v1"
# STORAGE_ACCESS_KEY="your-storage-service-role-key"
# STORAGE_BUCKET_NAME="invoices"

# 6. Application & Branding
NEXT_PUBLIC_APP_URL="http://localhost:3005"
SUPPORT_ADMIN_EMAIL="support@procinvoice.example"
NEXT_PUBLIC_SUPPORT_EMAIL="support@procinvoice.example"
```

### How to Generate & Obtain Each Secret:

1. **`DATABASE_URL` & `DIRECT_URL`**:
   - Log into [Supabase Dashboard](https://supabase.com/dashboard) → Select Project → **Project Settings** → **Database**.
   - Under **Connection Pooling**, copy the connection string for **Transaction Mode (Port 6543)** and assign to `DATABASE_URL`.
   - Under **Direct Connection**, copy the connection string for **Session Mode (Port 5432)** and assign to `DIRECT_URL`.
   - *Note*: If the Supabase project has been idle for > 7 days, click **"Restore Project"** in the Supabase Dashboard to unpause it.
2. **`NEXTAUTH_SECRET`**:
   - Run in your terminal:
     ```bash
     openssl rand -base64 32
     ```
3. **`FIELD_ENCRYPTION_KEY`**:
   - Must be a 32-byte hex string (64 characters). Run:
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```
4. **`GEMINI_API_KEY`**:
   - Obtain free of charge with no credit card required at [Google AI Studio](https://aistudio.google.com/).

---

## 5. Developer Quickstart Guide

### 1. Clone the Repository
```bash
git clone https://github.com/EnricoPinto/ProcInvoice.git
cd ProcInvoice/procinvoice
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
```bash
cp .env.example .env
# Open .env in your editor and enter the real database credentials and keys.
```

### 4. Initialize Database & Prisma Client
```bash
# Generate the Prisma 7 client:
npx prisma generate

# Push schema directly to your PostgreSQL database:
npx prisma db push
```

### 5. Run the Local Development Server
```bash
npm run dev
```
The application will start on **`http://localhost:3005`**.

---

## 6. Codebase Architecture & File Structure

```
procinvoice/
├── prisma/
│   ├── schema.prisma             # Data models: User, CompanyProfile, Invoice, KeywordRule, etc.
│   └── migrations/               # Prisma migration files
├── prisma.config.ts              # Prisma 7 configuration file (database URLs)
├── public/
│   ├── logo/                     # Official brand logos (circular, icon-only, horizontal)
│   └── favicon.*                 # Complete favicon suite
└── src/
    ├── app/                      # Next.js 16 App Router
    │   ├── (auth)/               # Unauthenticated auth pages (/login, /register/company)
    │   ├── (dashboard)/          # Protected workspace pages
    │   │   ├── dashboard/        # Welcome overview, KPI cards, recent invoice table
    │   │   ├── upload/           # Invoice upload dropzone with multi-page alerts
    │   │   ├── invoices/         # Invoice list, search, filter, pagination, status badges
    │   │   │   └── [id]/         # Side-by-side invoice review & UBL XML export
    │   │   ├── admin/            # Admin control panels
    │   │   │   ├── keyword-rules/    # Dynamic extraction keywords (headers & columns)
    │   │   │   ├── validation-rules/ # VAT, IBAN, KVK validation format rules
    │   │   │   ├── accounts/         # User administration & role toggles
    │   │   │   └── security/         # ISO 27001 audit logs & login telemetry
    │   │   └── settings/         # Profile, retention preferences, GDPR export, active sessions
    │   ├── api/                  # API endpoints
    │   │   ├── auth/[...nextauth]/   # NextAuth login/logout route
    │   │   ├── health/               # Diagnostic health check (/api/health)
    │   │   ├── upload/               # Ingest route: file validation, blob storage, OCR trigger
    │   │   ├── invoices/[id]/        # Update extracted fields, fetch file, export UBL XML
    │   │   └── admin/                # CRUD endpoints for admin rules and accounts
    │   └── layout.tsx            # Root layout with OpenGraph metadata and theme wrappers
    ├── components/
    │   ├── invoice/
    │   │   ├── EditableResults.tsx   # Core form editor, line items, and Multi-VAT calculator
    │   │   ├── PdfViewer.tsx         # Inline PDF preview renderer
    │   │   └── StatusBadge.tsx       # Status indicator (Processed, Manual Entry, Failed)
    │   ├── dashboard/
    │   │   ├── Sidebar.tsx           # Collapsible sidebar with active route highlighting
    │   │   └── Breadcrumbs.tsx       # One-click navigation back to Dashboard / My Invoices
    │   └── common/
    │       └── BrandLogo.tsx         # Scalable official ProcInvoice logo component
    ├── lib/
    │   ├── auth.ts               # NextAuth configuration, credentials provider, JWT callbacks
    │   ├── prisma.ts             # PrismaPg driver adapter initialization
    │   ├── ocr.ts                # OCR pipeline: pdf-parse text extraction + Gemini AI parser
    │   ├── google-vision.ts      # Google Gemini / Vision REST API clients
    │   ├── keyword-extractor.ts  # Fallback rule-based keyword & column matching engine
    │   ├── ubl-generator.ts      # Validated Peppol BIS 3.0 UBL 2.1 XML builder
    │   ├── encryption.ts         # AES-256-GCM field encryption/decryption utilities
    │   └── branding.ts           # Centralized brand constants & support mailto generator
    └── proxy.ts                  # Next.js route protection & session middleware
```

---

## 7. Key Business Logic & Implementation Rules

### 1. Company-Only Account Model
- All users belong to `AccountType.COMPANY`. The `INDIVIDUAL` registration path was intentionally removed.
- Registration requires: Contact Person Name, Country, Business Type, Email, and **at least one of KVK/COC number OR VAT number** (conditional requirement).
- Any attempt to query `prisma.individualProfile` in new code must be avoided.

### 2. Line-Item Table Column Keyword Extraction
- The `KeywordRule` model handles two distinct scopes:
  - `ruleType: "documentField"`: Matches top-level invoice metadata (e.g. invoice date, invoice number).
  - `ruleType: "lineItemColumn"`: Matches table header column titles (`Omschrijving`, `Aantal`, `Netto`, `Bruto`, `BTW`).
- **Netto vs. Bruto**:
  - `Netto` represents tax-exclusive amounts.
  - `Bruto` represents tax-inclusive amounts.
  - If both appear, both are captured per line item to prevent calculation discrepancies.

### 3. Multi-VAT Calculation & UBL 2.1 Serialization
- Dutch/EU invoices frequently combine 21% (high), 9% (low), and 0% (exempt) VAT rates on the same invoice.
- `EditableResults.tsx` dynamically groups line items by VAT rate and displays a breakdown card per tax bracket.
- When generating UBL 2.1 XML ([`src/lib/ubl-generator.ts`](file:///c:/Users/jude/Desktop/Procinvoice/procinvoice/src/lib/ubl-generator.ts)), each distinct tax rate is output as its own `<cac:TaxSubtotal>` block with appropriate Peppol tax category codes (`S` for standard, `Z` for zero-rated).

### 4. Prisma 7 Configuration with Supabase
- Prisma 7 moves connection URLs from `schema.prisma` to `prisma.config.ts`.
- When running in serverless environments (Vercel), `DATABASE_URL` must point to the **Supabase Transaction Pooler (port 6543)**. The direct connection (port 5432) will exhaust PostgreSQL client connections under load.

### 5. Graceful Manual Entry Fallback
- If an uploaded document is low-quality, blurry, or password-protected, the OCR pipeline marks the invoice status as **`MANUAL_ENTRY`** with a descriptive `failureReason`.
- The user is seamlessly presented with the side-by-side review screen so they can transcribe the details manually rather than experiencing a total failure.

---

## 8. Deployment on Vercel

1. Push your changes to the GitHub repository on branch `master`.
2. In the [Vercel Dashboard](https://vercel.com/):
   - Link the `ProcInvoice` repository.
   - Under **Project Settings** → **Environment Variables**, configure all variables from Section 4.
   - Build Command: `prisma generate && next build`
   - Output Directory: `.next`
3. After deployment, verify system health by visiting:
   ```
   https://[YOUR-VERCEL-DOMAIN]/api/health
   ```
   Expected response:
   ```json
   {
     "status": "ok",
     "dbConnection": "connected",
     "envChecks": {
       "DATABASE_URL": true,
       "DIRECT_URL": true,
       "NEXTAUTH_SECRET": true,
       "FIELD_ENCRYPTION_KEY": true,
       "GEMINI_API_KEY": true,
       "NODE_ENV": "production",
       "VERCEL": true,
       "DB_HOST": "aws-0-ap-south-1.pooler.supabase.com"
     }
   }
   ```

---

## 9. Recommended Next Steps / Roadmap for New Developers

1. **Accounting Software API Connectors**:
   - Dutch market: Direct sync with **Exact Online**, **Moneybird**, and **Twinfield**.
2. **Direct Peppol Network Transmission**:
   - Integrate an authorized Peppol Access Point provider (e.g. Storecove or UnifiedPost) to transmit UBL 2.1 XML directly over the Peppol network.
3. **Distributed Rate Limiting**:
   - Upgrade the current in-memory rate limiter in [`src/lib/api-utils.ts`](file:///c:/Users/jude/Desktop/Procinvoice/procinvoice/src/lib/api-utils.ts) to Upstash Redis for distributed multi-instance deployment.
