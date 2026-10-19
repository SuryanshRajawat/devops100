import { useSyncExternalStore } from "react";
import { DAYS, PHASES, TOPICS, type Topic } from "./curriculum";

export type DayProgress = { theory: boolean; lab: boolean; quiz: boolean; complete: boolean; reflection: string };
export type Note = { id: string; title: string; body: string; tags: string[]; dayId?: number | undefined; updatedAt: number };
export type WrongAnswer = { dayId: number; qIndex: number; at: number };

export type State = {
  version: 1;
  name: string;
  days: Record<number, DayProgress>;
  rewards: Record<string, number>; // rewardKey -> xp (claimed once)
  activeDates: string[]; // YYYY-MM-DD local
  lastDay: number;
  notes: Note[];
  best: Record<string, number>;
  wrong: WrongAnswer[];
};

export const XP = { theory: 10, lab: 25, quiz: 15, dayBonus: 10, mission: 20 } as const;

export const emptyState = (): State => ({
  version: 1,
  name: "",
  days: {},
  rewards: {},
  activeDates: [],
  lastDay: 1,
  notes: [],
  best: {},
  wrong: [],
});

export const emptyDay = (): DayProgress => ({ theory: false, lab: false, quiz: false, complete: false, reflection: "" });

// ---------- pure helpers (tested) ----------
export function localDate(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function claim(s: State, key: string, xp: number, today = localDate()): State {
  if (key in s.rewards) return s;
  const activeDates = s.activeDates.includes(today) ? s.activeDates : [...s.activeDates, today];
  return { ...s, rewards: { ...s.rewards, [key]: xp }, activeDates };
}

export const totalXp = (s: State) => Object.values(s.rewards).reduce((a, b) => a + b, 0);

export function levelInfo(xp: number) {
  // Level n requires 100 * n * (n-1) / 2 XP cumulative → L1:0, L2:100, L3:300, L4:600...
  let level = 1;
  while (xp >= (100 * (level + 1) * level) / 2) level++;
  const base = (100 * level * (level - 1)) / 2;
  const next = (100 * (level + 1) * level) / 2;
  return { level, into: xp - base, needed: next - base, pct: Math.round(((xp - base) / (next - base)) * 100) };
}

function dayDiff(a: string, b: string) {
  const [y1, m1, d1] = a.split("-").map(Number);
  const [y2, m2, d2] = b.split("-").map(Number);
  return Math.round((Date.UTC(y2!, m2! - 1, d2) - Date.UTC(y1!, m1! - 1, d1)) / 86400000);
}

export function streaks(dates: string[], today = localDate()) {
  const sorted = [...new Set(dates)].sort();
  let longest = 0;
  let run = 0;
  for (let i = 0; i < sorted.length; i++) {
    run = i > 0 && dayDiff(sorted[i - 1]!, sorted[i]!) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  let current = 0;
  if (sorted.length) {
    const last = sorted[sorted.length - 1];
    const gap = dayDiff(last!, today);
    if (gap <= 1) {
      current = 1;
      for (let i = sorted.length - 1; i > 0 && dayDiff(sorted[i - 1]!, sorted[i]!) === 1; i--) current++;
    }
  }
  return { current, longest };
}

export const completedCount = (s: State) => Object.values(s.days).filter((d) => d.complete).length;

export function currentDay(s: State) {
  const first = DAYS.find((d) => !s.days[d.id]?.complete);
  return first?.id ?? 100;
}

export function topicProgress(s: State): Record<Topic, number> {
  const out = {} as Record<Topic, number>;
  for (const t of TOPICS) {
    const days = DAYS.filter((d) => d.phase.topic === t);
    const done = days.filter((d) => s.days[d.id]?.complete).length;
    out[t] = days.length ? Math.round((done / days.length) * 100) : 0;
  }
  return out;
}

export function phaseDone(s: State, phaseId: number) {
  const p = PHASES.find((x) => x.id === phaseId)!;
  for (let i = p.from; i <= p.to; i++) if (!s.days[i]?.complete) return false;
  return true;
}

export type Badge = { id: string; name: string; desc: string; earned: boolean };
export function badges(s: State): Badge[] {
  const done = completedCount(s);
  const st = streaks(s.activeDates);
  const xp = totalXp(s);
  return [
    { id: "first", name: "First Step", desc: "Complete Day 1", earned: !!s.days[1]?.complete },
    { id: "ten", name: "Double Digits", desc: "Complete 10 days", earned: done >= 10 },
    { id: "fifty", name: "Halfway Hero", desc: "Complete 50 days", earned: done >= 50 },
    { id: "streak7", name: "Week Warrior", desc: "7-day streak", earned: st.longest >= 7 },
    { id: "xp1000", name: "XP Grinder", desc: "Earn 1,000 XP", earned: xp >= 1000 },
    { id: "arcade", name: "Arcade Regular", desc: "Set a best score in 3 games", earned: Object.keys(s.best).length >= 3 },
    { id: "notes", name: "Note Taker", desc: "Write 5 notes", earned: s.notes.length >= 5 },
    ...PHASES.map((p) => ({ id: `phase${p.id}`, name: p.badge, desc: `Finish ${p.name}`, earned: phaseDone(s, p.id) })),
  ];
}

// ---------- store ----------
const KEY = "devops100:v1";
let state: State = emptyState();
let loaded = false;
const listeners = new Set<() => void>();
const SERVER = emptyState();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = { ...emptyState(), ...JSON.parse(raw) };
  } catch {
    /* corrupted storage: start fresh */
  }
}

export function setState(fn: (s: State) => State) {
  load();
  state = fn(state);
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full / blocked */
  }
  listeners.forEach((l) => l());
}

export function useProgress(): State {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => {
      load();
      return state;
    },
    () => SERVER,
  );
}

export const resetAll = () => setState(() => emptyState());

export function updateDay(id: number, patch: Partial<DayProgress>) {
  setState((s) => ({ ...s, days: { ...s.days, [id]: { ...emptyDay(), ...s.days[id], ...patch } } }));
}

export function award(key: string, xp: number): boolean {
  let granted = false;
  setState((s) => {
    const n = claim(s, key, xp);
    granted = n !== s;
    return n;
  });
  return granted;
}

export function recordBest(game: string, score: number): boolean {
  let isBest = false;
  setState((s) => {
    if ((s.best[game] ?? -1) >= score) return s;
    isBest = true;
    return { ...s, best: { ...s.best, [game]: score } };
  });
  return isBest;
}
