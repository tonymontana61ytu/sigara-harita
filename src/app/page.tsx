"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) router.replace("/map");
      else router.replace("/login");
    }
  }, [user, loading, router]);

  return (
    <div className="h-full flex items-center justify-center">
      <div className="animate-pulse text-lg text-slate-500">Yukleniyor...</div>
    </div>
  );
}
