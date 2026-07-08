"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) setNotifications(data);
    setLoadingData(false);
  };

  const markAllRead = async () => {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user!.id)
      .eq("is_read", false);

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  if (loading || !user) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-slate-500">Yukleniyor...</div>
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="h-full bg-slate-50 overflow-y-auto">
      <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
        <Link href="/map" className="text-emerald-600 font-medium text-sm">
          ← Harita
        </Link>
        <h1 className="font-bold text-slate-800">Bildirimler</h1>
        {unreadCount > 0 ? (
          <button
            onClick={markAllRead}
            className="text-xs text-emerald-600 font-medium"
          >
            Okundu
          </button>
        ) : (
          <div className="w-12" />
        )}
      </div>

      <div className="px-4 py-4 space-y-2">
        {loadingData ? (
          <div className="text-center py-8 text-slate-400 animate-pulse">
            Yukleniyor...
          </div>
        ) : notifications.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-8">
            Henuz bildirim yok
          </p>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`bg-white rounded-xl p-4 border shadow-sm ${
                n.is_read ? "border-slate-100" : "border-emerald-200 bg-emerald-50"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="text-lg">
                  {n.type === "zone_captured" ? "⚔️" : "🔔"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm">
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="text-xs text-slate-500 mt-0.5">{n.body}</p>
                  )}
                  <p className="text-[10px] text-slate-400 mt-1">
                    {formatTime(n.created_at)}
                  </p>
                </div>
                {!n.is_read && (
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mt-1.5" />
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Az once";
  if (diffMin < 60) return `${diffMin} dk once`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} saat once`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} gun once`;
  return date.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}
