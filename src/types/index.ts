export interface Team {
  id: string;
  name: string;
  color: string;
  owner_id: string | null;
  member_count: number;
  created_at: string;
}

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  friend_code: string | null;
  team_id: string | null;
  total_smokes: number;
  created_at: string;
  teams?: Team | null;
}

export interface SmokeMarker {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  smoked_at: string;
  photo_url: string | null;
  team_id: string | null;
  created_at: string;
  profiles?: {
    username: string;
    display_name: string;
    team_id: string | null;
  };
  teams?: Team | null;
}
