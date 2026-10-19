import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Circle, CircleDot } from "lucide-react";
import { PageHeader, Bar } from "@/components/AppShell";
import { DAYS, PHASES } from "@/lib/curriculum";
import { useProgress } from "@/lib/progress";

export const Route = createFileRoute("/roadmap")({
  head: () => ({
    meta: [
      { title: "100-Day Roadmap — DevOps 100" },
      { name: "description", content: "Ten phases, one hundred hands-on days from Linux to production capstone." },
      { property: "og:title", content: "100-Day DevOps Roadmap" },
      { property: "og:description", content: "Linux, networking, Git, AWS, Docker, CI/CD, Kubernetes, Terraform, SRE and capstone." },
    ],
  }),
  component: Roadmap,
});

function Roadmap() {
  const s = useProgress();
  return (
    <>
      <PageHeader title="100-Day Roadmap" sub="Ten phases. Each day: theory, lab, quiz, then complete." />
      <div className="space-y-6">
        {PHASES.map((p) => {
          const days = DAYS.filter((d) => d.phase.id === p.id);
          const done = days.filter((d) => s.days[d.id]?.complete).length;
          return (
            <section key={p.id} className="panel p-5">
              <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="font-semibold"><span className="font-mono text-primary">P{p.id}</span> {p.name} <span className="text-xs text-muted-foreground">Days {p.from}–{p.to}</span></h2>
                <span className="font-mono text-xs text-muted-foreground">{done}/{days.length} done</span>
              </div>
              <Bar value={Math.round((done / days.length) * 100)} label={`${p.name} progress`} />
              <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {days.map((d) => {
                  const dp = s.days[d.id];
                  const state = dp?.complete ? "Complete" : dp && (dp.theory || dp.lab || dp.quiz) ? "In progress" : "Not started";
                  const Icon = dp?.complete ? CheckCircle2 : state === "In progress" ? CircleDot : Circle;
                  return (
                    <li key={d.id}>
                      <Link to="/day/$dayId" params={{ dayId: String(d.id) }} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:border-primary/50 hover:bg-muted">
                        <Icon className={`h-4 w-4 shrink-0 ${dp?.complete ? "text-primary" : state === "In progress" ? "text-warning" : "text-muted-foreground"}`} aria-hidden />
                        <span className="font-mono text-xs text-muted-foreground">{String(d.id).padStart(3, "0")}</span>
                        <span className="min-w-0 truncate">{d.title}</span>
                        <span className="sr-only">— {state}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
