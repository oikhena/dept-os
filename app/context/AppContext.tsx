"use client";

import { createContext, useContext, useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import type { SavedDepartment } from "../../types/saved";
import type { Advisor } from "../../types/department";
import { createClient } from "../../lib/supabase/client";
import { loadUserDepartments } from "../../lib/supabase/departments";

interface AppContextValue {
  user: User | null;
  authLoading: boolean;
  savedDepts: SavedDepartment[];
  setSavedDepts: React.Dispatch<React.SetStateAction<SavedDepartment[]>>;
  handleLogout: () => Promise<void>;
  advisors: Advisor[];
  setAdvisors: React.Dispatch<React.SetStateAction<Advisor[]>>;
  activeTab: string;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [savedDepts, setSavedDepts] = useState<SavedDepartment[]>([]);
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setAuthLoading(false);
      if (user) {
        loadUserDepartments(supabase).then(setSavedDepts).catch(console.error);
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
      if (session?.user) {
        loadUserDepartments(supabase).then(setSavedDepts).catch(console.error);
      } else {
        setSavedDepts([]);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setSavedDepts([]);
  };

  return (
    <AppContext.Provider value={{ user, authLoading, savedDepts, setSavedDepts, handleLogout, advisors, setAdvisors, activeTab, setActiveTab }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
