import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, CheckCircle2, Clock, BookOpen, FlaskConical, HelpCircle, Wrench, MessageSquare, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getDay, type Day } from "@/lib/curriculum";
import { useProgress, updateDay, award, setState, emptyDay, XP } from "@/lib/progress";

export const Route = createFileRoute("/day/$dayId")({
  loader: ({ params }) => {
    const day = getDay(Number(params.dayId));
    if (!day) throw notFound();
    return { id: day.id, title: day.title, phase: day.phase.name };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `Day ${loaderData.id}: ${loaderData.title} — DevOps 100` },
          { name: "description", content: `${loaderData.phase} — lesson, hands-on lab, quiz and interview prep.` },
          { property: "og:title", content: `Day ${loaderData.id}: ${loaderData.title}` },
          { property: "og:description", content: `Hands-on DevOps lesson from ${loaderData.phase}.` },
        ]
      : [{ title: "Lesson unavailable — DevOps 100" }, { name: "robots", content: "noindex" }],
  }),
  component: DayPage,
});

function Section({ icon: Icon, title, children }: { icon: typeof BookOpen; title: string; children: React.ReactNode }) {
  return (
    <section className="panel p-5">
      <h2 className="mb-3 flex items-center gap-2 font-semibold"><Icon className="h-4 w-4 text-primary" aria-hidden />{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

function Quiz({ day }: { day: Day }) {
  const s = useProgress();
  const dp = s.days[day.id] ?? emptyDay();
  const [answers, setAnswers] = useState<(number | null)[]>(() => day.quiz.map(() => null));
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => { setAnswers(day.quiz.map(() => null)); setSubmitted(false); }, [day.id, day.quiz]);
  const score = answers.filter((a, i) => a === day.quiz[i]!.answer).length;
  const passed = submitted && score === day.quiz.length;

  const submit = () => {
    setSubmitted(true);
    const wrongIdx = day.quiz.map((q, i) => (answers[i] === q.answer ? -1 : i)).filter((i) => i >= 0);
    if (!wrongIdx.length) {
      updateDay(day.id, { quiz: true });
      const got = award(`quiz:${day.id}`, XP.quiz);
      toast.success(got ? `Quiz passed! +${XP.quiz} XP` : "Quiz passed (XP already claimed)");
    } else {
      setState((st) => ({
        ...st,
        wrong: [...st.wrong.filter((w) => w.dayId !== day.id), ...wrongIdx.map((qIndex) => ({ dayId: day.id, qIndex, at: Date.now() }))],
      }));
    }
  };

  return (
    <div className="space-y-4">
      {dp.quiz && <p className="flex items-center gap-2 text-primary"><CheckCircle2 className="h-4 w-4" />Quiz complete</p>}
      {day.quiz.map((q, i) => (
        <fieldset key={i} className="space-y-2">
          <legend className="font-medium">{i + 1}. {q.q}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {q.options.map((o, j) => {
              const chosen = answers[i] === j;
              const correct = submitted && j === q.answer;
              const wrong = submitted && chosen && j !== q.answer;
              return (
                <label key={j} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 ${correct ? "border-primary bg-primary/10" : wrong ? "border-destructive bg-destructive/10" : chosen ? "border-cyan" : "border-border hover:bg-muted"}`}>
                  <input type="radio" name={`q${i}`} className="accent-[var(--primary)]" checked={chosen} disabled={submitted} onChange={() => setAnswers((a) => a.map((v, k) => (k === i ? j : v)))} />
                  <span>{o}</span>
                  {correct && <span className="ml-auto text-xs text-primary">✓ correct</span>}
                  {wrong && <span className="ml-auto text-xs text-destructive">✗ your answer</span>}
                </label>
              );
            })}
          </div>
          {submitted && <p className="text-xs text-muted-foreground">Why: {q.why}</p>}
        </fieldset>
      ))}
      {!submitted ? (
        <Button onClick={submit} disabled={answers.some((a) => a === null)}>Submit answers</Button>
      ) : passed ? (
        <p className="font-medium text-primary">Score {score}/{day.quiz.length} — passed!</p>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-medium text-warning">Score {score}/{day.quiz.length}. Review the explanations above.</p>
          <Button variant="outline" onClick={() => { setAnswers(day.quiz.map(() => null)); setSubmitted(false); }}>Retry</Button>
          {!dp.quiz && (
            <Button variant="secondary" onClick={() => { updateDay(day.id, { quiz: true }); toast("Marked reviewed. Added to revision queue — pass it later to earn XP."); }}>
              I reviewed my mistakes
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function DayPage() {
  const { id } = Route.useLoaderData();
  const day = getDay(id)!;
  const s = useProgress();
  const dp = s.days[day.id] ?? emptyDay();
  const [reflection, setReflection] = useState("");

  useEffect(() => { setState((st) => (st.lastDay === day.id ? st : { ...st, lastDay: day.id })); }, [day.id]);
  useEffect(() => { setReflection(dp.reflection); }, [day.id, dp.reflection]);

  const mark = (part: "theory" | "lab") => {
    updateDay(day.id, { [part]: true });
    const got = award(`${part}:${day.id}`, XP[part]);
    toast.success(got ? `+${XP[part]} XP` : "Already claimed");
  };
  const complete = () => {
    updateDay(day.id, { complete: true });
    const got = award(`day:${day.id}`, XP.dayBonus);
    toast.success(got ? `Day ${day.id} complete! +${XP.dayBonus} bonus XP` : `Day ${day.id} complete`);
  };
  const canComplete = dp.theory && dp.lab && dp.quiz;

  return (
    <article className="space-y-5">
      <header className="panel grid-bg p-6">
        <p className="font-mono text-xs text-primary">DAY {day.id} · PHASE {day.phase.id} — {day.phase.name}</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{day.title}</h1>
        <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><Clock className="h-4 w-4" />~{day.minutes} min {day.detailed && <span className="rounded bg-accent px-2 py-0.5 text-xs text-accent-foreground">Deep-dive lesson</span>}</p>
        <ul className="mt-4 flex flex-wrap gap-2 text-xs">
          {(["theory", "lab", "quiz", "complete"] as const).map((k) => (
            <li key={k} className={`rounded-full border px-3 py-1 ${dp[k] ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>{dp[k] ? "✓" : "○"} {k}</li>
          ))}
        </ul>
      </header>

      <Section icon={BookOpen} title="Objectives & theory">
        <ul className="list-disc space-y-1 pl-5">{day.objectives.map((o) => <li key={o}>{o}</li>)}</ul>
        <p>{day.theory}</p>
        <p className="rounded-lg border border-border bg-muted/50 p-3"><strong>Real world:</strong> {day.example}</p>
        <Button variant={dp.theory ? "secondary" : "default"} disabled={dp.theory} onClick={() => mark("theory")}>{dp.theory ? "Theory complete ✓" : `Mark Theory Complete (+${XP.theory} XP)`}</Button>
      </Section>

      <Section icon={Languages} title="Two ways to explain it">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg bg-muted/50 p-3"><p className="mb-1 text-xs font-semibold text-cyan">HINGLISH</p>{day.hinglish}</div>
          <div className="rounded-lg bg-muted/50 p-3"><p className="mb-1 text-xs font-semibold text-cyan">INTERVIEW-READY</p>{day.interview}</div>
        </div>
      </Section>

      <Section icon={FlaskConical} title="Commands & practical lab">
        <pre className="overflow-x-auto rounded-lg bg-terminal p-4 font-mono text-xs text-primary">{day.commands.map((c) => `$ ${c}`).join("\n")}</pre>
        <p><strong>Task:</strong> {day.task}</p>
        <ol className="list-decimal space-y-1 pl-5">{day.steps.map((st, i) => <li key={i}>{st}</li>)}</ol>
        <p className="rounded-lg border border-primary/30 bg-primary/5 p-3"><strong>Validation:</strong> {day.validation}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant={dp.lab ? "secondary" : "default"} disabled={dp.lab} onClick={() => mark("lab")}>{dp.lab ? "Lab complete ✓" : `Mark Lab Complete (+${XP.lab} XP)`}</Button>
          <Button variant="outline" asChild><Link to="/playground">Open Playground</Link></Button>
        </div>
      </Section>

      <Section icon={HelpCircle} title="Quiz"><Quiz day={day} /></Section>

      <Section icon={Wrench} title="Troubleshooting scenario">
        <p><strong>Symptom:</strong> {day.troubleshooting.scenario}</p>
        <details className="rounded-lg border border-border p-3"><summary className="cursor-pointer font-medium">Reveal fix</summary><p className="mt-2">{day.troubleshooting.fix}</p></details>
      </Section>

      <Section icon={MessageSquare} title="Interview questions">
        <ul className="list-disc space-y-1 pl-5">{day.interviewQs.map((q) => <li key={q}>{q}</li>)}</ul>
      </Section>

      <Section icon={BookOpen} title="Reflection & notes">
        <label htmlFor="reflection" className="sr-only">Reflection</label>
        <Textarea id="reflection" rows={4} value={reflection} onChange={(e) => setReflection(e.target.value)} placeholder="What did you learn? What broke? What would you explain differently?" />
        <Button variant="outline" onClick={() => { updateDay(day.id, { reflection }); toast.success("Reflection saved"); }}>Save reflection</Button>
      </Section>

      <div className="panel flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{dp.complete ? "This day is complete. Nice work." : canComplete ? "All parts done — finish the day!" : "Complete theory, lab and quiz to finish the day."}</p>
        <Button size="lg" disabled={!canComplete || dp.complete} onClick={complete}>{dp.complete ? "Day complete ✓" : "Complete Day"}</Button>
      </div>

      <nav className="flex justify-between" aria-label="Day navigation">
        {day.id > 1 ? <Button variant="ghost" asChild><Link to="/day/$dayId" params={{ dayId: String(day.id - 1) }}><ChevronLeft className="h-4 w-4" />Day {day.id - 1}</Link></Button> : <span />}
        {day.id < 100 ? <Button variant="ghost" asChild><Link to="/day/$dayId" params={{ dayId: String(day.id + 1) }}>Day {day.id + 1}<ChevronRight className="h-4 w-4" /></Link></Button> : <span />}
      </nav>
    </article>
  );
}
