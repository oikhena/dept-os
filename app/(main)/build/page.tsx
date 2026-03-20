"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Department } from "../../../types/department";
import { FONT, TXT, SP, CLR, DETAIL, T } from "../../../styles/tokens";
import { EMPTY_CUSTOM } from "../../../data/templates";
import { createClient } from "../../../lib/supabase/client";
import { saveDepartment } from "../../../lib/supabase/departments";
import { useApp } from "../../context/AppContext";
import { Button } from "../../../components/ui/Button";
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
    <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100vh", background: T.bgPrimary }}>
      <div style={{
        background: T.bgPrimary, borderBottom: `1px solid ${T.borderDefault}`,
        padding: `0 ${SP.xl}px`, display: "flex", alignItems: "center", height: 56, flexShrink: 0, gap: SP.md,
      }}>
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          ← Back
        </Button>
        <span style={{ fontFamily: FONT.sans, fontSize: TXT.lg, fontWeight: 600, color: T.textPrimary }}>
          Build Custom Department
        </span>
      </div>
      <div style={{ flex: 1, overflow: "auto" }}>
        <DepartmentBuilder dept={editingDept} setDept={setEditingDept} onDone={handleDone} />
      </div>
    </div>
  );
}
