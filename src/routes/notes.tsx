import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Search, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/AppShell";
import { useProgress, setState, type Note } from "@/lib/progress";
import { getDay } from "@/lib/curriculum";

export const Route = createFileRoute("/notes")({
  head: () => ({
    meta: [
      { title: "Notes & Revision — DevOps 100" },
      { name: "description", content: "Personal technical notes, revision queue and a searchable command cheat sheet." },
      { property: "og:title", content: "DevOps Notes & Cheat Sheet" },
      { property: "og:description", content: "Tagged notes, revision of missed quiz questions and command reference." },
    ],
  }),
  component: Notes,
});

const TAGS = ["Linux", "Networking", "Git", "AWS", "Docker", "CI/CD", "Kubernetes", "Terraform", "Monitoring"];
const CHEAT: [string, string, string][] = [
  ["Linux", "ls -la", "List all files, long format"], ["Linux", "chmod 755 file", "rwx owner, rx others"], ["Linux", "ps aux --sort=-%cpu | head", "Top CPU processes"], ["Linux", "journalctl -u svc -f", "Follow service logs"], ["Linux", "df -h / du -sh *", "Disk usage"],
  ["Git", "git switch -c feat", "New branch"], ["Git", "git rebase -i HEAD~3", "Edit last 3 commits"], ["Git", "git reflog", "Recover lost commits"], ["Git", "git stash push -m msg", "Shelve changes"],
  ["Docker", "docker build -t app:1 .", "Build image"], ["Docker", "docker run -d -p 8080:80 nginx", "Run detached w/ port"], ["Docker", "docker logs -f c", "Follow logs"], ["Docker", "docker exec -it c sh", "Shell into container"], ["Docker", "docker system prune", "Clean unused data"],
  ["Kubernetes", "kubectl get pods -A", "All pods"], ["Kubernetes", "kubectl describe pod p", "Events & details"], ["Kubernetes", "kubectl logs -p p", "Previous container logs"], ["Kubernetes", "kubectl rollout undo deploy/x", "Rollback"], ["Kubernetes", "kubectl port-forward svc/x 8080:80", "Local access"],
  ["Terraform", "terraform plan -out tf.plan", "Save plan"], ["Terraform", "terraform state list", "Resources in state"], ["Terraform", "terraform fmt -recursive", "Format"],
  ["Networking", "ss -tulpn", "Listening ports"], ["Networking", "dig +short A host", "DNS lookup"], ["Networking", "curl -sI url", "Headers only"], ["Networking", "traceroute host", "Path hops"],
];

const blank = (): Omit<Note, "id" | "updatedAt"> => ({ title: "", body: "", tags: [] });

function Notes() {
  const s = useProgress();
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [edit, setEdit] = useState<(Omit<Note, "id" | "updatedAt"> & { id?: string }) | null>(null);
  const [cq, setCq] = useState("");

  const filtered = useMemo(
    () => s.notes.filter((n) => (!tag || n.tags.includes(tag)) && (n.title + n.body).toLowerCase().includes(q.toLowerCase())).sort((a, b) => b.updatedAt - a.updatedAt),
    [s.notes, q, tag],
  );
  const revision = useMemo(() => {
    const seen = new Map<number, number[]>();
    for (const w of s.wrong) seen.set(w.dayId, [...(seen.get(w.dayId) ?? []), w.qIndex]);
    return [...seen.entries()];
  }, [s.wrong]);

  const save = () => {
    if (!edit) return;
    if (!edit.title.trim()) { toast.error("Title is required"); return; }
    setState((st) => {
      const now = Date.now();
      const notes = edit.id
        ? st.notes.map((n) => (n.id === edit.id ? { ...n, ...edit, id: n.id, updatedAt: now } : n))
        : [...st.notes, { ...edit, id: `${now}-${Math.random().toString(36).slice(2, 7)}`, updatedAt: now }];
      return { ...st, notes };
    });
    toast.success("Note saved");
    setEdit(null);
  };

  return (
    <>
      <PageHeader title="Notes & Revision" sub="Your notes are stored in this browser (local demo mode).">
        <Button onClick={() => setEdit(blank())}><Plus className="h-4 w-4" />New note</Button>
      </PageHeader>

      {edit && (
        <section className="panel mb-6 space-y-3 p-5">
          <Input aria-label="Note title" placeholder="Title" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
          <Textarea aria-label="Note body" rows={6} placeholder="What did you learn?" value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} />
          <div className="flex flex-wrap gap-2">{TAGS.map((t) => (
            <button key={t} aria-pressed={edit.tags.includes(t)} onClick={() => setEdit({ ...edit, tags: edit.tags.includes(t) ? edit.tags.filter((x) => x !== t) : [...edit.tags, t] })}
              className={`rounded-full border px-3 py-1 text-xs ${edit.tags.includes(t) ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>{edit.tags.includes(t) ? "✓ " : ""}{t}</button>
          ))}</div>
          <label className="flex items-center gap-2 text-sm">Linked day
            <Input type="number" min={1} max={100} className="w-24" value={edit.dayId ?? ""} onChange={(e) => { const v = Number(e.target.value); setEdit({ ...edit, dayId: v >= 1 && v <= 100 ? v : undefined }); }} />
          </label>
          <div className="flex gap-2"><Button onClick={save}>Save</Button><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button></div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section>
          <div className="mb-3 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input aria-label="Search notes" className="pl-9" placeholder="Search notes" value={q} onChange={(e) => setQ(e.target.value)} /></div>
            <select aria-label="Filter by tag" className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={tag ?? ""} onChange={(e) => setTag(e.target.value || null)}>
              <option value="">All tags</option>{TAGS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          {filtered.length === 0 ? (
            <div className="panel p-8 text-center text-sm text-muted-foreground">{s.notes.length ? "No notes match your search." : "No notes yet. Capture one thing you learned today."}</div>
          ) : (
            <ul className="space-y-3">{filtered.map((n) => (
              <li key={n.id} className="panel p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="min-w-0 font-semibold">{n.title}</h3>
                  <div className="flex shrink-0 gap-1">
                    <Button size="icon" variant="ghost" aria-label="Edit note" onClick={() => setEdit(n)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" aria-label="Delete note" onClick={() => { if (confirm("Delete this note?")) { setState((st) => ({ ...st, notes: st.notes.filter((x) => x.id !== n.id) })); toast("Note deleted"); } }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{n.body}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {n.tags.map((t) => <span key={t} className="rounded bg-accent px-2 py-0.5 text-accent-foreground">{t}</span>)}
                  {n.dayId && <Link to="/day/$dayId" params={{ dayId: String(n.dayId) }} className="rounded border border-border px-2 py-0.5 hover:text-primary">Day {n.dayId}</Link>}
                </div>
              </li>
            ))}</ul>
          )}
        </section>

        <aside className="space-y-6">
          <section className="panel p-4">
            <h2 className="mb-3 font-semibold">Revision queue</h2>
            {revision.length === 0 ? <p className="text-sm text-muted-foreground">Questions you miss in daily quizzes appear here.</p> : (
              <ul className="space-y-3 text-sm">{revision.map(([dayId, qs]) => {
                const d = getDay(dayId)!;
                return (
                  <li key={dayId}>
                    <Link to="/day/$dayId" params={{ dayId: String(dayId) }} className="font-medium hover:text-primary">Day {dayId}: {d.title}</Link>
                    <ul className="mt-1 list-disc pl-5 text-muted-foreground">{qs.map((i) => <li key={i}>{d.quiz[i]!.q} → <span className="text-primary">{d.quiz[i]!.options[d.quiz[i]!.answer]}</span></li>)}</ul>
                  </li>
                );
              })}</ul>
            )}
          </section>
          <section className="panel p-4">
            <h2 className="mb-3 font-semibold">Command cheat sheet</h2>
            <Input aria-label="Search commands" placeholder="Search e.g. docker, logs" value={cq} onChange={(e) => setCq(e.target.value)} className="mb-3" />
            <ul className="max-h-96 space-y-2 overflow-auto text-xs">
              {CHEAT.filter((c) => c.join(" ").toLowerCase().includes(cq.toLowerCase())).map(([t, c, d]) => (
                <li key={c}><code className="font-mono text-primary">{c}</code><p className="text-muted-foreground">{t} · {d}</p></li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </>
  );
}
