"use client";

import { TXT, SP, RAD, LH, FONT, CLR, MOTION, T } from "../../styles/tokens";
import { Button } from "../ui/Button";

interface WelcomePageProps {
  isAuthenticated: boolean;
  onGenerate: () => void;
  onBrowse: () => void;
  onSignIn: () => void;
}

const FEATURES = [
  {
    icon: "🏛",
    title: "Map any institution",
    description: "Describe a department, agency, or organization and generate a complete operational model with roles, workflows, and sensors.",
    color: CLR.primary,
  },
  {
    icon: "⚡",
    title: "Find AI opportunities",
    description: "Identify tasks that AI can supercharge or shortcircuit. Quantify cost savings and prioritize by impact.",
    color: CLR.success,
  },
  {
    icon: "🤖",
    title: "Design & deploy agents",
    description: "Architect AI agents across web, mobile, edge, and orchestration layers. Prototype them with live conversations.",
    color: CLR.warning,
  },
];

const NODES = [
  { x: 20, y: 25, icon: "👨‍⚕️", color: "#38bdf8" },
  { x: 55, y: 15, icon: "🏥", color: "#22c55e" },
  { x: 80, y: 30, icon: "💊", color: "#f59e0b" },
  { x: 35, y: 55, icon: "📋", color: "#a78bfa" },
  { x: 70, y: 60, icon: "🚑", color: "#ef4444" },
  { x: 15, y: 70, icon: "🔬", color: "#34d399" },
  { x: 50, y: 80, icon: "⚙️", color: "#60a5fa" },
];

const EDGES = [
  { x1: 20, y1: 25, x2: 55, y2: 15, color: "#22c55e" },
  { x1: 55, y1: 15, x2: 80, y2: 30, color: "#f59e0b" },
  { x1: 35, y1: 55, x2: 20, y2: 25, color: "#a78bfa" },
  { x1: 70, y1: 60, x2: 80, y2: 30, color: "#ef4444" },
  { x1: 15, y1: 70, x2: 35, y2: 55, color: "#34d399" },
  { x1: 50, y1: 80, x2: 70, y2: 60, color: "#60a5fa" },
  { x1: 50, y1: 80, x2: 15, y2: 70, color: "#38bdf8" },
];

export default function WelcomePage({ isAuthenticated, onGenerate, onBrowse, onSignIn }: WelcomePageProps) {
  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: SP.xxxl, fontFamily: FONT.sans, minHeight: "100vh", overflow: "auto",
      background: T.bgPrimary,
    }}>
      {/* Hero section */}
      <div style={{ textAlign: "center", maxWidth: 640, marginBottom: SP.xxxl }}>
        {/* Animated mini-map */}
        <div style={{
          width: 280, height: 180, margin: "0 auto 32px",
          background: "rgba(15,18,25,0.95)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: RAD.xl, position: "relative", overflow: "hidden",
        }}>
          {/* Nodes */}
          {NODES.map((node, i) => (
            <div key={i} style={{
              position: "absolute", left: `${node.x}%`, top: `${node.y}%`,
              transform: "translate(-50%, -50%)",
              width: 32, height: 32, borderRadius: RAD.md,
              background: "rgba(26,31,46,0.9)",
              border: `1px solid ${node.color}35`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, boxShadow: `0 0 16px ${node.color}15`,
              animation: `fadeIn 0.5s ease ${i * 0.1}s both`,
            }}>
              {node.icon}
            </div>
          ))}
          {/* Edges */}
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} viewBox="0 0 100 100" preserveAspectRatio="none">
            {EDGES.map((edge, i) => (
              <line key={i} x1={edge.x1} y1={edge.y1} x2={edge.x2} y2={edge.y2}
                stroke={edge.color} strokeWidth="0.5" strokeOpacity="0.35"
                strokeDasharray="3,2">
                <animate attributeName="stroke-dashoffset" from="0" to="-10" dur="2s" repeatCount="indefinite" />
              </line>
            ))}
          </svg>
        </div>

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: SP.md }}>
          <div style={{
            width: 12, height: 12, borderRadius: "50%",
            background: CLR.success, boxShadow: `0 0 12px ${CLR.success}60`,
          }} />
          <span style={{ fontWeight: 700, fontSize: TXT.xxl, color: T.textPrimary, letterSpacing: "0.02em" }}>
            DEPT.OS
          </span>
        </div>

        <h1 style={{
          fontSize: TXT.stat, fontWeight: 700, color: T.textPrimary,
          lineHeight: LH.tight, margin: `0 0 ${SP.md}px`,
        }}>
          Institutional Intelligence,{" "}
          <span style={{ color: CLR.success }}>Powered by AI</span>
        </h1>

        <p style={{
          fontSize: TXT.lg, color: T.textSecondary, lineHeight: LH.relaxed,
          margin: `0 0 ${SP.xl}px`, maxWidth: 480, marginLeft: "auto", marginRight: "auto",
        }}>
          Map roles, workflows, and sensors for any institution. Identify where AI can supercharge or shortcircuit work. Design and deploy agents.
        </p>

        {/* CTAs */}
        <div style={{ display: "flex", gap: SP.md, justifyContent: "center", flexWrap: "wrap" }}>
          <Button variant="success" size="lg" onClick={onGenerate}>
            Generate a Department
          </Button>
          <Button variant="secondary" size="lg" onClick={onBrowse}>
            Browse Templates
          </Button>
          {!isAuthenticated && (
            <Button variant="ghost" size="lg" onClick={onSignIn}>
              Sign In
            </Button>
          )}
        </div>
      </div>

      {/* Feature cards */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: SP.xl,
        maxWidth: 780, width: "100%",
      }}>
        {FEATURES.map((f, i) => (
          <div key={i} style={{
            background: T.bgSecondary,
            border: `1px solid ${T.borderDefault}`,
            borderRadius: RAD.xl, padding: SP.xl,
            transition: `all ${MOTION.fast}`,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: RAD.lg,
              background: f.color + "12", border: `1px solid ${f.color}25`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: TXT.xl, marginBottom: SP.md,
            }}>
              {f.icon}
            </div>
            <div style={{ fontSize: TXT.md, fontWeight: 600, color: T.textPrimary, marginBottom: SP.sm }}>
              {f.title}
            </div>
            <div style={{ fontSize: TXT.sm, color: T.textMuted, lineHeight: LH.relaxed }}>
              {f.description}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
