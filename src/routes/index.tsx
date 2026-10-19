import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Flame, Trophy, Zap, CalendarCheck, Terminal, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Bar } from "@/components/AppShell";
import { DAYS, TOPICS, COMMAND_OF_DAY, getDay } from "@/lib/curriculum";
import { useProgress, totalXp, levelInfo, streaks, completedCount, currentDay, topicProgress, badges, localDate } from "@/lib/progress";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — DevOps 100" },
      { name: "description", content: "Your DevOps 100 dashboard: today's lesson, streaks, XP and topic progress." },
      { property: "og:title", content: "DevOps 100 — Learn by Doing" },
      { property: "og:description", content: "A 100-day hands-on DevOps learning journey with labs, games and a simulated terminal." },
    ],
  }),
  component: Dashboard,
});

function Stat({ icon: Icon, label, value }: { icon: typeof Zap; label: string; value: string }) {
  return (
    <div className="panel p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-4 w-4 text-primary" aria-hidden />{label}</div>
      <div className="mt-2 font-mono text-2xl font-bold">{value}</div>
    </div>
  );
}

function Heatmap({ dates }: { dates: string[] }) {
  const set = new Set(dates);
  const cells = Array.from({ length: 28 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (27 - i));
    const key = localDate(d);
    return { key, on: set.has(key) };
  });
  return (
    <div className="grid grid-cols-7 gap-1.5" aria-label="Activity over the last 4 weeks">
      {cells.map((c) => (
        <div key={c.key} title={`${c.key}${c.on ? " — active" : ""}`} className={`aspect-square rounded ${c.on ? "bg-primary" : "bg-muted"}`}>
          <span className="sr-only">{c.key} {c.on ? "active" : "inactive"}</span>
        </div>
      ))}
    </div>
  );
}

function Dashboard() {
  const s = useProgress();
  const xp = totalXp(s);
  const lv = levelInfo(xp);
  const st = streaks(s.activeDates);
  const done = completedCount(s);
  const cur = getDay(currentDay(s))!;
  const tp = topicProgress(s);
  const earned = badges(s).filter((b) => b.earned);
  const cmd = COMMAND_OF_DAY[new Date().getDate() % COMMAND_OF_DAY.length]!;
  const fresh = xp === 0 && done === 0;
  const upcoming = DAYS.filter((d) => d.id > cur.id).slice(0, 3);
  const weak = [...new Set(s.wrong.map((w) => w.dayId))].slice(-4).map((id) => getDay(id)!);

  return (
    <>
      <PageHeader title={s.name ? `Welcome back, ${s.name}` : "Welcome to DevOps 100"} sub="Learn the concept → do the lab → validate → explain it → track it." />

      <section className="panel glow grid-bg mb-6 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-xs text-primary">{fresh ? "START HERE" : `DAY ${cur.id} · ${cur.phase.name.toUpperCase()}`}</p>
          <h2 className="mt-1 text-xl font-bold sm:text-2xl">{fresh ? "Your 100-day journey begins with Day 1" : cur.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{fresh ? "Terminal basics — 60 minutes. Small daily wins compound." : cur.objectives[0]}</p>
        </div>
        <Button asChild size="lg" className="shrink-0">
          <Link to="/day/$dayId" params={{ dayId: String(cur.id) }}>{fresh ? "Start Day 1" : "Continue Learning"} <ArrowRight className="h-4 w-4" /></Link>
        </Button>
      </section>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat icon={CalendarCheck} label="Days completed" value={`${done}/100`} />
        <Stat icon={Zap} label={`Level ${lv.level}`} value={`${xp} XP`} />
        <Stat icon={Flame} label="Streak (longest)" value={`${st.current} (${st.longest})`} />
        <Stat icon={Trophy} label="Completion" value={`${done}%`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="panel p-5 lg:col-span-2">
          <h3 className="mb-4 font-semibold">Topic progress</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {TOPICS.map((t) => (
              <div key={t}>
                <div className="mb-1 flex justify-between text-sm"><span>{t}</span><span className="font-mono text-muted-foreground">{tp[t]}%</span></div>
                <Bar value={tp[t]} label={`${t} progress`} />
              </div>
            ))}
          </div>
        </section>
        <section className="panel p-5">
          <h3 className="mb-4 font-semibold">Last 4 weeks</h3>
          <Heatmap dates={s.activeDates} />
          <p className="mt-3 text-xs text-muted-foreground">{s.activeDates.length} active day(s) recorded</p>
        </section>

        <section className="panel p-5">
          <h3 className="mb-3 font-semibold">Recent badges</h3>
          {earned.length ? (
            <ul className="space-y-2">{earned.slice(-4).map((b) => <li key={b.id} className="flex items-center gap-2 text-sm"><Trophy className="h-4 w-4 text-warning" aria-hidden />{b.name}</li>)}</ul>
          ) : <p className="text-sm text-muted-foreground">No badges yet — complete Day 1 to earn "First Step".</p>}
        </section>
        <section className="panel p-5">
          <h3 className="mb-3 font-semibold">Up next</h3>
          <ul className="space-y-2 text-sm">
            {upcoming.map((d) => (
              <li key={d.id}><Link to="/day/$dayId" params={{ dayId: String(d.id) }} className="hover:text-primary"><span className="font-mono text-muted-foreground">D{d.id}</span> {d.title}</Link></li>
            ))}
          </ul>
        </section>
        <section className="panel p-5">
          <h3 className="mb-3 flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4 text-warning" aria-hidden />Needs revision</h3>
          {weak.length ? (
            <ul className="space-y-2 text-sm">{weak.map((d) => <li key={d.id}><Link to="/day/$dayId" params={{ dayId: String(d.id) }} className="hover:text-primary">D{d.id} · {d.title}</Link></li>)}</ul>
          ) : <p className="text-sm text-muted-foreground">Missed quiz questions will show up here.</p>}
        </section>

        <section className="panel p-5 lg:col-span-3">
          <h3 className="mb-2 flex items-center gap-2 font-semibold"><Terminal className="h-4 w-4 text-cyan" aria-hidden />Command of the day</h3>
          <code className="block rounded-lg bg-terminal p-3 font-mono text-sm text-primary">$ {cmd[0]}</code>
          <p className="mt-2 text-sm text-muted-foreground">{cmd[1]}</p>
        </section>
      </div>
    </>
  );
}
