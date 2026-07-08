"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Email veya sifre hatali");
      setLoading(false);
    } else {
      router.replace("/map");
    }
  };

  return (
    <div className="h-full flex items-center justify-center px-4 bg-slate-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800">Sigara Harita</h1>
          <p className="text-slate-500 mt-2">Giris yap</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
              required
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Sifre"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
              required
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? "Giris yapiliyor..." : "Giris Yap"}
          </button>
        </form>

        <p className="text-center mt-6 text-slate-500 text-sm">
          Hesabin yok mu?{" "}
          <Link href="/register" className="text-emerald-600 font-medium">
            Kayit Ol
          </Link>
        </p>
      </div>
    </div>
  );
}
