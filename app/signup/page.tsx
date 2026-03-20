"use client";

import { useState } from "react";
import { createClient } from "../../lib/supabase/client";
import { FONT, RAD, TXT, SP, CLR, GRAY, MOTION, LH } from "../../styles/tokens";
import { Button } from "../../components/ui/Button";

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
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) { setError(error.message); setLoading(false); }
    else { setSuccess(true); setLoading(false); }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px",
    border: `1px solid ${GRAY[200]}`, borderRadius: RAD.lg,
    fontSize: TXT.md, fontFamily: FONT.sans, outline: "none",
    boxSizing: "border-box", transition: `border-color ${MOTION.fast}`,
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", fontFamily: FONT.sans }}>
      {/* Left: Auth form */}
      <div style={{
        flex: "0 0 480px", display: "flex", flexDirection: "column",
        justifyContent: "center", padding: `${SP.xxxl}px 48px`,
        background: "#ffffff",
      }}>
        <div style={{ maxWidth: 360, width: "100%", margin: "0 auto" }}>
          <div style={{ marginBottom: SP.xxl }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: SP.sm }}>
              <div style={{
                width: 10, height: 10, borderRadius: "50%",
                background: CLR.success, boxShadow: `0 0 10px ${CLR.success}60`,
              }} />
              <span style={{ fontWeight: 700, fontSize: TXT.xxl, color: CLR.textPrimary, letterSpacing: "0.02em" }}>DEPT.OS</span>
            </div>
            <div style={{ fontSize: TXT.lg, color: GRAY[500], lineHeight: LH.relaxed }}>
              Create your account
            </div>
          </div>

          {success ? (
            <div style={{ textAlign: "center", padding: `${SP.xxl}px 0` }}>
              <div style={{ fontSize: 40, marginBottom: SP.lg }}>✉️</div>
              <div style={{ fontSize: TXT.xl, fontWeight: 600, color: CLR.success, marginBottom: SP.sm }}>Check your email</div>
              <div style={{ fontSize: TXT.md, color: GRAY[500], lineHeight: LH.relaxed }}>
                We sent a confirmation link to <strong style={{ color: CLR.textPrimary }}>{email}</strong>. Click it to activate your account.
              </div>
              <div style={{ marginTop: SP.xl }}>
                <a href="/login" style={{ color: CLR.primary, textDecoration: "none", fontSize: TXT.md, fontWeight: 600 }}>← Back to sign in</a>
              </div>
            </div>
          ) : (
            <>
              <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: SP.lg }}>
                <div>
                  <label style={{ fontSize: TXT.sm, color: GRAY[600], display: "block", marginBottom: SP.xs, fontWeight: 500 }}>Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    autoComplete="email" style={inputStyle}
                    onFocus={e => e.currentTarget.style.borderColor = CLR.primary}
                    onBlur={e => e.currentTarget.style.borderColor = GRAY[200]} />
                </div>
                <div>
                  <label style={{ fontSize: TXT.sm, color: GRAY[600], display: "block", marginBottom: SP.xs, fontWeight: 500 }}>Password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                    autoComplete="new-password" style={inputStyle}
                    onFocus={e => e.currentTarget.style.borderColor = CLR.primary}
                    onBlur={e => e.currentTarget.style.borderColor = GRAY[200]} />
                </div>
                <div>
                  <label style={{ fontSize: TXT.sm, color: GRAY[600], display: "block", marginBottom: SP.xs, fontWeight: 500 }}>Confirm password</label>
                  <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
                    autoComplete="new-password" style={inputStyle}
                    onFocus={e => e.currentTarget.style.borderColor = CLR.primary}
                    onBlur={e => e.currentTarget.style.borderColor = GRAY[200]} />
                </div>

                {error && (
                  <div style={{
                    fontSize: TXT.sm, color: CLR.danger,
                    background: "#fef2f2", border: "1px solid #fecaca",
                    borderRadius: RAD.lg, padding: "10px 14px", lineHeight: LH.normal,
                  }}>
                    {error}
                  </div>
                )}

                <Button variant="primary" size="lg" loading={loading}
                  style={{ width: "100%", background: CLR.primary, borderColor: CLR.primary }}
                  onClick={() => {}}>
                  {loading ? "Creating account..." : "Create account"}
                </Button>
              </form>

              <div style={{ textAlign: "center", marginTop: SP.xl, fontSize: TXT.sm, color: GRAY[500] }}>
                Already have an account?{" "}
                <a href="/login" style={{ color: CLR.primary, textDecoration: "none", fontWeight: 600 }}>Sign in</a>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right: Same hero as login */}
      <div style={{
        flex: 1, background: GRAY[900],
        display: "flex", flexDirection: "column",
        justifyContent: "center", alignItems: "center",
        padding: SP.xxxl, position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", width: 400, height: 400, borderRadius: "50%",
          background: `radial-gradient(circle, ${CLR.success}20, transparent 70%)`,
          top: "30%", left: "40%", transform: "translate(-50%, -50%)",
          filter: "blur(60px)",
        }} />
        <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: 480 }}>
          <div style={{
            fontSize: TXT.stat, fontWeight: 700, color: "#ffffff",
            fontFamily: FONT.sans, marginBottom: SP.lg, lineHeight: LH.tight,
          }}>
            Institutional intelligence,<br />
            <span style={{ color: CLR.success }}>powered by AI.</span>
          </div>
          <div style={{
            fontSize: TXT.md, color: GRAY[400], fontFamily: FONT.sans,
            lineHeight: LH.relaxed, maxWidth: 380, margin: "0 auto",
          }}>
            Map roles, workflows, and sensors for any institution. Identify where AI can supercharge or shortcircuit work. Design and deploy agents.
          </div>
        </div>
      </div>
    </div>
  );
}
