"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

export default function MapPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

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
        <div className="flex items-center gap-3">
          <Link
            href="/leaderboard"
            className="text-xs font-medium px-3 py-1.5 bg-slate-100 hover:bg-orange-100 text-slate-600 hover:text-orange-600 rounded-lg transition-colors"
          >
            Siralama
          </Link>
          <Link
            href="/teams"
            className="text-xs font-medium px-3 py-1.5 bg-slate-100 hover:bg-orange-100 text-slate-600 hover:text-orange-600 rounded-lg transition-colors"
          >
            Takimlar
          </Link>
          <Link
            href="/profile"
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-orange-500"
          >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Profil"
                className="w-8 h-8 rounded-full object-cover border border-orange-200"
              />
            ) : (
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-sm">
                {profile?.display_name?.charAt(0)?.toUpperCase() || "?"}
              </div>
            )}
          </Link>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapView />
      </div>
    </div>
  );
}
