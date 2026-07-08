"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ACHIEVEMENTS, AchievementDef } from "@/lib/achievements";
import Link from "next/link";

export default function AchievementsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [unlockedKeys, setUnlockedKeys] = useState<Set<string>>(new Set());
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("achievements")
        .select("achievement_key")
        .eq("user_id", user.id);
      if (data) setUnlockedKeys(new Set(data.map((a) => a.achievement_key)));
      setLoadingData(false);
    };
    fetch();
  }, [user]);

  if (loading || !user) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-slate-500">Yukleniyor...</div>
      </div>
    );
  }

  const unlockedCount = ACHIEVEMENTS.filter((a) =>
    unlockedKeys.has(a.key)
  ).length;

  return (
    <div className="h-full bg-slate-50 overflow-y-auto">
      <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
        <Link href="/map" className="text-emerald-600 font-medium text-sm">
          ← Harita
        </Link>
        <h1 className="font-bold text-slate-800">Basarimlar</h1>
        <div className="w-12" />
      </div>

      <div className="px-4 py-4">
        <div className="text-center mb-4">
          <p className="text-sm text-slate-500">
            <span className="font-bold text-emerald-600">{unlockedCount}</span>{" "}
            / {ACHIEVEMENTS.length} basarim acildi
          </p>
          <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all"
              style={{
                width: `${(unlockedCount / ACHIEVEMENTS.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {loadingData ? (
          <div className="text-center py-8 text-slate-400 animate-pulse">
            Yukleniyor...
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {ACHIEVEMENTS.map((achievement) => (
              <AchievementCard
                key={achievement.key}
                achievement={achievement}
                unlocked={unlockedKeys.has(achievement.key)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AchievementCard({
  achievement,
  unlocked,
}: {
  achievement: AchievementDef;
  unlocked: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-3 border text-center transition-all ${
        unlocked
          ? "bg-white border-emerald-200 shadow-sm"
          : "bg-slate-100 border-slate-200 opacity-50"
      }`}
    >
      <div className="text-2xl mb-1">{unlocked ? achievement.icon : "🔒"}</div>
      <p className="text-xs font-semibold text-slate-800">{achievement.title}</p>
      <p className="text-[10px] text-slate-500 mt-0.5">
        {achievement.description}
      </p>
    </div>
  );
}
