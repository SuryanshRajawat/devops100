import { describe, it, expect } from "vitest";
import { DAYS } from "@/lib/curriculum";
import { claim, emptyState, totalXp, levelInfo, streaks, XP } from "@/lib/progress";
import { initialTerm, run } from "@/lib/terminal";

describe("curriculum", () => {
  it("has exactly 100 sequential days with unique titles and 3 quiz questions", () => {
    expect(DAYS).toHaveLength(100);
    expect(DAYS.map((d) => d.id)).toEqual(Array.from({ length: 100 }, (_, i) => i + 1));
    expect(new Set(DAYS.map((d) => d.title)).size).toBe(100);
    DAYS.forEach((d) => expect(d.quiz.length).toBeGreaterThanOrEqual(3));
  });
  it("maps phase boundaries correctly", () => {
    expect(DAYS[11]!.phase.id).toBe(1);
    expect(DAYS[12]!.phase.id).toBe(2);
    expect(DAYS[99]!.phase.id).toBe(10);
  });
});

describe("xp", () => {
  it("awards the same reward only once", () => {
    let s = claim(emptyState(), "lab:1", XP.lab, "2026-10-18");
    s = claim(s, "lab:1", XP.lab, "2026-10-18");
    expect(totalXp(s)).toBe(25);
  });
  it("uses the specified rewards", () => {
    expect(XP).toMatchObject({ theory: 10, lab: 25, quiz: 15, dayBonus: 10 });
  });
  it("computes levels", () => {
    expect(levelInfo(0).level).toBe(1);
    expect(levelInfo(100).level).toBe(2);
    expect(levelInfo(299).level).toBe(2);
    expect(levelInfo(300).level).toBe(3);
  });
});

describe("streaks", () => {
  it("counts consecutive local days and longest", () => {
    const r = streaks(["2026-10-10", "2026-10-11", "2026-10-12", "2026-10-16", "2026-10-17"], "2026-10-18");
    expect(r).toEqual({ current: 2, longest: 3 });
  });
  it("breaks the current streak after a missed day", () => {
    expect(streaks(["2026-10-15"], "2026-10-18").current).toBe(0);
  });
});

describe("terminal", () => {
  it("navigates and creates files in the virtual fs", () => {
    let t = initialTerm();
    t = run(t, "mkdir -p a/b").term;
    t = run(t, "cd a/b").term;
    expect(run(t, "pwd").output).toBe("/home/learner/a/b");
    t = run(t, "touch x.txt").term;
    expect(run(t, "ls").output).toContain("x.txt");
  });
  it("chmod sets execute bit", () => {
    const t = run(initialTerm(), "chmod u+x projects/deploy.sh").term;
    expect(t.fs["/home/learner/projects/deploy.sh"]!.mode).toBe("rwxr--r--");
  });
  it("grep filters lines and unknown commands are not executed", () => {
    expect(run(initialTerm(), "grep ERROR /var/log/app.log").output).toBe("2026-10-18 08:07:44 ERROR database connection refused (db:5432)");
    expect(run(initialTerm(), "nmap localhost").output).toContain("not implemented");
  });
});
