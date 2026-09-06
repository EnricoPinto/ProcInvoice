"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User, ArrowLeft, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";

const individualSchema = z
  .object({
    fullName: z.string().min(2, "Full name must be at least 2 characters"),
    address: z.string().min(5, "Address is required"),
    iban: z.string().optional(),
    email: z.string().email("Enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain an uppercase letter")
      .regex(/[0-9]/, "Must contain a number"),
    confirmPassword: z.string(),
    disclaimer: z.boolean().refine((v) => v === true, {
      message: "You must accept the terms to continue",
    }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type IndividualForm = z.infer<typeof individualSchema>;

export default function IndividualRegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<IndividualForm>({ resolver: zodResolver(individualSchema) });

  const onSubmit = async (data: IndividualForm) => {
    setLoading(true);
    setServerError("");
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          termsAccepted: data.disclaimer,
          privacyAccepted: data.disclaimer,
          iban: data.iban?.trim() || undefined,
          accountType: "INDIVIDUAL",
        }),
      });
      let json: { error?: string } = {};
      try {
        json = await res.json();
      } catch {
        // empty response
      }
      if (!res.ok) {
        setServerError(json.error || `Server error (${res.status}). Please check database & environment settings.`);
      } else {
        router.push("/login?registered=1");
      }
    } catch (fetchErr) {
      setServerError((fetchErr as Error)?.message || "Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field: keyof IndividualForm) =>
    `form-input${errors[field] ? " error" : ""}`;

  return (
    <div className="auth-container">
      <div className="auth-card animate-slide-up" style={{ maxWidth: 480 }}>
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
            }}
          >
            <ArrowLeft size={16} /> Back
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div
              style={{
                width: 40,
                height: 40,
                background: "var(--accent-light)",
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent)",
              }}
            >
              <User size={20} />
            </div>
            <h1
              style={{
                fontSize: "1.5rem",
                fontWeight: 800,
                color: "var(--text-primary)",
                letterSpacing: "-0.02em",
              }}
            >
              Individual Registration
            </h1>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Create your personal account to start processing invoices.
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

              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className={inputClass("fullName")} placeholder="Jane Doe" {...register("fullName")} />
                {errors.fullName && <span className="form-error"><AlertCircle size={12} />{errors.fullName.message}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Address *</label>
                <input className={inputClass("address")} placeholder="123 Main St, City, Country" {...register("address")} />
                {errors.address && <span className="form-error"><AlertCircle size={12} />{errors.address.message}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">
                  Bank Number / IBAN{" "}
                  <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(optional)</span>
                </label>
                <input className="form-input" placeholder="NL91ABNA0417164300" {...register("iban")} />
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Only required if you submit invoices for reimbursement
                </span>
              </div>

              <div className="divider">Login Credentials</div>

              <div className="form-group">
                <label className="form-label">Email Address *</label>
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
                  <button type="button" onClick={() => setShowPassword((p) => !p)}
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
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
                  <button type="button" onClick={() => setShowConfirm((p) => !p)}
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.confirmPassword && <span className="form-error"><AlertCircle size={12} />{errors.confirmPassword.message}</span>}
              </div>

              <label className="checkbox-wrapper">
                <input type="checkbox" className="checkbox-input" {...register("disclaimer")} />
                <span className="checkbox-label">
                  I agree to the{" "}
                  <a href="/terms" target="_blank">Terms of Service</a>{" "}
                  and{" "}
                  <a href="/privacy" target="_blank">Privacy Policy</a>.
                </span>
              </label>
              {errors.disclaimer && (
                <span className="form-error"><AlertCircle size={12} />{errors.disclaimer.message}</span>
              )}

              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                {loading ? (
                  <><span className="spinner" /> Creating account...</>
                ) : (
                  <><CheckCircle2 size={18} /> Create Individual Account</>
                )}
              </button>
            </div>
          </form>
        </div>

        <div style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "var(--secondary)", textDecoration: "none", fontWeight: 600 }}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
