"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import { FONT, RAD, TXT, SP, CLR } from "../../styles/tokens";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8f9fb", fontFamily: FONT.sans }}>
      <div style={{ width: 360, background: "#ffffff", border: `1px solid ${CLR.borderDefault}`, borderRadius: RAD.xl, padding: SP.xxl, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <div style={{ textAlign: "center", marginBottom: SP.xl }}>
          <div style={{ fontSize: TXT.xl, fontWeight: 700, color: CLR.textPrimary, letterSpacing: "0.02em" }}>DEPT.OS</div>
          <div style={{ fontSize: TXT.md, color: CLR.textSecondary, marginTop: SP.xs }}>Sign in to your account</div>
        </div>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: SP.md }}>
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

          {error && (
            <div style={{ fontSize: TXT.sm, color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: RAD.sm, padding: `${SP.xs}px ${SP.sm}px` }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            style={{ padding: `${SP.sm}px ${SP.md}px`, background: loading ? "#94a3b8" : "#1e293b", color: "#ffffff", border: "none", borderRadius: RAD.sm, fontSize: TXT.md, fontFamily: FONT.sans, fontWeight: 600, cursor: loading ? "default" : "pointer", transition: "background 0.15s" }}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: SP.lg, fontSize: TXT.sm, color: CLR.textMuted }}>
          Don&apos;t have an account?{" "}
          <a href="/signup" style={{ color: "#3b82f6", textDecoration: "none" }}>Sign up</a>
        </div>
      </div>
    </div>
  );
}
