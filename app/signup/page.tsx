"use client";

import { useState } from "react";
import { createClient } from "../../lib/supabase/client";
import { FONT, RAD, TXT, SP, CLR } from "../../styles/tokens";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8f9fb", fontFamily: FONT.sans }}>
      <div style={{ width: 360, background: "#ffffff", border: `1px solid ${CLR.borderDefault}`, borderRadius: RAD.xl, padding: SP.xxl, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <div style={{ textAlign: "center", marginBottom: SP.xl }}>
          <div style={{ fontSize: TXT.xl, fontWeight: 700, color: CLR.textPrimary, letterSpacing: "0.02em" }}>DEPT.OS</div>
          <div style={{ fontSize: TXT.md, color: CLR.textSecondary, marginTop: SP.xs }}>Create your account</div>
        </div>

        {success ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: TXT.lg, color: "#16a34a", marginBottom: SP.sm }}>Check your email</div>
            <div style={{ fontSize: TXT.sm, color: CLR.textSecondary, lineHeight: 1.6 }}>
              We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
            </div>
            <div style={{ marginTop: SP.lg, fontSize: TXT.sm, color: CLR.textMuted }}>
              <a href="/login" style={{ color: "#3b82f6", textDecoration: "none" }}>Back to sign in</a>
            </div>
          </div>
        ) : (
          <>
            <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: SP.md }}>
              <div>
                <label style={{ fontSize: TXT.sm, color: CLR.textSecondary, display: "block", marginBottom: SP.xs }}>Email</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  style={{ width: "100%", padding: `${SP.sm}px ${SP.md}px`, border: `1px solid ${CLR.borderDefault}`, borderRadius: RAD.sm, fontSize: TXT.md, fontFamily: FONT.sans, outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ fontSize: TXT.sm, color: CLR.textSecondary, display: "block", marginBottom: SP.xs }}>Password</label>
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)} required
                  style={{ width: "100%", padding: `${SP.sm}px ${SP.md}px`, border: `1px solid ${CLR.borderDefault}`, borderRadius: RAD.sm, fontSize: TXT.md, fontFamily: FONT.sans, outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ fontSize: TXT.sm, color: CLR.textSecondary, display: "block", marginBottom: SP.xs }}>Confirm password</label>
                <input
                  type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
                  style={{ width: "100%", padding: `${SP.sm}px ${SP.md}px`, border: `1px solid ${CLR.borderDefault}`, borderRadius: RAD.sm, fontSize: TXT.md, fontFamily: FONT.sans, outline: "none", boxSizing: "border-box" }}
                />
              </div>

              {error && (
                <div style={{ fontSize: TXT.sm, color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: RAD.sm, padding: `${SP.xs}px ${SP.sm}px` }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading}
                style={{ padding: `${SP.sm}px ${SP.md}px`, background: loading ? "#94a3b8" : "#1e293b", color: "#ffffff", border: "none", borderRadius: RAD.sm, fontSize: TXT.md, fontFamily: FONT.sans, fontWeight: 600, cursor: loading ? "default" : "pointer", transition: "background 0.15s" }}>
                {loading ? "Creating account…" : "Create account"}
              </button>
            </form>

            <div style={{ textAlign: "center", marginTop: SP.lg, fontSize: TXT.sm, color: CLR.textMuted }}>
              Already have an account?{" "}
              <a href="/login" style={{ color: "#3b82f6", textDecoration: "none" }}>Sign in</a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
