"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import Cigarette3D from "@/components/Cigarette3D";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/map");
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-lg text-slate-500">Yukleniyor...</div>
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="h-full bg-gradient-to-b from-slate-900 via-slate-800 to-emerald-950 overflow-y-auto">
      {/* Hero with Cigarette */}
      <div className="px-6 pt-12 pb-8 flex flex-col items-center">
        <Cigarette3D />

        <h1 className="text-3xl font-black text-white mt-8 mb-2 text-center">
          Sigara Harita
        </h1>
        <p className="text-slate-400 text-sm text-center max-w-xs">
          Sigara ictigin yerleri isaretler, bolgeleri fethet, takiminla yaris.
        </p>
      </div>

      {/* Features */}
      <div className="px-6 space-y-3 max-w-sm mx-auto">
        <FeatureCard
          icon="📍"
          title="Konum Isaretleme"
          desc="Sigara ictigin yeri tek tikla haritada isaretler"
        />
        <FeatureCard
          icon="⚔️"
          title="Bolge Savasi"
          desc="Takimlar arasi bolge kapmaca — son icen bolgeyi alir"
        />
        <FeatureCard
          icon="🏆"
          title="Liderlik & Basarimlar"
          desc="En cok icen kim? Basarimlari ac, siralamada yuksel"
        />
        <FeatureCard
          icon="👥"
          title="Arkadaslar & Takimlar"
          desc="Arkadas ekle, takim kur, birlikte haritayi domine et"
        />
      </div>

      {/* CTA */}
      <div className="px-6 pt-10 pb-16 max-w-sm mx-auto space-y-3">
        <Link
          href="/register"
          className="block w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-center rounded-2xl shadow-lg shadow-emerald-500/30 transition-all active:scale-95"
        >
          Basla
        </Link>
        <Link
          href="/login"
          className="block w-full py-4 bg-white/10 border border-white/20 text-white font-semibold text-center rounded-2xl hover:bg-white/20 transition-all active:scale-95"
        >
          Giris Yap
        </Link>
      </div>

      {/* Footer */}
      <div className="text-center pb-8">
        <p className="text-[10px] text-slate-500">
          Sigara sagliga zararlidir. Bu uygulama sigara kullanmaya tesvik etmez.
        </p>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-4 bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
      <div className="text-2xl shrink-0">{icon}</div>
      <div>
        <h3 className="font-bold text-white text-sm">{title}</h3>
        <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
      </div>
    </div>
  );
}
