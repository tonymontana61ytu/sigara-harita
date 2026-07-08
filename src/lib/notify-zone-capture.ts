import { supabase } from "./supabase";

const ZONE_RADIUS = 75;

function getDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function notifyZoneCapture(
  latitude: number,
  longitude: number,
  currentUserId: string,
  currentTeamId: string | null,
  currentTeamName: string | null
) {
  if (!currentTeamId) return;

  const { data: allMarkers } = await supabase
    .from("smoke_markers")
    .select("user_id, team_id, latitude, longitude")
    .neq("user_id", currentUserId)
    .not("team_id", "is", null)
    .neq("team_id", currentTeamId);

  if (!allMarkers || allMarkers.length === 0) return;

  const affectedUsers = new Set<string>();

  for (const m of allMarkers) {
    const dist = getDistance(latitude, longitude, Number(m.latitude), Number(m.longitude));
    if (dist < ZONE_RADIUS) {
      affectedUsers.add(m.user_id);
    }
  }

  if (affectedUsers.size === 0) return;

  const notifications = Array.from(affectedUsers).map((userId) => ({
    user_id: userId,
    type: "zone_captured",
    title: "Bolgen ele gecirildi!",
    body: `${currentTeamName || "Bir takim"} senin bolgende sigara icti ve bolgeyi ele gecirdi.`,
    data: { latitude, longitude },
  }));

  await supabase.from("notifications").insert(notifications);
}
