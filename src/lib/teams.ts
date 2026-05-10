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

const SEED: Team[] = [
  {
    id: "1",
    code: "TRVL01",
    name: "여행 추억",
    members: 3,
    places: 12,
    pinCount: 5,
    createdAt: 0,
  },
  {
    id: "2",
    code: "FOOD02",
    name: "주말 맛집",
    members: 2,
    places: 5,
    pinCount: 3,
    createdAt: 0,
  },
  {
    id: "3",
    code: "DATE03",
    name: "Date Course",
    members: 4,
    places: 18,
    pinCount: 5,
    createdAt: 0,
  },
  {
    id: "4",
    code: "WALK04",
    name: "산책길",
    members: 2,
    places: 7,
    pinCount: 4,
    createdAt: 0,
  },
];

export function getTeams(): Team[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) {
      window.localStorage.setItem(KEY, JSON.stringify(SEED));
      return SEED;
    }
    return JSON.parse(raw) as Team[];
  } catch {
    return SEED;
  }
}

export function updateTeamName(id: string, name: string): void {
  const teams = getTeams();
  const idx = teams.findIndex((t) => t.id === id);
  if (idx === -1) return;
  teams[idx] = { ...teams[idx], name: name.trim() };
  window.localStorage.setItem(KEY, JSON.stringify(teams));
}

export function addTeam(name: string): Team {
  const teams = getTeams();
  const pinCount = 3 + Math.floor(Math.random() * 3); // 3..5
  const team: Team = {
    id: `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    code: generateCode(),
    name: name.trim(),
    members: 1,
    places: pinCount,
    pinCount,
    createdAt: Date.now(),
  };
  const updated = [team, ...teams];
  window.localStorage.setItem(KEY, JSON.stringify(updated));
  return team;
}

function generateCode(): string {
  return Array.from(
    { length: 6 },
    () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)],
  ).join("");
}
