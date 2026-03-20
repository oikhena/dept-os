"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import { FONT, RAD, TXT, SP, CLR, GRAY, MOTION, SHADOW, LH } from "../../styles/tokens";
import { Button } from "../../components/ui/Button";

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
    <div style={{
      minHeight: "100vh", display: "flex",
      fontFamily: FONT.sans,
    }}>
      {/* Left: Auth form */}
      <div style={{
        flex: "0 0 480px", display: "flex", flexDirection: "column",
        justifyContent: "center", padding: `${SP.xxxl}px 48px`,
        background: "#ffffff",
      }}>
        <div style={{ maxWidth: 360, width: "100%", margin: "0 auto" }}>
          {/* Logo */}
          <div style={{ marginBottom: SP.xxl }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: SP.sm }}>
              <div style={{
                width: 10, height: 10, borderRadius: "50%",
                background: CLR.success, boxShadow: `0 0 10px ${CLR.success}60`,
              }} />
              <span style={{ fontWeight: 700, fontSize: TXT.xxl, color: CLR.textPrimary, letterSpacing: "0.02em" }}>DEPT.OS</span>
            </div>
            <div style={{ fontSize: TXT.lg, color: GRAY[500], lineHeight: LH.relaxed }}>
              Sign in to your account
            </div>
          </div>

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: SP.lg }}>
            <div>
              <label style={{ fontSize: TXT.sm, color: GRAY[600], display: "block", marginBottom: SP.xs, fontWeight: 500 }}>Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                autoComplete="email"
                style={{
                  width: "100%", padding: "10px 14px",
                  border: `1px solid ${GRAY[200]}`, borderRadius: RAD.lg,
                  fontSize: TXT.md, fontFamily: FONT.sans, outline: "none",
                  boxSizing: "border-box",
                  transition: `border-color ${MOTION.fast}`,
                }}
                onFocus={e => e.currentTarget.style.borderColor = CLR.primary}
                onBlur={e => e.currentTarget.style.borderColor = GRAY[200]}
              />
            </div>
            <div>
              <label style={{ fontSize: TXT.sm, color: GRAY[600], display: "block", marginBottom: SP.xs, fontWeight: 500 }}>Password</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)} required
                autoComplete="current-password"
                style={{
                  width: "100%", padding: "10px 14px",
                  border: `1px solid ${GRAY[200]}`, borderRadius: RAD.lg,
                  fontSize: TXT.md, fontFamily: FONT.sans, outline: "none",
                  boxSizing: "border-box",
                  transition: `border-color ${MOTION.fast}`,
                }}
                onFocus={e => e.currentTarget.style.borderColor = CLR.primary}
                onBlur={e => e.currentTarget.style.borderColor = GRAY[200]}
              />
            </div>

            {error && (
              <div style={{
                fontSize: TXT.sm, color: CLR.danger,
                background: "#fef2f2", border: "1px solid #fecaca",
                borderRadius: RAD.lg, padding: "10px 14px",
                lineHeight: LH.normal,
              }}>
                {error}
              </div>
            )}

            <Button variant="primary" size="lg" loading={loading}
              style={{ width: "100%", background: CLR.primary, borderColor: CLR.primary }}
              onClick={() => {}}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div style={{ textAlign: "center", marginTop: SP.xl, fontSize: TXT.sm, color: GRAY[500] }}>
            Don&apos;t have an account?{" "}
            <a href="/signup" style={{ color: CLR.primary, textDecoration: "none", fontWeight: 600 }}>Sign up</a>
          </div>
        </div>
      </div>

      {/* Right: Hero visual */}
      <div style={{
        flex: 1, background: GRAY[900],
        display: "flex", flexDirection: "column",
        justifyContent: "center", alignItems: "center",
        padding: SP.xxxl, position: "relative", overflow: "hidden",
      }}>
        {/* Background glow */}
        <div style={{
          position: "absolute", width: 400, height: 400, borderRadius: "50%",
          background: `radial-gradient(circle, ${CLR.primary}20, transparent 70%)`,
          top: "30%", left: "40%", transform: "translate(-50%, -50%)",
          filter: "blur(60px)",
        }} />

        <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: 480 }}>
          {/* Animated mini-map representation */}
          <div style={{
            width: 320, height: 200, margin: "0 auto 40px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: RAD.xl, position: "relative", overflow: "hidden",
          }}>
            {/* Simulated nodes */}
            {[
              { x: 25, y: 30, icon: "👨‍⚕️", color: "#38bdf8" },
              { x: 60, y: 20, icon: "🏥", color: "#22c55e" },
              { x: 75, y: 55, icon: "💊", color: "#f59e0b" },
              { x: 40, y: 65, icon: "📋", color: "#a78bfa" },
              { x: 15, y: 70, icon: "🚑", color: "#ef4444" },
            ].map((node, i) => (
              <div key={i} style={{
                position: "absolute", left: `${node.x}%`, top: `${node.y}%`,
                transform: "translate(-50%, -50%)",
                width: 36, height: 36, borderRadius: RAD.lg,
                background: "rgba(26,31,46,0.8)",
                border: `1px solid ${node.color}40`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16,
                boxShadow: `0 0 20px ${node.color}20`,
                animation: `fadeIn 0.5s ease ${i * 0.15}s both`,
              }}>
                {node.icon}
              </div>
            ))}
            {/* Simulated edges */}
            <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} viewBox="0 0 320 200">
              {[
                { x1: 80, y1: 60, x2: 192, y2: 40, color: "#22c55e" },
                { x1: 192, y1: 40, x2: 240, y2: 110, color: "#f59e0b" },
                { x1: 128, y1: 130, x2: 80, y2: 60, color: "#a78bfa" },
                { x1: 48, y1: 140, x2: 128, y2: 130, color: "#ef4444" },
              ].map((edge, i) => (
                <line key={i} x1={edge.x1} y1={edge.y1} x2={edge.x2} y2={edge.y2}
                  stroke={edge.color} strokeWidth="1" strokeOpacity="0.4"
                  strokeDasharray="4,3">
                  <animate attributeName="stroke-dashoffset" from="0" to="-14" dur="2s" repeatCount="indefinite" />
                </line>
              ))}
            </svg>
          </div>

          <div style={{
            fontSize: TXT.stat, fontWeight: 700, color: "#ffffff",
            fontFamily: FONT.sans, marginBottom: SP.lg, lineHeight: LH.tight,
          }}>
            Map any institution.<br />
            <span style={{ color: CLR.primary }}>Find the AI opportunities.</span>
          </div>

          <div style={{
            display: "flex", flexDirection: "column", gap: SP.md,
            fontSize: TXT.md, color: GRAY[400], fontFamily: FONT.sans,
            textAlign: "left", maxWidth: 340, margin: "0 auto",
          }}>
            {[
              { icon: "🏛", text: "Generate institutional models from natural language" },
              { icon: "⚡", text: "Identify supercharge and shortcircuit AI opportunities" },
              { icon: "🤖", text: "Design and deploy AI agents for high-impact tasks" },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{ fontSize: TXT.lg, flexShrink: 0 }}>{item.icon}</span>
                <span style={{ lineHeight: LH.relaxed }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
