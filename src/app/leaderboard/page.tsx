"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

interface LeaderboardEntry {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  total_smokes: number;
  team_color: string | null;
  team_name: string | null;
}

interface WeeklyEntry {
  user_id: string;
  count: number;
  username: string;
  display_name: string;
  avatar_url: string | null;
  team_color: string | null;
  team_name: string | null;
}

export default function LeaderboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<"all" | "weekly">("all");
  const [allTime, setAllTime] = useState<LeaderboardEntry[]>([]);
  const [weekly, setWeekly] = useState<WeeklyEntry[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    fetchLeaderboards();
  }, []);

  const fetchLeaderboards = async () => {
    setLoadingData(true);

    const { data: allData } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, total_smokes, teams:team_id(color, name)")
      .order("total_smokes", { ascending: false })
      .limit(50);

    if (allData) {
      setAllTime(
        allData.map((p: any) => ({
          id: p.id,
          username: p.username,
          display_name: p.display_name,
          avatar_url: p.avatar_url || null,
          total_smokes: p.total_smokes,
          team_color: p.teams?.color || null,
          team_name: p.teams?.name || null,
        }))
      );
    }

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: weekData } = await supabase
      .from("smoke_markers")
      .select("user_id, profiles(username, display_name, avatar_url, teams:team_id(color, name))")
      .gte("smoked_at", weekAgo);

    if (weekData) {
      const counts: Record<string, WeeklyEntry> = {};
      for (const row of weekData as any[]) {
        if (!counts[row.user_id]) {
          counts[row.user_id] = {
            user_id: row.user_id,
            count: 0,
            username: row.profiles?.username || "?",
            display_name: row.profiles?.display_name || "Anonim",
            avatar_url: row.profiles?.avatar_url || null,
            team_color: row.profiles?.teams?.color || null,
            team_name: row.profiles?.teams?.name || null,
          };
        }
        counts[row.user_id].count++;
      }
      setWeekly(
        Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 50)
      );
    }

    setLoadingData(false);
  };

  if (loading || !user) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-slate-500">Yukleniyor...</div>
      </div>
    );
  }

  return (
    <div className="h-full bg-slate-50 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
        <Link href="/map" className="text-emerald-600 font-medium text-sm">
          ← Harita
        </Link>
        <h1 className="font-bold text-slate-800">Liderlik Tablosu</h1>
        <div className="w-12" />
      </div>

      {/* Tabs */}
      <div className="flex px-4 pt-4 gap-2">
        <button
          onClick={() => setTab("all")}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
            tab === "all"
              ? "bg-emerald-600 text-white"
              : "bg-white text-slate-600 border border-slate-200"
          }`}
        >
          Tum Zamanlar
        </button>
        <button
          onClick={() => setTab("weekly")}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
            tab === "weekly"
              ? "bg-emerald-600 text-white"
              : "bg-white text-slate-600 border border-slate-200"
          }`}
        >
          Bu Hafta
        </button>
      </div>

      {/* List */}
      <div className="px-4 py-4 space-y-2">
        {loadingData ? (
          <div className="text-center py-8 text-slate-400 animate-pulse">
            Yukleniyor...
          </div>
        ) : tab === "all" ? (
          allTime.map((entry, i) => (
            <LeaderRow
              key={entry.id}
              userId={entry.id}
              rank={i + 1}
              displayName={entry.display_name}
              username={entry.username}
              avatarUrl={entry.avatar_url}
              count={entry.total_smokes}
              teamColor={entry.team_color}
              teamName={entry.team_name}
              isMe={entry.id === user.id}
            />
          ))
        ) : (
          weekly.map((entry, i) => (
            <LeaderRow
              key={entry.user_id}
              userId={entry.user_id}
              rank={i + 1}
              displayName={entry.display_name}
              username={entry.username}
              avatarUrl={entry.avatar_url}
              count={entry.count}
              teamColor={entry.team_color}
              teamName={entry.team_name}
              isMe={entry.user_id === user.id}
            />
          ))
        )}

        {!loadingData &&
          ((tab === "all" && allTime.length === 0) ||
            (tab === "weekly" && weekly.length === 0)) && (
            <p className="text-center text-slate-400 text-sm py-8">
              Henuz veri yok
            </p>
          )}
      </div>
    </div>
  );
}

function LeaderRow({
  userId,
  rank,
  displayName,
  username,
  avatarUrl,
  count,
  teamColor,
  teamName,
  isMe,
}: {
  userId: string;
  rank: number;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  count: number;
  teamColor: string | null;
  teamName: string | null;
  isMe: boolean;
}) {
  const medals = ["", "🥇", "🥈", "🥉"];
  const medal = medals[rank] || "";

  return (
    <a
      href={`/user/${userId}`}
      className={`flex items-center gap-3 bg-white rounded-xl p-3 border shadow-sm ${
        isMe ? "border-emerald-300 bg-emerald-50" : "border-slate-100"
      } hover:border-emerald-200 transition-colors`}
    >
      <div className="w-8 text-center">
        {medal ? (
          <span className="text-lg">{medal}</span>
        ) : (
          <span className="text-sm font-bold text-slate-400">#{rank}</span>
        )}
      </div>

      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={displayName}
          className="w-10 h-10 rounded-full object-cover border border-slate-200 flex-shrink-0"
        />
      ) : (
        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold text-sm flex-shrink-0">
          {displayName.charAt(0).toUpperCase()}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-slate-800 text-sm truncate">
            {displayName}
          </p>
          {teamColor && (
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: teamColor }}
              title={teamName || ""}
            />
          )}
        </div>
        <p className="text-xs text-slate-400">@{username}</p>
      </div>

      <div className="text-right">
        <p className="text-lg font-bold text-emerald-600">{count}</p>
        <p className="text-[10px] text-slate-400">sigara</p>
      </div>
    </a>
  );
}
