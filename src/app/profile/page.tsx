"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

interface Stats {
  total: number;
  thisWeek: number;
  thisMonth: number;
  lastSmoke: string | null;
}

export default function ProfilePage() {
  const { user, profile, loading, signOut, refreshProfile } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    thisWeek: 0,
    thisMonth: 0,
    lastSmoke: null,
  });

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [totalRes, weekRes, monthRes, lastRes] = await Promise.all([
        supabase
          .from("smoke_markers")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("smoke_markers")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("smoked_at", weekAgo.toISOString()),
        supabase
          .from("smoke_markers")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("smoked_at", monthAgo.toISOString()),
        supabase
          .from("smoke_markers")
          .select("smoked_at")
          .eq("user_id", user.id)
          .order("smoked_at", { ascending: false })
          .limit(1)
          .single(),
      ]);

      setStats({
        total: totalRes.count || 0,
        thisWeek: weekRes.count || 0,
        thisMonth: monthRes.count || 0,
        lastSmoke: lastRes.data?.smoked_at || null,
      });
    };

    fetchStats();
  }, [user]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Dosya 2MB'dan kucuk olmali");
      return;
    }

    setUploading(true);

    const fileExt = file.name.split(".").pop();
    const filePath = `${user.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      alert("Yuklenemedi: " + uploadError.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    const avatarUrl = urlData.publicUrl + "?t=" + Date.now();

    await supabase
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("id", user.id);

    await refreshProfile();
    setUploading(false);
  };

  if (loading || !user) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-slate-500">Yukleniyor...</div>
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

  return (
    <div className="h-full bg-slate-50 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
        <Link href="/map" className="text-orange-500 font-medium text-sm">
          ← Harita
        </Link>
        <h1 className="font-bold text-slate-800">Profil</h1>
        <div className="w-12" />
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Profile card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={handleAvatarClick}
            disabled={uploading}
            className="relative mx-auto mb-3 block"
          >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Profil"
                className="w-20 h-20 rounded-full object-cover border-2 border-orange-200"
              />
            ) : (
              <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-2xl">
                {profile?.display_name?.charAt(0)?.toUpperCase() || "?"}
              </div>
            )}
            <div className="absolute bottom-0 right-0 bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow">
              {uploading ? "..." : "+"}
            </div>
          </button>
          <h2 className="text-xl font-bold text-slate-800">
            {profile?.display_name}
          </h2>
          <p className="text-slate-500 text-sm">@{profile?.username}</p>
          <p className="text-xs text-slate-400 mt-1">
            Foto degistirmek icin resme tikla
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Toplam" value={stats.total} />
          <StatCard label="Bu Hafta" value={stats.thisWeek} />
          <StatCard label="Bu Ay" value={stats.thisMonth} />
          <StatCard
            label="Son Icilen"
            value={
              stats.lastSmoke
                ? new Date(stats.lastSmoke).toLocaleDateString("tr-TR", {
                    day: "numeric",
                    month: "short",
                  })
                : "-"
            }
          />
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="w-full py-3 bg-red-50 text-red-600 font-medium rounded-xl hover:bg-red-100 transition-colors"
        >
          Cikis Yap
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 text-center">
      <p className="text-2xl font-bold text-orange-500">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
    </div>
  );
}
