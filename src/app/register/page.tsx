"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (username.length < 3) {
      setError("Kullanici adi en az 3 karakter olmali");
      setLoading(false);
      return;
    }

    const { data: existingUser } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username.toLowerCase())
      .single();

    if (existingUser) {
      setError("Bu kullanici adi alinmis");
      setLoading(false);
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const friendCode = data.user.id.replace(/-/g, "").substring(0, 6).toUpperCase();
      const { error: profileError } = await supabase.from("profiles").insert({
        id: data.user.id,
        username: username.toLowerCase(),
        display_name: displayName,
        total_smokes: 0,
        friend_code: friendCode,
      });

      if (profileError) {
        setError("Profil olusturulamadi");
        setLoading(false);
        return;
      }

      router.replace("/map");
    }
  };

  return (
    <div className="h-full flex items-center justify-center px-4 bg-slate-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800">Sigara Harita</h1>
          <p className="text-slate-500 mt-2">Hesap olustur</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="Kullanici Adi"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
              required
            />
          </div>
          <div>
            <input
              type="text"
              placeholder="Gorunen Isim"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
              required
            />
          </div>
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
              placeholder="Sifre (en az 6 karakter)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
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
            {loading ? "Kayit yapiliyor..." : "Kayit Ol"}
          </button>
        </form>

        <p className="text-center mt-6 text-slate-500 text-sm">
          Zaten hesabin var mi?{" "}
          <Link href="/login" className="text-emerald-600 font-medium">
            Giris Yap
          </Link>
        </p>
      </div>
    </div>
  );
}
