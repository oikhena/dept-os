"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AppProvider, useApp } from "../context/AppContext";
import { ThemeProvider } from "../context/ThemeContext";
import { DEPARTMENTS } from "../../data/templates";
import { FONT, MOTION, T } from "../../styles/tokens";
import Sidebar from "../../components/sidebar/Sidebar";

function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, savedDepts, setSavedDepts, handleLogout, advisors, activeTab, setActiveTab } = useApp();

  // Sidebar collapse state — persisted in localStorage
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored === "true") setSidebarCollapsed(true);
  }, []);
  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      localStorage.setItem("sidebar-collapsed", String(!prev));
      return !prev;
    });
  };

  const selectedDept = pathname.startsWith("/dept/")
    ? pathname.replace("/dept/", "").split("?")[0]
    : "";

  const handleSelect = (key: string) => router.push(`/dept/${key}`);
  const handleGenerate = () => router.push("/generate");
  const handleBuildCustom = () => router.push("/build");
  const handleCompare = () => router.push("/compare");

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
      router.push(`/dept/${selectedDept}?tab=${advisor.tab}&filter=${advisor.filter}`);
    } else {
      router.push(`/dept/${selectedDept}?tab=${advisor.tab}`);
    }
  };

  return (
    <div style={{
      fontFamily: FONT.sans, background: T.bgSecondary, color: T.textPrimary,
      height: "100vh", display: "flex", overflow: "hidden",
    }}>
      <Sidebar
        departments={DEPARTMENTS}
        savedDepts={savedDepts}
        selectedDept={selectedDept}
        onSelect={handleSelect}
        onGenerate={handleGenerate}
        onBuildCustom={handleBuildCustom}
        onCompare={handleCompare}
        onDelete={handleDelete}
        advisors={advisors}
        activeTab={activeTab}
        onAdvisorClick={handleAdvisorClick}
        user={user}
        onLogout={handleLogout}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />
      <div style={{
        flex: 1, display: "flex", flexDirection: "column", minWidth: 0,
        background: T.bgPrimary,
        transition: `margin ${MOTION.normal} ${MOTION.ease}`,
      }}>
        {children}
      </div>
    </div>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AppProvider>
        <MainLayout>{children}</MainLayout>
      </AppProvider>
    </ThemeProvider>
  );
}
