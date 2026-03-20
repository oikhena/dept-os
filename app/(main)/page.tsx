"use client";

import { useRouter } from "next/navigation";
import { useApp } from "../context/AppContext";
import WelcomePage from "../../components/welcome/WelcomePage";
import { Skeleton } from "../../components/ui/Skeleton";
import { T, FONT } from "../../styles/tokens";

export default function Home() {
  const router = useRouter();
  const { user, authLoading } = useApp();

  if (authLoading) {
    return (
      <div style={{
        flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", minHeight: "100vh", background: T.bgPrimary,
        fontFamily: FONT.sans,
      }}>
        <Skeleton width={280} height={180} borderRadius={16} />
        <div style={{ marginTop: 32, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <Skeleton width={200} height={24} />
          <Skeleton width={320} height={16} />
        </div>
      </div>
    );
  }

  return (
    <WelcomePage
      isAuthenticated={!!user}
      onGenerate={() => router.push("/generate")}
      onBrowse={() => router.push("/dept/hospital")}
      onSignIn={() => router.push("/login")}
    />
  );
}
