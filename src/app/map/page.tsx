"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ACHIEVEMENTS } from "@/lib/achievements";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

export default function MapPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    const handler = (e: Event) => {
      const keys = (e as CustomEvent).detail as string[];
      const names = keys
        .map((k) => ACHIEVEMENTS.find((a) => a.key === k))
        .filter(Boolean)
        .map((a) => `${a!.icon} ${a!.title}`);
      if (names.length > 0) {
        setToast(names.join(", "));
        setTimeout(() => setToast(null), 4000);
      }
    };
    window.addEventListener("achievement-unlocked", handler);
    return () => window.removeEventListener("achievement-unlocked", handler);
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-slate-500">Yukleniyor...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="h-full flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-100 shadow-sm z-10">
        <h1 className="text-lg font-bold text-slate-800">Sigara Harita</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/leaderboard"
            className="text-xs font-medium px-2 py-1.5 bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-600 rounded-lg transition-colors"
          >
            Siralama
          </Link>
          <Link
            href="/teams"
            className="text-xs font-medium px-2 py-1.5 bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-600 rounded-lg transition-colors"
          >
            Takimlar
          </Link>
          <Link
            href="/friends"
            className="text-xs font-medium px-2 py-1.5 bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-600 rounded-lg transition-colors"
          >
            Arkadaslar
          </Link>
          <Link
            href="/achievements"
            className="text-xs font-medium px-2 py-1.5 bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-600 rounded-lg transition-colors"
          >
            Basarimlar
          </Link>
          <Link
            href="/profile"
            className="flex items-center text-sm text-slate-600 hover:text-emerald-600"
          >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Profil"
                className="w-8 h-8 rounded-full object-cover border border-emerald-200"
              />
            ) : (
              <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold text-sm">
                {profile?.display_name?.charAt(0)?.toUpperCase() || "?"}
              </div>
            )}
          </Link>
        </div>
      </div>

      {/* Achievement toast */}
      {toast && (
        <div className="absolute top-16 left-4 right-4 z-[2000] bg-emerald-600 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg text-center animate-pulse">
          Basarim Acildi! {toast}
        </div>
      )}

      {/* Map */}
      <div className="flex-1 relative">
        <MapView />
      </div>
    </div>
  );
}
