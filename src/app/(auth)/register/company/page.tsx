"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, ArrowLeft, AlertCircle, CheckCircle2, Eye, EyeOff, Info } from "lucide-react";
import { BUSINESS_TYPES } from "@/lib/utils";
import { EU_COUNTRIES } from "@/lib/compliance";
import { BrandLogo } from "@/components/common/BrandLogo";

const companySchema = z
  .object({
    contactName: z.string().min(2, "Contact person name is required"),
    country: z.string().min(2, "Country is required"),
    businessType: z.string().min(1, "Please select a business type"),
    email: z.string().email("Enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain an uppercase letter")
      .regex(/[0-9]/, "Must contain a number"),
    confirmPassword: z.string(),
    termsAccepted: z.boolean().refine((v) => v === true, {
      message: "You must accept the Terms of Service",
    }),
    privacyAccepted: z.boolean().refine((v) => v === true, {
      message: "You must accept the Privacy Policy & GDPR Data Processing terms",
    }),

    // Conditional: At least one of coc or vatNumber is required
    coc: z.string().optional(),
    vatNumber: z.string().optional(),

    // Optional fields
    companyName: z.string().optional(),
    iban: z.string().optional(),
    address: z.string().optional(),
    companyEmail: z.string().optional(),
    contactDesignation: z.string().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine(
    (d) =>
      (typeof d.coc === "string" && d.coc.trim().length > 0) ||
      (typeof d.vatNumber === "string" && d.vatNumber.trim().length > 0),
    {
      message: "Please provide at least one: KVK/COC number OR VAT number",
      path: ["coc"],
    }
  );

type CompanyForm = z.infer<typeof companySchema>;

export default function CompanyRegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompanyForm>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      country: "NL",
      businessType: "BV",
      coc: "",
      vatNumber: "",
      companyName: "",
      iban: "",
      address: "",
      companyEmail: "",
      contactDesignation: "",
    },
  });

  const onSubmit = async (data: CompanyForm) => {
    setLoading(true);
    setServerError("");
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, accountType: "COMPANY" }),
      });
      let json: { error?: string } = {};
      try {
        json = await res.json();
      } catch {
        // empty response
      }
      if (!res.ok) {
        setServerError(
          json.error ||
            `Server error (${res.status}). Please check database & environment settings.`
        );
      } else {
        router.push("/login?registered=1");
      }
    } catch (fetchErr) {
      setServerError(
        (fetchErr as Error)?.message || "Network error. Please check your connection."
      );
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field: keyof CompanyForm) =>
    `form-input${errors[field] ? " error" : ""}`;

  return (
    <div className="auth-container" style={{ alignItems: "flex-start", paddingTop: "2rem" }}>
      <div className="auth-card animate-slide-up" style={{ maxWidth: 580 }}>
        {/* Header */}
        <div style={{ marginBottom: "2rem" }}>
          <Link
            href="/login"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: "var(--text-secondary)",
              textDecoration: "none",
              fontSize: "0.875rem",
              marginBottom: "1.25rem",
              transition: "color var(--transition)",
            }}
          >
            <ArrowLeft size={16} /> Back to Sign In
          </Link>

          <div style={{ textAlign: "center", marginBottom: "1rem" }}>
            <div style={{ display: "inline-flex", justifyContent: "center", marginBottom: "0.75rem" }}>
              <BrandLogo variant="full" size={72} />
            </div>
            <h1
              style={{
                fontSize: "1.6rem",
                fontWeight: 800,
                color: "var(--text-primary)",
                letterSpacing: "-0.02em",
                margin: "0 0 6px 0",
              }}
            >
              Create Company Account
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: 0 }}>
              Register your business account to start scanning and processing invoices.
            </p>
          </div>
        </div>

        <div className="glass-card" style={{ padding: "2rem" }}>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {serverError && (
                <div className="alert alert-error">
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                  {serverError}
                </div>
              )}

              {/* Mandatory Contact & Business Info */}
              <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: "1.25rem" }}>
                <p
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "var(--text-muted)",
                    marginBottom: "1rem",
                  }}
                >
                  Primary Account Details (Mandatory)
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div className="form-group">
                      <label className="form-label">Contact Person Name *</label>
                      <input
                        className={inputClass("contactName")}
                        placeholder="e.g. Willem Jansen"
                        {...register("contactName")}
                      />
                      {errors.contactName && (
                        <span className="form-error">
                          <AlertCircle size={12} />
                          {errors.contactName.message}
                        </span>
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Country *</label>
                      <select className={inputClass("country")} {...register("country")}>
                        {EU_COUNTRIES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.name} ({c.code})
                          </option>
                        ))}
                      </select>
                      {errors.country && (
                        <span className="form-error">
                          <AlertCircle size={12} />
                          {errors.country.message}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div className="form-group">
                      <label className="form-label">Business Type *</label>
                      <select className={inputClass("businessType")} {...register("businessType")}>
                        <option value="">Select type...</option>
                        {BUSINESS_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                      {errors.businessType && (
                        <span className="form-error">
                          <AlertCircle size={12} />
                          {errors.businessType.message}
                        </span>
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Company Name (Optional)</label>
                      <input
                        className={inputClass("companyName")}
                        placeholder="Leave blank to use Contact Name"
                        {...register("companyName")}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Conditional Registration / Tax IDs */}
              <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <p
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: "var(--text-muted)",
                    }}
                  >
                    Business Verification (At least one required)
                  </p>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: "0.8125rem",
                    color: "var(--secondary)",
                    marginBottom: "1rem",
                    background: "rgba(99,102,241,0.08)",
                    padding: "6px 12px",
                    borderRadius: 8,
                  }}
                >
                  <Info size={14} /> Provide at least one: KVK/COC number OR VAT number
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="form-group">
                    <label className="form-label">KVK / COC Registration No.</label>
                    <input
                      className={inputClass("coc")}
                      placeholder="e.g. 12345678"
                      {...register("coc")}
                    />
                    {errors.coc && (
                      <span className="form-error">
                        <AlertCircle size={12} />
                        {errors.coc.message}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">VAT / BTW Number</label>
                    <input
                      className={inputClass("vatNumber")}
                      placeholder="e.g. NL123456789B01"
                      {...register("vatNumber")}
                    />
                    {errors.vatNumber && (
                      <span className="form-error">
                        <AlertCircle size={12} />
                        {errors.vatNumber.message}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Optional Company Details */}
              <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: "1.25rem" }}>
                <p
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "var(--text-muted)",
                    marginBottom: "1rem",
                  }}
                >
                  Additional Information (Optional)
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div className="form-group">
                      <label className="form-label">Bank Number / IBAN (Optional)</label>
                      <input
                        className={inputClass("iban")}
                        placeholder="NL91ABNA0417164300"
                        {...register("iban")}
                      />
                      {errors.iban && (
                        <span className="form-error">
                          <AlertCircle size={12} />
                          {errors.iban.message}
                        </span>
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Contact Designation (Optional)</label>
                      <input
                        className={inputClass("contactDesignation")}
                        placeholder="e.g. Director / Owner"
                        {...register("contactDesignation")}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Business Address (Optional)</label>
                    <input
                      className={inputClass("address")}
                      placeholder="e.g. Keizersgracht 123, 1015 CJ Amsterdam"
                      {...register("address")}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Company Public Email (Optional)</label>
                    <input
                      className={inputClass("companyEmail")}
                      type="email"
                      placeholder="e.g. invoices@company.nl"
                      {...register("companyEmail")}
                    />
                  </div>
                </div>
              </div>

              {/* Login Credentials Section */}
              <div>
                <p
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "var(--text-muted)",
                    marginBottom: "1rem",
                  }}
                >
                  Login Credentials (Mandatory)
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div className="form-group">
                    <label className="form-label">Account Email *</label>
                    <input
                      className={inputClass("email")}
                      type="email"
                      placeholder="you@company.com"
                      {...register("email")}
                    />
                    {errors.email && (
                      <span className="form-error">
                        <AlertCircle size={12} />
                        {errors.email.message}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Password *</label>
                    <div style={{ position: "relative" }}>
                      <input
                        className={inputClass("password")}
                        type={showPassword ? "text" : "password"}
                        placeholder="Min. 8 chars, 1 uppercase, 1 number"
                        style={{ paddingRight: "2.75rem" }}
                        {...register("password")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((p) => !p)}
                        style={{
                          position: "absolute",
                          right: 12,
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "none",
                          border: "none",
                          color: "var(--text-muted)",
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {errors.password && (
                      <span className="form-error">
                        <AlertCircle size={12} />
                        {errors.password.message}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Confirm Password *</label>
                    <div style={{ position: "relative" }}>
                      <input
                        className={inputClass("confirmPassword")}
                        type={showConfirm ? "text" : "password"}
                        placeholder="Repeat your password"
                        style={{ paddingRight: "2.75rem" }}
                        {...register("confirmPassword")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((p) => !p)}
                        style={{
                          position: "absolute",
                          right: 12,
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "none",
                          border: "none",
                          color: "var(--text-muted)",
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <span className="form-error">
                        <AlertCircle size={12} />
                        {errors.confirmPassword.message}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Consents */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                  paddingTop: "0.5rem",
                  borderTop: "1px solid var(--border)",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  <input
                    type="checkbox"
                    style={{ marginTop: 3, accentColor: "var(--secondary)" }}
                    {...register("termsAccepted")}
                  />
                  <span>
                    I agree to the{" "}
                    <span style={{ color: "var(--secondary)" }}>Terms of Service</span>.
                  </span>
                </label>
                {errors.termsAccepted && (
                  <span className="form-error">
                    <AlertCircle size={12} />
                    {errors.termsAccepted.message}
                  </span>
                )}

                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  <input
                    type="checkbox"
                    style={{ marginTop: 3, accentColor: "var(--secondary)" }}
                    {...register("privacyAccepted")}
                  />
                  <span>
                    I consent to the{" "}
                    <span style={{ color: "var(--secondary)" }}>Privacy Policy</span> and GDPR
                    data processing.
                  </span>
                </label>
                {errors.privacyAccepted && (
                  <span className="form-error">
                    <AlertCircle size={12} />
                    {errors.privacyAccepted.message}
                  </span>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="btn btn-primary btn-lg"
                style={{ width: "100%", marginTop: "0.5rem" }}
                disabled={loading}
              >
                {loading ? (
                  <span className="spinner" />
                ) : (
                  <>
                    <CheckCircle2 size={18} /> Create Company Account
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        <div
          style={{
            textAlign: "center",
            marginTop: "1.5rem",
            fontSize: "0.875rem",
            color: "var(--text-secondary)",
          }}
        >
          Already have an account?{" "}
          <Link
            href="/login"
            style={{ color: "var(--secondary)", textDecoration: "none", fontWeight: 600 }}
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
