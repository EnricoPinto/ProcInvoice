"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, ArrowLeft, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { BUSINESS_TYPES } from "@/lib/utils";
import { EU_COUNTRIES } from "@/lib/compliance";

const companySchema = z
  .object({
    companyName: z.string().min(2, "Company name must be at least 2 characters"),
    country: z.string().min(2, "Country is required"),
    coc: z.string().min(3, "COC/KVK registration number is required"),
    businessType: z.string().min(1, "Please select a business type"),
    vatNumber: z.string().min(3, "VAT number is required"),
    iban: z.string().min(5, "Bank/IBAN number is required"),
    address: z.string().min(5, "Address is required"),
    companyEmail: z.string().email("Enter a valid email address"),
    contactName: z.string().min(2, "Contact person name is required"),
    contactDesignation: z.string().min(1, "Designation is required"),
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
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

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
      const json = await res.json();
      if (!res.ok) {
        setServerError(json.error || "Registration failed. Please try again.");
      } else {
        router.push("/login?registered=1");
      }
    } catch {
      setServerError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field: keyof CompanyForm) =>
    `form-input${errors[field] ? " error" : ""}`;

  return (
    <div className="auth-container" style={{ alignItems: "flex-start", paddingTop: "2rem" }}>
      <div className="auth-card animate-slide-up" style={{ maxWidth: 560 }}>
        {/* Header */}
        <div style={{ marginBottom: "2rem" }}>
          <Link
            href="/register"
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
            <ArrowLeft size={16} /> Back
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div
              style={{
                width: 40,
                height: 40,
                background: "var(--primary-light)",
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--secondary)",
              }}
            >
              <Building2 size={20} />
            </div>
            <h1
              style={{
                fontSize: "1.5rem",
                fontWeight: 800,
                color: "var(--text-primary)",
                letterSpacing: "-0.02em",
              }}
            >
              Company Registration
            </h1>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Fill in your company details to create your account.
          </p>
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

              {/* Company Details Section */}
              <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: "1.25rem" }}>
                <p style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "1rem" }}>
                  Company Details
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
                    <div className="form-group">
                      <label className="form-label">Company Name *</label>
                      <input className={inputClass("companyName")} placeholder="Acme B.V." {...register("companyName")} />
                      {errors.companyName && <span className="form-error"><AlertCircle size={12} />{errors.companyName.message}</span>}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Country *</label>
                      <select className={inputClass("country")} {...register("country")}>
                        {EU_COUNTRIES.map((c) => (
                          <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                        ))}
                      </select>
                      {errors.country && <span className="form-error"><AlertCircle size={12} />{errors.country.message}</span>}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div className="form-group">
                      <label className="form-label">KVK / COC Registration No. *</label>
                      <input className={inputClass("coc")} placeholder="12345678" {...register("coc")} />
                      {errors.coc && <span className="form-error"><AlertCircle size={12} />{errors.coc.message}</span>}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Business Type *</label>
                      <select className={inputClass("businessType")} {...register("businessType")}>
                        <option value="">Select type...</option>
                        {BUSINESS_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      {errors.businessType && <span className="form-error"><AlertCircle size={12} />{errors.businessType.message}</span>}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div className="form-group">
                      <label className="form-label">VAT Number *</label>
                      <input className={inputClass("vatNumber")} placeholder="NL999999999B99" {...register("vatNumber")} />
                      {errors.vatNumber && <span className="form-error"><AlertCircle size={12} />{errors.vatNumber.message}</span>}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Bank Number / IBAN *</label>
                      <input className={inputClass("iban")} placeholder="NL91ABNA0417164300" {...register("iban")} />
                      {errors.iban && <span className="form-error"><AlertCircle size={12} />{errors.iban.message}</span>}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Business Address *</label>
                    <input className={inputClass("address")} placeholder="Keizersgracht 123, 1015 CJ Amsterdam" {...register("address")} />
                    {errors.address && <span className="form-error"><AlertCircle size={12} />{errors.address.message}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Company Email *</label>
                    <input className={inputClass("companyEmail")} type="email" placeholder="info@company.com" {...register("companyEmail")} />
                    {errors.companyEmail && <span className="form-error"><AlertCircle size={12} />{errors.companyEmail.message}</span>}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div className="form-group">
                      <label className="form-label">Contact Person Name *</label>
                      <input className={inputClass("contactName")} placeholder="John Smith" {...register("contactName")} />
                      {errors.contactName && <span className="form-error"><AlertCircle size={12} />{errors.contactName.message}</span>}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Designation *</label>
                      <input className={inputClass("contactDesignation")} placeholder="Finance Manager" {...register("contactDesignation")} />
                      {errors.contactDesignation && <span className="form-error"><AlertCircle size={12} />{errors.contactDesignation.message}</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Login Credentials Section */}
              <div>
                <p style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: "1rem" }}>
                  Login Credentials
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div className="form-group">
                    <label className="form-label">Login Email *</label>
                    <input className={inputClass("email")} type="email" placeholder="you@example.com" {...register("email")} />
                    {errors.email && <span className="form-error"><AlertCircle size={12} />{errors.email.message}</span>}
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
                        style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 0 }}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {errors.password && <span className="form-error"><AlertCircle size={12} />{errors.password.message}</span>}
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
                        style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 0 }}
                      >
                        {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {errors.confirmPassword && <span className="form-error"><AlertCircle size={12} />{errors.confirmPassword.message}</span>}
                  </div>
                </div>
              </div>

              {/* GDPR Separate Consent Checkboxes */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "0.5rem" }}>
                <label className="checkbox-wrapper">
                  <input
                    type="checkbox"
                    className="checkbox-input"
                    {...register("termsAccepted")}
                  />
                  <span className="checkbox-label">
                    I accept the <a href="#" onClick={(e) => e.preventDefault()}>Terms of Service</a>. *
                  </span>
                </label>
                {errors.termsAccepted && (
                  <span className="form-error"><AlertCircle size={12} />{errors.termsAccepted.message}</span>
                )}

                <label className="checkbox-wrapper">
                  <input
                    type="checkbox"
                    className="checkbox-input"
                    {...register("privacyAccepted")}
                  />
                  <span className="checkbox-label">
                    I agree to the <a href="#" onClick={(e) => e.preventDefault()}>Privacy Policy</a> and GDPR data processing terms. *
                  </span>
                </label>
                {errors.privacyAccepted && (
                  <span className="form-error"><AlertCircle size={12} />{errors.privacyAccepted.message}</span>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-full btn-lg"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner" /> Creating account...
                  </>
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
            fontSize: "0.9rem",
            color: "var(--text-secondary)",
          }}
        >
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--secondary)", textDecoration: "none", fontWeight: 600 }}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

