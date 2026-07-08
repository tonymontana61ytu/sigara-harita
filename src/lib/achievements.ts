import { supabase } from "./supabase";

export interface AchievementDef {
  key: string;
  title: string;
  description: string;
  icon: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    key: "first_smoke",
    title: "Ilk Nefes",
    description: "Ilk sigarani isaretle",
    icon: "🚬",
  },
  {
    key: "smoke_10",
    title: "Acemi Tirakyar",
    description: "10 sigara isaretle",
    icon: "🌫️",
  },
  {
    key: "smoke_50",
    title: "Tecrubeli",
    description: "50 sigara isaretle",
    icon: "💨",
  },
  {
    key: "smoke_100",
    title: "Zincirleme",
    description: "100 sigara isaretle",
    icon: "🔗",
  },
  {
    key: "smoke_500",
    title: "Baca",
    description: "500 sigara isaretle",
    icon: "🏭",
  },
  {
    key: "night_owl",
    title: "Gece Kusu",
    description: "Gece 02:00 - 05:00 arasi sigara ic",
    icon: "🦉",
  },
  {
    key: "early_bird",
    title: "Erken Kalkan",
    description: "Sabah 05:00 - 07:00 arasi sigara ic",
    icon: "🐦",
  },
  {
    key: "explorer_5",
    title: "Gezgin",
    description: "5 farkli bolgede sigara ic",
    icon: "🧭",
  },
  {
    key: "explorer_20",
    title: "Kasif",
    description: "20 farkli bolgede sigara ic",
    icon: "🗺️",
  },
  {
    key: "team_player",
    title: "Takim Oyuncusu",
    description: "Bir takima katil",
    icon: "🤝",
  },
  {
    key: "photographer",
    title: "Fotografci",
    description: "Ilk sigara fotografini ekle",
    icon: "📸",
  },
  {
    key: "social",
    title: "Sosyal",
    description: "Ilk arkadasini ekle",
    icon: "👥",
  },
  {
    key: "streak_3",
    title: "3 Gun Seri",
    description: "3 gun ust uste sigara ic",
    icon: "🔥",
  },
  {
    key: "streak_7",
    title: "Haftalik Seri",
    description: "7 gun ust uste sigara ic",
    icon: "⚡",
  },
];

export async function checkAndUnlockAchievements(userId: string) {
  const { data: existing } = await supabase
    .from("achievements")
    .select("achievement_key")
    .eq("user_id", userId);

  const unlocked = new Set(existing?.map((a) => a.achievement_key) || []);
  const newAchievements: string[] = [];

  const { count: totalSmokes } = await supabase
    .from("smoke_markers")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  const total = totalSmokes || 0;

  if (total >= 1 && !unlocked.has("first_smoke")) newAchievements.push("first_smoke");
  if (total >= 10 && !unlocked.has("smoke_10")) newAchievements.push("smoke_10");
  if (total >= 50 && !unlocked.has("smoke_50")) newAchievements.push("smoke_50");
  if (total >= 100 && !unlocked.has("smoke_100")) newAchievements.push("smoke_100");
  if (total >= 500 && !unlocked.has("smoke_500")) newAchievements.push("smoke_500");

  const { data: lastSmoke } = await supabase
    .from("smoke_markers")
    .select("smoked_at")
    .eq("user_id", userId)
    .order("smoked_at", { ascending: false })
    .limit(1)
    .single();

  if (lastSmoke) {
    const hour = new Date(lastSmoke.smoked_at).getHours();
    if (hour >= 2 && hour < 5 && !unlocked.has("night_owl")) newAchievements.push("night_owl");
    if (hour >= 5 && hour < 7 && !unlocked.has("early_bird")) newAchievements.push("early_bird");
  }

  const { data: photos } = await supabase
    .from("smoke_markers")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .not("photo_url", "is", null);

  if ((photos as any)?.count >= 1 && !unlocked.has("photographer")) newAchievements.push("photographer");

  const { data: profile } = await supabase
    .from("profiles")
    .select("team_id")
    .eq("id", userId)
    .single();

  if (profile?.team_id && !unlocked.has("team_player")) newAchievements.push("team_player");

  const { count: friendCount } = await supabase
    .from("friendships")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if ((friendCount || 0) >= 1 && !unlocked.has("social")) newAchievements.push("social");

  // Bölge çeşitliliği (kabaca 0.005 derece = ~500m grid)
  const { data: locations } = await supabase
    .from("smoke_markers")
    .select("latitude, longitude")
    .eq("user_id", userId);

  if (locations) {
    const uniqueZones = new Set(
      locations.map(
        (l) => `${Math.round(l.latitude * 200)}:${Math.round(l.longitude * 200)}`
      )
    );
    if (uniqueZones.size >= 5 && !unlocked.has("explorer_5")) newAchievements.push("explorer_5");
    if (uniqueZones.size >= 20 && !unlocked.has("explorer_20")) newAchievements.push("explorer_20");
  }

  // Streak kontrolü
  const { data: allSmokes } = await supabase
    .from("smoke_markers")
    .select("smoked_at")
    .eq("user_id", userId)
    .order("smoked_at", { ascending: false });

  if (allSmokes && allSmokes.length > 0) {
    const days = new Set(
      allSmokes.map((s) => new Date(s.smoked_at).toISOString().split("T")[0])
    );
    const sortedDays = [...days].sort().reverse();
    let streak = 1;
    for (let i = 0; i < sortedDays.length - 1; i++) {
      const curr = new Date(sortedDays[i]);
      const prev = new Date(sortedDays[i + 1]);
      const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      if (diff === 1) streak++;
      else break;
    }
    if (streak >= 3 && !unlocked.has("streak_3")) newAchievements.push("streak_3");
    if (streak >= 7 && !unlocked.has("streak_7")) newAchievements.push("streak_7");
  }

  // Yeni basarimlari kaydet
  if (newAchievements.length > 0) {
    await supabase.from("achievements").insert(
      newAchievements.map((key) => ({
        user_id: userId,
        achievement_key: key,
      }))
    );
  }

  return newAchievements;
}
