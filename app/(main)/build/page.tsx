"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Department } from "../../../types/department";
import { FONT, CLR, DETAIL } from "../../../styles/tokens";
import { EMPTY_CUSTOM } from "../../../data/templates";
import { createClient } from "../../../lib/supabase/client";
import { saveDepartment } from "../../../lib/supabase/departments";
import { useApp } from "../../context/AppContext";
import DepartmentBuilder from "../../../components/builder/DepartmentBuilder";

export default function BuildPage() {
  const router = useRouter();
  const { user, setSavedDepts } = useApp();
  const [editingDept, setEditingDept] = useState<Department>({ ...EMPTY_CUSTOM });

  const handleDone = async () => {
    if (user) {
      try {
        const supabase = createClient();
        const id = await saveDepartment(supabase, editingDept, "custom");
        setSavedDepts(prev => [
          { id, kind: "custom", department: editingDept, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          ...prev,
        ]);
        router.push(`/dept/${id}`);
      } catch (e) {
        console.error("Failed to save department:", e);
      }
    } else {
      router.back();
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
        <span style={{ fontFamily: FONT.sans, fontSize: 14, fontWeight: 600, color: CLR.textPrimary }}>Build Custom Department</span>
      </div>
      <div style={{ flex: 1, overflow: "auto" }}>
        <DepartmentBuilder dept={editingDept} setDept={setEditingDept} onDone={handleDone} />
      </div>
    </div>
  );
}
