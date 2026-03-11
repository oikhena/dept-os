"use client";

import { useRouter } from "next/navigation";
import type { Department } from "../../../types/department";
import { FONT, CLR, DETAIL, SIDEBAR } from "../../../styles/tokens";
import { createClient } from "../../../lib/supabase/client";
import { saveDepartment } from "../../../lib/supabase/departments";
import { useApp } from "../../context/AppContext";
import GeneratePanel from "../../../components/builder/GeneratePanel";

export default function GeneratePage() {
  const router = useRouter();
  const { user, setSavedDepts } = useApp();

  const handleGenerated = async (d: Department, query: string) => {
    if (user) {
      try {
        const supabase = createClient();
        const id = await saveDepartment(supabase, d, "generated", query);
        setSavedDepts(prev => [
          { id, kind: "generated", generationQuery: query, department: d, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          ...prev,
        ]);
        router.push(`/dept/${id}`);
      } catch (e) {
        console.error("Failed to save department:", e);
        router.push("/dept/hospital");
      }
    } else {
      // Not signed in — can't persist, go back
      router.push("/dept/hospital");
    }
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100vh", background: DETAIL.bg }}>
      <div style={{ background: DETAIL.bg, borderBottom: `1px solid ${CLR.borderDefault}`, padding: "0 20px", display: "flex", alignItems: "center", height: 52, flexShrink: 0, gap: 12 }}>
        <button
          onClick={() => router.back()}
          style={{ background: "transparent", border: `1px solid ${CLR.borderDefault}`, color: CLR.textMuted, padding: "4px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontFamily: FONT.sans }}>
          ← Back
        </button>
        <span style={{ fontFamily: FONT.sans, fontSize: 14, fontWeight: 600, color: CLR.textPrimary }}>Generate Department</span>
      </div>
      <div style={{ flex: 1, overflow: "auto" }}>
        <GeneratePanel onGenerated={handleGenerated} />
      </div>
    </div>
  );
}
