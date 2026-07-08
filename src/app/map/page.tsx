"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { supabase } from "@/lib/supabase";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

interface TeamStat {
  name: string;
  color: string;
  count: number;
}

export default function MapPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalSmokes, setTotalSmokes] = useState(0);
  const [teamStats, setTeamStats] = useState<TeamStat[]>([]);

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

  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      setUnreadCount(count || 0);
    };
    fetchUnread();

    const channel = supabase
      .channel("notif-badge")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => setUnreadCount((c) => c + 1)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchStats();
    const handler = () => fetchStats();
    window.addEventListener("marker-added", handler);
    return () => window.removeEventListener("marker-added", handler);
  }, [user]);

  const fetchStats = async () => {
    const { data } = await supabase
      .from("smoke_markers")
      .select("team_id, teams:team_id(name, color)");

    if (!data) return;
    setTotalSmokes(data.length);

    const teamCounts: Record<string, TeamStat> = {};
    for (const m of data as any[]) {
      if (m.team_id && m.teams) {
        if (!teamCounts[m.team_id]) {
          teamCounts[m.team_id] = { name: m.teams.name, color: m.teams.color, count: 0 };
        }
        teamCounts[m.team_id].count++;
      }
    }
    setTeamStats(Object.values(teamCounts).sort((a, b) => b.count - a.count));
  };

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
            href="/notifications"
            className="relative text-xs font-medium px-2 py-1.5 bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-600 rounded-lg transition-colors"
          >
            🔔
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
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

      {/* Stats bar */}
      <div className="bg-white border-b border-slate-100 px-4 py-2 flex items-center gap-3 z-10">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500">Toplam:</span>
          <span className="text-sm font-bold text-emerald-600">{totalSmokes}</span>
        </div>
        {teamStats.length > 0 && (
          <>
            <div className="w-px h-4 bg-slate-200" />
            <div className="flex-1 flex items-center gap-2 overflow-x-auto">
              {teamStats.map((t) => (
                <div key={t.name} className="flex items-center gap-1 shrink-0">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: t.color }}
                  />
                  <span className="text-[11px] text-slate-600 font-medium">
                    {t.name}
                  </span>
                  <span className="text-[11px] font-bold text-slate-800">
                    {t.count}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    ({totalSmokes > 0 ? Math.round((t.count / totalSmokes) * 100) : 0}%)
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Achievement toast */}
      {toast && (
        <div className="absolute top-28 left-4 right-4 z-[2000] bg-emerald-600 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg text-center animate-pulse">
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
