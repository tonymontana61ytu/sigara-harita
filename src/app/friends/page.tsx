"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

interface FriendInfo {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  total_smokes: number;
}

export default function FriendsPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [friends, setFriends] = useState<FriendInfo[]>([]);
  const [friendCode, setFriendCode] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (user) fetchFriends();
  }, [user]);

  const fetchFriends = async () => {
    const { data } = await supabase
      .from("friendships")
      .select("friend_id, profiles:friend_id(id, username, display_name, avatar_url, total_smokes)")
      .eq("user_id", user!.id);

    if (data) {
      setFriends(
        data.map((d: any) => ({
          id: d.profiles.id,
          username: d.profiles.username,
          display_name: d.profiles.display_name,
          avatar_url: d.profiles.avatar_url,
          total_smokes: d.profiles.total_smokes,
        }))
      );
    }
    setLoadingData(false);
  };

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setAdding(true);

    const code = friendCode.trim().toUpperCase();

    if (!code) {
      setError("Kod gir");
      setAdding(false);
      return;
    }

    if (code === profile?.friend_code) {
      setError("Kendi kodunu giremezsin");
      setAdding(false);
      return;
    }

    const { data: friendProfile } = await supabase
      .from("profiles")
      .select("id, display_name")
      .eq("friend_code", code)
      .single();

    if (!friendProfile) {
      setError("Bu kodla kullanici bulunamadi");
      setAdding(false);
      return;
    }

    const { data: existing } = await supabase
      .from("friendships")
      .select("id")
      .eq("user_id", user!.id)
      .eq("friend_id", friendProfile.id)
      .single();

    if (existing) {
      setError("Zaten arkadassiniz");
      setAdding(false);
      return;
    }

    const { error: insertError } = await supabase.from("friendships").insert({
      user_id: user!.id,
      friend_id: friendProfile.id,
    });

    if (insertError) {
      setError("Eklenemedi: " + insertError.message);
    } else {
      setSuccess(`${friendProfile.display_name} arkadaslarina eklendi!`);
      setFriendCode("");
      fetchFriends();
    }
    setAdding(false);
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
      <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
        <Link href="/map" className="text-emerald-600 font-medium text-sm">
          ← Harita
        </Link>
        <h1 className="font-bold text-slate-800">Arkadaslar</h1>
        <div className="w-12" />
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Kendi kodun */}
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm text-center">
          <p className="text-xs text-slate-500 mb-1">Senin arkadaslik kodun</p>
          <p className="text-2xl font-bold text-emerald-600 tracking-widest">
            {profile?.friend_code || "..."}
          </p>
          <button
            onClick={() => {
              navigator.clipboard.writeText(profile?.friend_code || "");
            }}
            className="mt-2 text-xs text-slate-500 hover:text-emerald-600"
          >
            Kopyala
          </button>
        </div>

        {/* Arkadas ekle */}
        <form
          onSubmit={handleAddFriend}
          className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm"
        >
          <p className="text-sm font-medium text-slate-700 mb-2">
            Arkadas Ekle
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Arkadas kodu"
              value={friendCode}
              onChange={(e) => setFriendCode(e.target.value.toUpperCase())}
              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm uppercase tracking-wider"
            />
            <button
              type="submit"
              disabled={adding}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {adding ? "..." : "Ekle"}
            </button>
          </div>
          {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
          {success && (
            <p className="text-emerald-600 text-xs mt-2">{success}</p>
          )}
        </form>

        {/* Arkadas listesi */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">
            Arkadaslarin ({friends.length})
          </p>
          {loadingData ? (
            <div className="text-center py-4 text-slate-400 animate-pulse">
              Yukleniyor...
            </div>
          ) : friends.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-6">
              Henuz arkadasin yok. Kodunu paylas!
            </p>
          ) : (
            friends.map((friend) => (
              <div
                key={friend.id}
                className="flex items-center gap-3 bg-white rounded-xl p-3 border border-slate-100 shadow-sm"
              >
                {friend.avatar_url ? (
                  <img
                    src={friend.avatar_url}
                    alt={friend.display_name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold text-sm">
                    {friend.display_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-semibold text-slate-800 text-sm">
                    {friend.display_name}
                  </p>
                  <p className="text-xs text-slate-400">@{friend.username}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-600">
                    {friend.total_smokes}
                  </p>
                  <p className="text-[10px] text-slate-400">sigara</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
