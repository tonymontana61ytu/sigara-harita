"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Team } from "@/types";
import Link from "next/link";

const PRESET_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#6b7280",
  "#000000",
];

export default function TeamsPage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    const { data } = await supabase
      .from("teams")
      .select("*")
      .order("member_count", { ascending: false });
    if (data) setTeams(data);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setCreating(true);

    if (newName.trim().length < 2) {
      setError("Takim adi en az 2 karakter olmali");
      setCreating(false);
      return;
    }

    const { data, error: createError } = await supabase
      .from("teams")
      .insert({
        name: newName.trim(),
        color: newColor,
        owner_id: user!.id,
        member_count: 1,
      })
      .select()
      .single();

    if (createError) {
      setError(
        createError.message.includes("duplicate")
          ? "Bu isimde bir takim zaten var"
          : createError.message
      );
      setCreating(false);
      return;
    }

    await supabase
      .from("profiles")
      .update({ team_id: data.id })
      .eq("id", user!.id);

    await refreshProfile();
    setShowCreate(false);
    setNewName("");
    setCreating(false);
    fetchTeams();
  };

  const handleJoin = async (teamId: string) => {
    setJoining(teamId);
    await supabase.rpc("join_team", { tid: teamId });
    await refreshProfile();
    setJoining(null);
    fetchTeams();
  };

  const handleLeave = async () => {
    await supabase.rpc("leave_team");
    await refreshProfile();
    fetchTeams();
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
        <Link href="/map" className="text-orange-500 font-medium text-sm">
          ← Harita
        </Link>
        <h1 className="font-bold text-slate-800">Takimlar</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="text-orange-500 font-medium text-sm"
        >
          + Kur
        </button>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Current team */}
        {profile?.team_id && (
          <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{
                    backgroundColor:
                      teams.find((t) => t.id === profile.team_id)?.color ||
                      "#ccc",
                  }}
                />
                <span className="font-semibold text-slate-800">
                  {teams.find((t) => t.id === profile.team_id)?.name ||
                    "Takim"}
                </span>
              </div>
              <button
                onClick={handleLeave}
                className="text-xs text-red-500 font-medium"
              >
                Ayril
              </button>
            </div>
          </div>
        )}

        {/* Create form */}
        {showCreate && (
          <form
            onSubmit={handleCreate}
            className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm space-y-3"
          >
            <input
              type="text"
              placeholder="Takim Adi"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm"
              required
            />
            <div>
              <p className="text-xs text-slate-500 mb-2">Renk sec:</p>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewColor(color)}
                    className="w-8 h-8 rounded-full border-2 transition-all"
                    style={{
                      backgroundColor: color,
                      borderColor:
                        newColor === color ? "#1e293b" : "transparent",
                      transform: newColor === color ? "scale(1.2)" : "scale(1)",
                    }}
                  />
                ))}
              </div>
            </div>
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <button
              type="submit"
              disabled={creating}
              className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {creating ? "Olusturuluyor..." : "Takim Kur"}
            </button>
          </form>
        )}

        {/* Team list */}
        <div className="space-y-2">
          {teams.map((team) => (
            <div
              key={team.id}
              className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-5 h-5 rounded-full"
                  style={{ backgroundColor: team.color }}
                />
                <div>
                  <p className="font-semibold text-slate-800 text-sm">
                    {team.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {team.member_count} uye
                  </p>
                </div>
              </div>
              {profile?.team_id !== team.id ? (
                <button
                  onClick={() => handleJoin(team.id)}
                  disabled={joining === team.id}
                  className="px-3 py-1 bg-slate-100 hover:bg-orange-100 text-slate-700 hover:text-orange-600 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {joining === team.id ? "..." : "Katil"}
                </button>
              ) : (
                <span className="text-xs text-green-600 font-medium">
                  Senin takimin
                </span>
              )}
            </div>
          ))}

          {teams.length === 0 && (
            <p className="text-center text-slate-400 text-sm py-8">
              Henuz takim yok. Ilk takimi sen kur!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
