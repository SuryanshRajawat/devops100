import { createFileRoute } from "@tanstack/react-router";
import { Bar as RBar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Award, Lock } from "lucide-react";
import { PageHeader, Bar } from "@/components/AppShell";
import { PHASES, DAYS } from "@/lib/curriculum";
import { useProgress, totalXp, levelInfo, streaks, completedCount, badges } from "@/lib/progress";

export const Route = createFileRoute("/progress")({
  head: () => ({
    meta: [
      { title: "Progress & Achievements — DevOps 100" },
      { name: "description", content: "XP, levels, streaks, phase completion, game high scores and badges." },
      { property: "og:title", content: "DevOps 100 Progress" },
      { property: "og:description", content: "Track your learning analytics and achievements." },
    ],
  }),
  component: ProgressPage,
});

const GAME_NAMES: Record<string, string> = { ports: "Port Challenge", docker: "Dockerfile Detective", pipeline: "Pipeline Builder", k8s: "Kubernetes Doctor", cmd: "Command Quest", incident: "Incident Commander" };

function ProgressPage() {
  const s = useProgress();
  const xp = totalXp(s);
  const lv = levelInfo(xp);
  const st = streaks(s.activeDates);
  const done = completedCount(s);
  const data = PHASES.map((p) => ({ name: `P${p.id}`, done: DAYS.filter((d) => d.phase.id === p.id && s.days[d.id]?.complete).length, total: p.to - p.from + 1 }));
  const bs = badges(s);
  const scores = Object.entries(s.best);

  return (
    <>
      <PageHeader title="Progress & Achievements" sub="Everything here is calculated from your saved activity." />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="panel p-4"><p className="text-xs text-muted-foreground">Level {lv.level}</p><p className="font-mono text-2xl font-bold">{xp} XP</p><div className="mt-2"><Bar value={lv.pct} label="Level progress" /></div><p className="mt-1 text-xs text-muted-foreground">{lv.needed - lv.into} XP to level {lv.level + 1}</p></div>
        <div className="panel p-4"><p className="text-xs text-muted-foreground">Days complete</p><p className="font-mono text-2xl font-bold">{done}/100</p></div>
        <div className="panel p-4"><p className="text-xs text-muted-foreground">Current streak</p><p className="font-mono text-2xl font-bold">{st.current} days</p></div>
        <div className="panel p-4"><p className="text-xs text-muted-foreground">Longest streak</p><p className="font-mono text-2xl font-bold">{st.longest} days</p></div>
      </div>

      <section className="panel mb-6 p-5">
        <h2 className="mb-4 font-semibold">Days completed per phase</h2>
        {done === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">Complete your first day to see this chart.</p> : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis allowDecimals={false} stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <RBar dataKey="total" fill="var(--muted)" radius={4} name="Total days" />
                <RBar dataKey="done" fill="var(--primary)" radius={4} name="Completed" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel p-5">
          <h2 className="mb-4 font-semibold">Badges ({bs.filter((b) => b.earned).length}/{bs.length})</h2>
          <ul className="grid gap-2 sm:grid-cols-2">{bs.map((b) => (
            <li key={b.id} className={`flex items-center gap-3 rounded-lg border p-3 text-sm ${b.earned ? "border-warning/40" : "border-border opacity-60"}`}>
              {b.earned ? <Award className="h-5 w-5 shrink-0 text-warning" aria-hidden /> : <Lock className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />}
              <div className="min-w-0"><p className="font-medium">{b.name} <span className="sr-only">{b.earned ? "earned" : "locked"}</span></p><p className="text-xs text-muted-foreground">{b.desc}</p></div>
            </li>
          ))}</ul>
        </section>
        <section className="panel p-5">
          <h2 className="mb-4 font-semibold">Arcade high scores</h2>
          {scores.length === 0 ? <p className="text-sm text-muted-foreground">Play a game in the Arcade to record a best score.</p> : (
            <ul className="space-y-2 text-sm">{scores.map(([k, v]) => { const [g = "", d = ""] = k.split(":"); return <li key={k} className="flex justify-between"><span>{GAME_NAMES[g] ?? g} <span className="text-xs text-muted-foreground">({d})</span></span><span className="font-mono">{v}</span></li>; })}</ul>
          )}
        </section>
      </div>

      {done === 100 && (
        <section className="panel glow mt-6 p-8 text-center">
          <p className="font-mono text-xs text-primary">CERTIFICATE OF COMPLETION</p>
          <h2 className="mt-2 text-3xl font-bold">{s.name || "DevOps Engineer"}</h2>
          <p className="mt-2 text-muted-foreground">completed all 100 days of DevOps 100 with {xp} XP and a longest streak of {st.longest} days.</p>
        </section>
      )}
    </>
  );
}
