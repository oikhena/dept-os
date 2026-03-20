"use client";

import { useRouter } from "next/navigation";
import type { Department } from "../../../types/department";
import { FONT, TXT, SP, RAD, CLR, GRAY, DETAIL, MOTION, T } from "../../../styles/tokens";
import { createClient } from "../../../lib/supabase/client";
import { saveDepartment } from "../../../lib/supabase/departments";
import { useApp } from "../../context/AppContext";
import { Button } from "../../../components/ui/Button";
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
      router.push("/dept/hospital");
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
          Generate Department
        </span>
      </div>
      <div style={{ flex: 1, overflow: "auto" }}>
        <GeneratePanel onGenerated={handleGenerated} />
      </div>
    </div>
  );
}
