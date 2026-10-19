import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Lightbulb, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/AppShell";
import { initialTerm, run, MISSIONS, type Term } from "@/lib/terminal";
import { useProgress, award, XP } from "@/lib/progress";

export const Route = createFileRoute("/playground")({
  head: () => ({
    meta: [
      { title: "Linux Playground — DevOps 100" },
      { name: "description", content: "A safe, simulated Linux terminal with guided troubleshooting missions." },
      { property: "og:title", content: "Simulated Linux Terminal Playground" },
      { property: "og:description", content: "Practice Linux commands and missions safely in your browser." },
    ],
  }),
  component: Playground,
});

type Line = { kind: "in" | "out"; text: string; cwd?: string };

function Playground() {
  const s = useProgress();
  const [term, setTerm] = useState<Term>(initialTerm);
  const [lines, setLines] = useState<Line[]>([{ kind: "out", text: "DevOps 100 simulated shell. Type 'help'. Nothing here runs on a real machine." }]);
  const [input, setInput] = useState("");
  const [hist, setHist] = useState(-1);
  const [mission, setMission] = useState(MISSIONS[0]!.id);
  const [hints, setHints] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  const m = MISSIONS.find((x) => x.id === mission)!;

  useEffect(() => { endRef.current?.scrollIntoView({ block: "nearest" }); }, [lines]);

  const submit = () => {
    const res = run(term, input);
    setTerm(res.term);
    setHist(-1);
    setLines((l) => (res.clear ? [] : [...l, { kind: "in", text: input, cwd: term.cwd }, ...(res.output ? [{ kind: "out" as const, text: res.output }] : [])]));
    if (m.check(res.term, input, res.output) && !(`mission:${m.id}` in s.rewards)) {
      award(`mission:${m.id}`, XP.mission);
      toast.success(`Mission "${m.title}" complete! +${XP.mission} XP`);
    }
    setInput("");
  };

  const prompt = (cwd: string) => `${term.user}@sandbox:${cwd.replace("/home/learner", "~")}$`;

  return (
    <>
      <PageHeader title="Linux Playground" sub="Simulated terminal with an isolated virtual filesystem — not a real Linux VM.">
        <Button variant="outline" onClick={() => { setTerm(initialTerm()); setLines([]); }}><RotateCcw className="h-4 w-4" />Reset sandbox</Button>
      </PageHeader>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="panel overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border px-4 py-2 text-xs text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-full bg-destructive" /><span className="h-2.5 w-2.5 rounded-full bg-warning" /><span className="h-2.5 w-2.5 rounded-full bg-primary" />
            <span className="ml-2 font-mono">SIMULATION · sandbox</span>
          </div>
          <div className="h-[460px] overflow-y-auto bg-terminal p-4 font-mono text-sm" onClick={() => document.getElementById("term-in")?.focus()}>
            {lines.map((l, i) => (
              <pre key={i} className={`whitespace-pre-wrap break-words ${l.kind === "in" ? "text-foreground" : "text-muted-foreground"}`}>
                {l.kind === "in" ? <><span className="text-primary">{prompt(l.cwd!)}</span> {l.text}</> : l.text}
              </pre>
            ))}
            <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="flex gap-2">
              <label htmlFor="term-in" className="shrink-0 text-primary">{prompt(term.cwd)}</label>
              <input
                id="term-in"
                autoComplete="off"
                spellCheck={false}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowUp" && term.history.length) {
                    e.preventDefault();
                    const n = hist < 0 ? term.history.length - 1 : Math.max(0, hist - 1);
                    setHist(n); setInput(term.history[n] ?? "");
                  }
                }}
                className="min-w-0 flex-1 bg-transparent text-foreground outline-none"
                aria-label="Terminal command input"
              />
            </form>
            <div ref={endRef} />
          </div>
        </div>
        <aside className="space-y-3">
          <h2 className="font-semibold">Missions</h2>
          {MISSIONS.map((x) => {
            const done = `mission:${x.id}` in s.rewards;
            return (
              <button key={x.id} onClick={() => { setMission(x.id); setHints(0); }} aria-pressed={mission === x.id}
                className={`panel block w-full p-3 text-left text-sm transition-colors ${mission === x.id ? "border-primary" : "hover:bg-muted"}`}>
                <span className="flex items-center justify-between gap-2 font-medium">{x.title}{done ? <span className="flex items-center gap-1 text-xs text-primary"><CheckCircle2 className="h-3.5 w-3.5" />Done</span> : <span className="text-xs text-muted-foreground">+{XP.mission} XP</span>}</span>
              </button>
            );
          })}
          <div className="panel space-y-2 p-4 text-sm">
            <p className="font-medium text-cyan">Objective</p>
            <p>{m.objective}</p>
            {m.hints.slice(0, hints).map((h) => <p key={h} className="flex gap-2 text-muted-foreground"><Lightbulb className="h-4 w-4 shrink-0 text-warning" />{h}</p>)}
            {hints < m.hints.length && <Button size="sm" variant="ghost" onClick={() => setHints(hints + 1)}>Show hint</Button>}
          </div>
        </aside>
      </div>
    </>
  );
}
