// src/app/page.tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import LoadingScreen from "@/components/LoadingScreen";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const session = Cookies.get("user_session");
    if (session) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  }, [router]);

  // 在重導向完成前顯示加載畫面
  return <LoadingScreen />;
}