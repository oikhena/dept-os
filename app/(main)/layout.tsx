"use client";

import { useRouter, usePathname } from "next/navigation";
import { AppProvider, useApp } from "../context/AppContext";
import { DEPARTMENTS } from "../../data/templates";
import { FONT, SIDEBAR, CLR, DETAIL } from "../../styles/tokens";
import Sidebar from "../../components/sidebar/Sidebar";

function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, savedDepts, setSavedDepts, handleLogout, advisors, activeTab, setActiveTab } = useApp();

  // Derive selectedDept from pathname: /dept/[id] → id, else "hospital"
  const selectedDept = pathname.startsWith("/dept/")
    ? pathname.replace("/dept/", "").split("?")[0]
    : "";

  const handleSelect = (key: string) => router.push(`/dept/${key}`);
  const handleGenerate = () => router.push("/generate");
  const handleBuildCustom = () => router.push("/build");

  const handleDelete = async (id: string) => {
    const { createClient } = await import("../../lib/supabase/client");
    const { deleteDepartment } = await import("../../lib/supabase/departments");
    const supabase = createClient();
    await deleteDepartment(supabase, id);
    setSavedDepts(prev => prev.filter(d => d.id !== id));
    if (selectedDept === id) router.push("/dept/hospital");
  };

  const handleAdvisorClick = (advisor: import("../../types/department").Advisor) => {
    setActiveTab(advisor.tab);
    if (advisor.filter) {
      // Navigate with tab param — dept page reads this
      router.push(`/dept/${selectedDept}?tab=${advisor.tab}&filter=${advisor.filter}`);
    } else {
      router.push(`/dept/${selectedDept}?tab=${advisor.tab}`);
    }
  };

  return (
    <div style={{ fontFamily: FONT.sans, background: SIDEBAR.bg, color: CLR.textPrimary, height: "100vh", display: "flex", overflow: "hidden" }}>
      <Sidebar
        departments={DEPARTMENTS}
        savedDepts={savedDepts}
        selectedDept={selectedDept}
        onSelect={handleSelect}
        onGenerate={handleGenerate}
        onBuildCustom={handleBuildCustom}
        onDelete={handleDelete}
        advisors={advisors}
        activeTab={activeTab}
        onAdvisorClick={handleAdvisorClick}
        user={user}
        onLogout={handleLogout}
      />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, background: DETAIL.bg }}>
        {children}
      </div>
    </div>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <MainLayout>{children}</MainLayout>
    </AppProvider>
  );
}
