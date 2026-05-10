import { getCurrentUser } from "./auth";
import { getSupabaseClient } from "./supabase";
import { getDeviceId } from "./user";

export type Team = {
  id: string;
  code: string;
  name: string;
  members: number;
  places: number;
  pinCount: number;
  createdAt: number;
};

const KEY = "somr-teams";
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

type TeamRow = {
  id: string;
  code: string;
  name: string;
  members: number;
  places: number;
  pin_count: number;
  owner_device_id: string;
  owner_user_id: string | null;
  created_at: string;
};

function rowToTeam(row: TeamRow): Team {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    members: row.members,
    places: row.places,
    pinCount: row.pin_count,
    createdAt: new Date(row.created_at).getTime(),
  };
}

function getLocal(): Team[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Team[]) : [];
  } catch {
    return [];
  }
}

function setLocal(teams: Team[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(teams));
}

export async function getTeams(): Promise<Team[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const user = await getCurrentUser();
    let query = supabase
      .from("teams")
      .select("*")
      .order("created_at", { ascending: false });
    query = user
      ? query.eq("owner_user_id", user.id)
      : query.is("owner_user_id", null).eq("owner_device_id", getDeviceId());
    const { data, error } = await query;
    if (!error && data) {
      const teams = (data as TeamRow[]).map(rowToTeam);
      setLocal(teams);
      return teams;
    }
    console.warn("teams select failed — falling back to local", error);
  }
  return getLocal();
}

export async function addTeam(name: string): Promise<Team> {
  const pinCount = 3 + Math.floor(Math.random() * 3);
  const team: Team = {
    id: `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    code: generateCode(),
    name: name.trim(),
    members: 1,
    places: pinCount,
    pinCount,
    createdAt: Date.now(),
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    const user = await getCurrentUser();
    const row = {
      id: team.id,
      code: team.code,
      name: team.name,
      members: team.members,
      places: team.places,
      pin_count: team.pinCount,
      owner_device_id: getDeviceId(),
      owner_user_id: user?.id ?? null,
      created_at: new Date(team.createdAt).toISOString(),
    };
    const { error } = await supabase.from("teams").insert(row);
    if (error) console.warn("teams insert failed", error);
  }
  setLocal([team, ...getLocal()]);
  return team;
}

export async function updateTeamName(id: string, name: string): Promise<void> {
  const trimmed = name.trim();
  const supabase = getSupabaseClient();
  if (supabase) {
    const { error } = await supabase
      .from("teams")
      .update({ name: trimmed })
      .eq("id", id);
    if (error) console.warn("teams update failed", error);
  }
  const teams = getLocal();
  const idx = teams.findIndex((t) => t.id === id);
  if (idx !== -1) {
    teams[idx] = { ...teams[idx], name: trimmed };
    setLocal(teams);
  }
}

export async function removeTeam(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { error } = await supabase.from("teams").delete().eq("id", id);
    if (error) console.warn("teams delete failed", error);
  }
  setLocal(getLocal().filter((t) => t.id !== id));
}

/**
 * Claim teams previously created anonymously on this device for the now-logged-in user.
 * Call this after a successful auth to migrate device-owned teams to user ownership.
 */
export async function claimDeviceTeamsForUser(userId: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  const { error } = await supabase
    .from("teams")
    .update({ owner_user_id: userId })
    .is("owner_user_id", null)
    .eq("owner_device_id", getDeviceId());
  if (error) console.warn("teams claim failed", error);
}

function generateCode(): string {
  return Array.from(
    { length: 6 },
    () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)],
  ).join("");
}
