"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  friend_code: string | null;
  total_smokes: number;
  team_id: string | null;
  teams: { name: string; color: string } | null;
}

interface UserStats {
  total: number;
  thisWeek: number;
}

export default function UserProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats>({ total: 0, thisWeek: 0 });
  const [isFriend, setIsFriend] = useState(false);
  const [adding, setAdding] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!userId || !user) return;

    const fetchData = async () => {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*, teams:team_id(name, color)")
        .eq("id", userId)
        .single();

      if (profileData) setProfile(profileData);

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [totalRes, weekRes] = await Promise.all([
        supabase
          .from("smoke_markers")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId),
        supabase
          .from("smoke_markers")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .gte("smoked_at", weekAgo.toISOString()),
      ]);

      setStats({
        total: totalRes.count || 0,
        thisWeek: weekRes.count || 0,
      });

      const { data: friendship } = await supabase
        .from("friendships")
        .select("id")
        .eq("user_id", user.id)
        .eq("friend_id", userId)
        .single();

      setIsFriend(!!friendship);
      setLoadingProfile(false);
    };

    fetchData();
  }, [userId, user]);

  const handleAddFriend = async () => {
    if (!user || !userId) return;
    setAdding(true);

    const { error } = await supabase.from("friendships").insert({
      user_id: user.id,
      friend_id: userId,
    });

    if (!error) setIsFriend(true);
    setAdding(false);
  };

  if (loading || !user || loadingProfile) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-slate-500">Yukleniyor...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <p className="text-slate-500">Kullanici bulunamadi</p>
        <Link href="/map" className="text-emerald-600 font-medium text-sm">
          ← Haritaya don
        </Link>
      </div>
    );
  }

  const isMe = user.id === userId;

  return (
    <div className="h-full bg-slate-50 overflow-y-auto">
      <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
        <Link href="/map" className="text-emerald-600 font-medium text-sm">
          ← Harita
        </Link>
        <h1 className="font-bold text-slate-800">Profil</h1>
        <div className="w-12" />
      </div>

      <div className="px-4 py-6 space-y-4">
        {/* Profile card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.display_name}
              className="w-20 h-20 rounded-full object-cover border-2 border-emerald-200 mx-auto mb-3"
            />
          ) : (
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold text-2xl mx-auto mb-3">
              {profile.display_name.charAt(0).toUpperCase()}
            </div>
          )}
          <h2 className="text-xl font-bold text-slate-800">
            {profile.display_name}
          </h2>
          <p className="text-slate-500 text-sm">@{profile.username}</p>
          {profile.teams && (
            <div className="flex items-center justify-center gap-2 mt-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: profile.teams.color }}
              />
              <span className="text-xs text-slate-600">
                {profile.teams.name}
              </span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 text-center">
            <p className="text-2xl font-bold text-emerald-600">{stats.total}</p>
            <p className="text-xs text-slate-500 mt-1">Toplam</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 text-center">
            <p className="text-2xl font-bold text-emerald-600">
              {stats.thisWeek}
            </p>
            <p className="text-xs text-slate-500 mt-1">Bu Hafta</p>
          </div>
        </div>

        {/* Add friend button */}
        {!isMe && (
          <div>
            {isFriend ? (
              <div className="w-full py-3 bg-emerald-50 text-emerald-600 font-medium rounded-xl text-center text-sm">
                Arkadasiniz
              </div>
            ) : (
              <button
                onClick={handleAddFriend}
                disabled={adding}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                {adding ? "Ekleniyor..." : "Arkadas Ekle"}
              </button>
            )}
          </div>
        )}

        {isMe && (
          <Link
            href="/profile"
            className="block w-full py-3 bg-slate-100 text-slate-700 font-medium rounded-xl text-center text-sm hover:bg-slate-200 transition-colors"
          >
            Profilini Duzenle
          </Link>
        )}
      </div>
    </div>
  );
}
