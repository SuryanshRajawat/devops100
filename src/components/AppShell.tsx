import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard, Map, Terminal, Gamepad2, FolderGit2, NotebookPen, BarChart3, Settings, Menu, X, Zap, Flame,
} from "lucide-react";
import { useProgress, totalXp, levelInfo, streaks } from "@/lib/progress";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/roadmap", label: "Roadmap", icon: Map },
  { to: "/playground", label: "Playground", icon: Terminal },
  { to: "/arcade", label: "Arcade", icon: Gamepad2 },
  { to: "/projects", label: "Projects", icon: FolderGit2 },
  { to: "/notes", label: "Notes", icon: NotebookPen },
  { to: "/progress", label: "Progress", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function NavList({ onNav }: { onNav?: () => void }) {
  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {NAV.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          onClick={onNav}
          activeOptions={{ exact: to === "/" }}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground data-[status=active]:bg-sidebar-accent data-[status=active]:text-primary"
        >
          <Icon className="h-4 w-4 shrink-0" aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2 font-mono text-sm font-bold">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">$_</span>
      <span>DevOps<span className="text-primary">100</span></span>
    </Link>
  );
}

function Stats() {
  const s = useProgress();
  const xp = totalXp(s);
  const lv = levelInfo(xp);
  const st = streaks(s.activeDates);
  return (
    <div className="panel space-y-2 p-3 text-xs">
      <div className="flex justify-between"><span className="text-muted-foreground">Level {lv.level}</span><span className="font-mono"><Zap className="mr-1 inline h-3 w-3 text-warning" aria-hidden />{xp} XP</span></div>
      <div className="h-1.5 rounded-full bg-muted" role="progressbar" aria-valuenow={lv.pct} aria-valuemin={0} aria-valuemax={100} aria-label="Level progress">
        <div className="h-full rounded-full bg-primary" style={{ width: `${lv.pct}%` }} />
      </div>
      <div className="text-muted-foreground"><Flame className="mr-1 inline h-3 w-3 text-warning" aria-hidden />{st.current}-day streak</div>
      <div className="rounded-md border border-warning/30 bg-warning/10 px-2 py-1 text-[11px] text-warning">Local demo mode — saved in this browser only</div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col gap-6 border-r border-sidebar-border bg-sidebar p-4 lg:flex">
        <Brand />
        <NavList />
        <div className="mt-auto"><Stats /></div>
      </aside>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-sidebar/95 px-4 py-3 backdrop-blur lg:hidden">
        <Brand />
        <button aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)} className="rounded-md p-2 hover:bg-muted">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>
      {open && (
        <div className="fixed inset-x-0 top-[57px] bottom-0 z-20 space-y-4 overflow-auto bg-sidebar p-4 lg:hidden">
          <NavList onNav={() => setOpen(false)} />
          <Stats />
        </div>
      )}
      <main className="lg:pl-60">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-10">{children}</div>
      </main>
    </div>
  );
}

export function PageHeader({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

export function Bar({ value, label }: { value: number; label: string }) {
  return (
    <div className="h-2 rounded-full bg-muted" role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-gradient-to-r from-primary to-cyan transition-all" style={{ width: `${value}%` }} />
    </div>
  );
}
