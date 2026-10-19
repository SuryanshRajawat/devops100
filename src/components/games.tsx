import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Timer, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProgress, recordBest, award } from "@/lib/progress";

export type Difficulty = "easy" | "medium" | "hard";
const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);

function finish(id: string, diff: Difficulty, score: number, max: number) {
  const best = recordBest(`${id}:${diff}`, score);
  const xp = Math.round((score / Math.max(1, max)) * 40);
  const got = xp > 0 && award(`game:${id}:${diff}`, xp);
  toast.success(`Score ${score}/${max}${best ? " — new best!" : ""}${got ? ` +${xp} XP` : ""}`);
}

function Frame({ id, title, rules, diff, setDiff, playing, onStart, children }: {
  id: string; title: string; rules: string; diff: Difficulty; setDiff: (d: Difficulty) => void; playing: boolean; onStart: () => void; children: ReactNode;
}) {
  const s = useProgress();
  const best = s.best[`${id}:${diff}`];
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="text-sm text-muted-foreground">{rules}</p>
        </div>
        <p className="flex shrink-0 items-center gap-1 font-mono text-sm"><Trophy className="h-4 w-4 text-warning" aria-hidden />Best: {best ?? "—"}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Difficulty:</span>
        {(["easy", "medium", "hard"] as const).map((d) => (
          <Button key={d} size="sm" variant={diff === d ? "default" : "outline"} disabled={playing} onClick={() => setDiff(d)} aria-pressed={diff === d}>{d}</Button>
        ))}
        <Button size="sm" variant="secondary" onClick={onStart} className="ml-auto">{playing ? "Restart" : "Start"}</Button>
      </div>
      {children}
    </div>
  );
}

// ---------- Generic MCQ rounds (used by several games) ----------
type Round = { prompt: ReactNode; options: string[]; answer: number; why: string };
function useRounds() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [over, setOver] = useState(false);
  return { rounds, setRounds, i, setI, score, setScore, picked, setPicked, over, setOver };
}

function Rounds({ r, onDone }: { r: ReturnType<typeof useRounds>; onDone: (score: number) => void }) {
  const cur = r.rounds[r.i];
  if (r.over) return <div className="panel p-6 text-center"><p className="text-2xl font-bold">Score {r.score}/{r.rounds.length}</p><p className="text-sm text-muted-foreground">Press Restart to play again.</p></div>;
  if (!cur) return <div className="panel p-6 text-center text-muted-foreground">Pick a difficulty and press Start.</div>;
  const next = () => {
    if (r.i + 1 >= r.rounds.length) { r.setOver(true); onDone(r.score); }
    else { r.setI(r.i + 1); r.setPicked(null); }
  };
  return (
    <div className="panel space-y-4 p-5">
      <p className="font-mono text-xs text-muted-foreground">Round {r.i + 1}/{r.rounds.length} · Score {r.score}</p>
      <div>{cur.prompt}</div>
      <div className="grid gap-2 sm:grid-cols-2">
        {cur.options.map((o, j) => {
          const show = r.picked !== null;
          const cls = show && j === cur.answer ? "border-primary bg-primary/10" : show && j === r.picked ? "border-destructive bg-destructive/10" : "border-border hover:bg-muted";
          return (
            <button key={j} disabled={show} onClick={() => { r.setPicked(j); if (j === cur.answer) r.setScore(r.score + 1); }} className={`rounded-lg border px-3 py-2 text-left text-sm ${cls}`}>
              {o}{show && j === cur.answer && " ✓"}{show && j === r.picked && j !== cur.answer && " ✗"}
            </button>
          );
        })}
      </div>
      {r.picked !== null && (
        <div className="space-y-3">
          <p className={`text-sm ${r.picked === cur.answer ? "text-primary" : "text-destructive"}`}>{r.picked === cur.answer ? "Correct!" : "Not quite."} <span className="text-muted-foreground">{cur.why}</span></p>
          <Button onClick={next}>{r.i + 1 >= r.rounds.length ? "Finish" : "Next"}</Button>
        </div>
      )}
    </div>
  );
}

// ---------- A: Port Challenge ----------
const PORTS: [string, number][] = [["SSH", 22], ["DNS", 53], ["HTTP", 80], ["HTTPS", 443], ["PostgreSQL", 5432], ["MySQL", 3306], ["Redis", 6379], ["SMTP", 25], ["FTP", 21], ["RDP", 3389], ["MongoDB", 27017], ["Kubernetes API", 6443], ["Prometheus", 9090], ["Grafana", 3000], ["NTP", 123]];
export function PortGame() {
  const [diff, setDiff] = useState<Difficulty>("easy");
  const [q, setQ] = useState<{ name: string; port: number; opts: number[] }[]>([]);
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(0);
  const [fb, setFb] = useState("");
  const playing = time > 0;
  const pool = diff === "easy" ? PORTS.slice(0, 5) : diff === "medium" ? PORTS.slice(0, 10) : PORTS;
  const start = () => {
    const qs = shuffle(Array.from({ length: 10 }, () => pool[Math.floor(Math.random() * pool.length)]!)).map(([name, port]) => ({
      name, port, opts: shuffle([port, ...shuffle(PORTS.filter((p) => p[1] !== port)).slice(0, 3).map((p) => p[1])]),
    }));
    setQ(qs); setI(0); setScore(0); setFb(""); setTime(diff === "hard" ? 30 : diff === "medium" ? 45 : 60);
  };
  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => setTime((x) => { if (x - 1 <= 0) finish("ports", diff, score, 10); return x - 1; }), 1000);
    return () => clearTimeout(t);
  }, [time, playing, diff, score]);
  const pick = (p: number) => {
    const c = q[i]!;
    const ok = p === c.port;
    const ns = score + (ok ? 1 : 0);
    setScore(ns);
    setFb(ok ? `✓ ${c.name} = ${c.port}` : `✗ ${c.name} uses ${c.port}, not ${p}`);
    if (i + 1 >= q.length) { setTime(0); finish("ports", diff, ns, 10); } else setI(i + 1);
  };
  return (
    <Frame id="ports" title="Port Number Challenge" rules="Match each service to its default port before the timer runs out. 10 questions." diff={diff} setDiff={setDiff} playing={playing} onStart={start}>
      <div className="panel space-y-4 p-5">
        {playing && q[i] ? (
          <>
            <div className="flex justify-between font-mono text-sm"><span>Q{i + 1}/10 · Score {score}</span><span className="flex items-center gap-1 text-warning"><Timer className="h-4 w-4" />{time}s</span></div>
            <p className="text-2xl font-bold">{q[i].name}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{q[i].opts.map((o) => <Button key={o} variant="outline" className="font-mono" onClick={() => pick(o)}>{o}</Button>)}</div>
          </>
        ) : <p className="text-center text-muted-foreground">{q.length ? `Final score: ${score}/10` : "Press Start to begin."}</p>}
        {fb && <p className={`text-sm ${fb.startsWith("✓") ? "text-primary" : "text-destructive"}`}>{fb}</p>}
      </div>
    </Frame>
  );
}

// ---------- B: Dockerfile Detective ----------
const DOCKER: { lines: string[]; bad: number; fix: string[]; ans: number; why: string; level: Difficulty }[] = [
  { lines: ["FROM node:20-alpine", "WORKDIR /app", "COPY . .", "RUN npm ci", "CMD npm start"], bad: 2, fix: ["COPY package*.json ./ then RUN npm ci then COPY . .", "ADD . .", "COPY . /", "Remove COPY"], ans: 0, why: "Copying manifests first keeps the dependency layer cached.", level: "easy" },
  { lines: ["FROM python:3.12", "RUN pip install -r requirements.txt", "COPY . /app", "CMD [\"python\", \"app.py\"]"], bad: 1, fix: ["Move COPY requirements.txt before RUN pip install", "Use RUN pip3", "Use CMD pip install", "Add EXPOSE"], ans: 0, why: "requirements.txt doesn't exist in the image until it's copied.", level: "easy" },
  { lines: ["FROM ubuntu", "RUN apt-get install -y curl", "CMD [\"curl\", \"--version\"]"], bad: 1, fix: ["RUN apt-get update && apt-get install -y curl", "RUN apt install curl", "RUN yum install curl", "RUN curl install"], ans: 0, why: "Package lists are empty in fresh images; update and install in one layer.", level: "medium" },
  { lines: ["FROM node:20", "ENV DB_PASSWORD=supersecret", "COPY . .", "CMD [\"node\", \"server.js\"]"], bad: 1, fix: ["Inject DB_PASSWORD at runtime via secrets/env", "Use ARG DB_PASSWORD", "Base64 the password", "Put it in a comment"], ans: 0, why: "ENV values are baked into image metadata and visible to anyone with the image.", level: "medium" },
  { lines: ["FROM golang:1.22", "WORKDIR /src", "COPY . .", "RUN go build -o app", "CMD [\"./app\"]"], bad: 0, fix: ["Use multi-stage: build in golang, run in distroless/alpine", "Use golang:latest", "Add RUN go test", "Use ENTRYPOINT"], ans: 0, why: "The final image ships the whole Go toolchain (~800MB); multi-stage keeps only the binary.", level: "hard" },
  { lines: ["FROM nginx:alpine", "COPY site/ /usr/share/nginx/html", "USER root", "EXPOSE 80"], bad: 2, fix: ["Run as non-root user (e.g. nginx-unprivileged on 8080)", "USER admin", "Remove EXPOSE", "chmod 777 /"], ans: 0, why: "Least privilege: avoid running containers as root.", level: "hard" },
];
export function DockerGame() {
  const [diff, setDiff] = useState<Difficulty>("easy");
  const r = useRounds();
  const [playing, setPlaying] = useState(false);
  const start = () => {
    const pool = DOCKER.filter((d) => diff === "hard" || d.level === diff || (diff === "medium" && d.level === "easy"));
    r.setRounds(shuffle(pool).flatMap((d) => [
      { prompt: <><p className="mb-2 text-sm">Which line is broken?</p><pre className="rounded-lg bg-terminal p-3 font-mono text-xs">{d.lines.map((l, k) => `${k + 1}  ${l}`).join("\n")}</pre></>, options: d.lines.map((l, k) => `Line ${k + 1}: ${l}`), answer: d.bad, why: `Line ${d.bad + 1} is the problem.` },
      { prompt: <p className="text-sm">Best fix for <code className="font-mono text-cyan">{d.lines[d.bad]}</code>?</p>, options: d.fix, answer: d.ans, why: d.why },
    ]));
    r.setI(0); r.setScore(0); r.setPicked(null); r.setOver(false); setPlaying(true);
  };
  return (
    <Frame id="docker" title="Dockerfile Detective" rules="Spot the broken instruction, then choose the correct fix." diff={diff} setDiff={setDiff} playing={playing} onStart={start}>
      <Rounds r={r} onDone={(sc) => { setPlaying(false); finish("docker", diff, sc, r.rounds.length); }} />
    </Frame>
  );
}

// ---------- C: Pipeline Builder ----------
const STAGES = ["checkout", "install dependencies", "lint", "test", "build", "security scan", "package", "deploy", "verify"];
export function PipelineGame() {
  const [diff, setDiff] = useState<Difficulty>("easy");
  const target = diff === "easy" ? STAGES.filter((s) => !["lint", "security scan"].includes(s)) : diff === "medium" ? STAGES.filter((s) => s !== "security scan") : STAGES;
  const [pool, setPool] = useState<string[]>([]);
  const [built, setBuilt] = useState<string[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const playing = pool.length > 0 || (built.length > 0 && !result);
  const start = () => { setPool(shuffle(target)); setBuilt([]); setResult(null); };
  const check = () => {
    const sc = built.filter((b, k) => b === target[k]).length;
    setResult(`${sc}/${target.length} stages in the correct position. Correct order: ${target.join(" → ")}`);
    finish("pipeline", diff, sc, target.length);
  };
  return (
    <Frame id="pipeline" title="CI/CD Pipeline Builder" rules="Click stages in the order they should run. Click a placed stage to remove it." diff={diff} setDiff={setDiff} playing={playing} onStart={start}>
      <div className="panel space-y-4 p-5">
        {!pool.length && !built.length ? <p className="text-center text-muted-foreground">Press Start to get shuffled stages.</p> : (
          <>
            <div><p className="mb-2 text-xs text-muted-foreground">Available stages</p><div className="flex flex-wrap gap-2">{pool.map((p) => <Button key={p} size="sm" variant="outline" disabled={!!result} onClick={() => { setPool(pool.filter((x) => x !== p)); setBuilt([...built, p]); }}>{p}</Button>)}</div></div>
            <div><p className="mb-2 text-xs text-muted-foreground">Your pipeline</p>
              <ol className="flex flex-wrap items-center gap-2">{built.map((b, k) => (
                <li key={b}><button disabled={!!result} onClick={() => { setBuilt(built.filter((x) => x !== b)); setPool([...pool, b]); }}
                  className={`rounded-lg border px-3 py-1.5 font-mono text-xs ${result ? (b === target[k] ? "border-primary text-primary" : "border-destructive text-destructive") : "border-cyan text-cyan"}`}>{k + 1}. {b}{result && (b === target[k] ? " ✓" : " ✗")}</button></li>
              ))}</ol>
            </div>
            {!result && <Button disabled={pool.length > 0} onClick={check}>Run pipeline</Button>}
            {result && <p className="text-sm text-muted-foreground">{result}. Fail fast: cheap checks (lint/test) run before expensive ones (build/deploy).</p>}
          </>
        )}
      </div>
    </Frame>
  );
}

// ---------- D: Kubernetes Doctor ----------
const K8S: (Round & { level: Difficulty })[] = [
  { level: "easy", prompt: <pre className="rounded-lg bg-terminal p-3 font-mono text-xs">{"NAME      READY  STATUS            RESTARTS\napi-7d9f  0/1    ImagePullBackOff  0\n\nEvents: Failed to pull image \"myorg/api:v2.1\": not found"}</pre>, options: ["Image tag doesn't exist / registry auth", "App crash", "No CPU", "Service selector"], answer: 0, why: "ImagePullBackOff = kubelet can't pull the image. Fix the tag or imagePullSecrets." },
  { level: "easy", prompt: <pre className="rounded-lg bg-terminal p-3 font-mono text-xs">{"api-5c2a  0/1  CrashLoopBackOff  6\n\nlogs -p: Error: DATABASE_URL is not defined"}</pre>, options: ["Missing env/config for the app", "Image missing", "Node down", "Ingress broken"], answer: 0, why: "The container starts then exits. Add the env from a ConfigMap/Secret." },
  { level: "medium", prompt: <pre className="rounded-lg bg-terminal p-3 font-mono text-xs">{"web-1  0/1  Pending\n\nEvents: 0/3 nodes are available: 3 Insufficient memory."}</pre>, options: ["Requests exceed node capacity", "Image pull error", "Liveness probe", "DNS"], answer: 0, why: "Scheduler can't place it — lower requests or add nodes." },
  { level: "medium", prompt: <pre className="rounded-lg bg-terminal p-3 font-mono text-xs">{"$ kubectl get endpoints web\nNAME  ENDPOINTS\nweb   <none>\n\nService selector: app=web   Pod labels: app=web-frontend"}</pre>, options: ["Service selector doesn't match pod labels", "Pods crashed", "Wrong port", "Namespace deleted"], answer: 0, why: "No endpoints because labels don't match the selector." },
  { level: "hard", prompt: <pre className="rounded-lg bg-terminal p-3 font-mono text-xs">{"api-9  1/1 Running  RESTARTS 14\n\nLast State: Terminated  Reason: OOMKilled  Exit 137\nlimits.memory: 128Mi"}</pre>, options: ["Memory limit too low / leak", "CPU throttling", "Image pull", "Readiness probe"], answer: 0, why: "Exit 137 + OOMKilled = exceeded memory limit." },
  { level: "hard", prompt: <pre className="rounded-lg bg-terminal p-3 font-mono text-xs">{"worker-2  0/1  Running  RESTARTS 9\n\nEvents: Liveness probe failed: Get http://:8080/health: connection refused\nApp boot time: ~45s, initialDelaySeconds: 5"}</pre>, options: ["Liveness probe fires before app is up — add startupProbe", "Wrong image", "No node", "OOM"], answer: 0, why: "Kubelet kills the pod before it finishes booting." },
];
function McqGame({ id, title, rules, data }: { id: string; title: string; rules: string; data: (Round & { level: Difficulty })[] }) {
  const [diff, setDiff] = useState<Difficulty>("easy");
  const [playing, setPlaying] = useState(false);
  const r = useRounds();
  const start = () => {
    const order: Difficulty[] = ["easy", "medium", "hard"];
    const pool = data.filter((d) => order.indexOf(d.level) <= order.indexOf(diff));
    r.setRounds(shuffle(pool).map((d) => { const opts = shuffle(d.options.map((o, k) => ({ o, k }))); return { ...d, options: opts.map((x) => x.o), answer: opts.findIndex((x) => x.k === d.answer) }; }));
    r.setI(0); r.setScore(0); r.setPicked(null); r.setOver(false); setPlaying(true);
  };
  return (
    <Frame id={id} title={title} rules={rules} diff={diff} setDiff={setDiff} playing={playing} onStart={start}>
      <Rounds r={r} onDone={(sc) => { setPlaying(false); finish(id, diff, sc, r.rounds.length); }} />
    </Frame>
  );
}
export const K8sGame = () => <McqGame id="k8s" title="Kubernetes Doctor" rules="Read the symptoms and events, then diagnose the root cause." data={K8S} />;

// ---------- E: Linux Command Quest ----------
const CMDQ: (Round & { level: Difficulty })[] = [
  { level: "easy", prompt: <p>List all files including hidden ones, in long format.</p>, options: ["ls -la", "ls -h", "ls -R", "dir /a"], answer: 0, why: "-l long, -a all (hidden)." },
  { level: "easy", prompt: <p>Show human-readable disk usage per filesystem.</p>, options: ["df -h", "du -a", "free -h", "lsblk -f"], answer: 0, why: "df -h." },
  { level: "easy", prompt: <p>Follow a log file live.</p>, options: ["tail -f app.log", "cat -f app.log", "less -n app.log", "head -f app.log"], answer: 0, why: "tail -f streams new lines." },
  { level: "medium", prompt: <p>Find files over 100MB under /var.</p>, options: ["find /var -size +100M", "du /var 100M", "ls -S /var", "grep -r 100M /var"], answer: 0, why: "find -size +100M." },
  { level: "medium", prompt: <p>Which process listens on port 8080?</p>, options: ["ss -tlpn | grep :8080", "ps 8080", "netstat 8080 -kill", "curl :8080"], answer: 0, why: "ss -tlpn shows listeners with PIDs." },
  { level: "medium", prompt: <p>Case-insensitive recursive search for 'timeout' in /etc.</p>, options: ["grep -ri timeout /etc", "find /etc timeout", "grep timeout", "locate -i timeout"], answer: 0, why: "-r recursive, -i ignore case." },
  { level: "hard", prompt: <p>Top 5 biggest directories in the current folder.</p>, options: ["du -sh * | sort -rh | head -5", "ls -lS | head", "df -h | head -5", "find . -size | head"], answer: 0, why: "du + sort -h reverse + head." },
  { level: "hard", prompt: <p>Show logs for the ssh service since the last boot, errors only.</p>, options: ["journalctl -u ssh -b -p err", "cat /var/log/ssh", "systemctl logs ssh", "dmesg ssh"], answer: 0, why: "-u unit, -b boot, -p priority." },
];
export const CmdGame = () => <McqGame id="cmd" title="Linux Command Quest" rules="Pick the command and flags that accomplish each objective." data={CMDQ} />;

// ---------- F: Incident Commander ----------
const INCIDENTS = [
  {
    level: "easy" as Difficulty,
    title: "Checkout API returning 500s",
    evidence: ["ALERT 14:02 HighErrorRate checkout-api 5xx=38%", "DEPLOY 13:58 checkout-api v4.2.0 (adds new payments client)", "LOG: TypeError: Cannot read properties of undefined (reading 'apiKey')", "METRIC: CPU 35%, memory normal, DB latency normal"],
    steps: [
      { q: "Root cause?", options: ["Bad deploy v4.2.0 missing config", "Database overload", "DDoS attack", "Disk full"], answer: 0 },
      { q: "Mitigation now?", options: ["Roll back to v4.1.x", "Scale DB", "Restart all nodes", "Wait it out"], answer: 0 },
      { q: "Prevention?", options: ["Config validation at startup + canary deploys", "Deploy only on Fridays", "Remove alerts", "Bigger servers"], answer: 0 },
    ],
  },
  {
    level: "medium" as Difficulty,
    title: "Website slow and timing out",
    evidence: ["ALERT 03:10 p99 latency 9s on web", "No deploys in 48h", "METRIC: DB connections 500/500 (max)", "LOG: 'too many connections' from reporting-cron started 03:00"],
    steps: [
      { q: "Root cause?", options: ["Reporting cron exhausting DB connection pool", "Bad deploy", "DNS failure", "CDN outage"], answer: 0 },
      { q: "Mitigation now?", options: ["Stop the cron job / kill its connections", "Roll back web", "Delete DB", "Restart DNS"], answer: 0 },
      { q: "Prevention?", options: ["Per-client connection limits + read replica for reports", "Disable monitoring", "Run cron at noon", "More alerts only"], answer: 0 },
    ],
  },
  {
    level: "hard" as Difficulty,
    title: "Half of requests failing in one region",
    evidence: ["ALERT 22:41 ap-south-1 error rate 50%", "METRIC: 3 of 6 pods NotReady, all on node ip-10-0-2-15", "EVENT: node ip-10-0-2-15 DiskPressure=True", "LOG: kubelet evicting pods; /var/lib/docker 98% full (old images)"],
    steps: [
      { q: "Root cause?", options: ["Node disk full from unpruned images causing evictions", "App bug", "Region outage", "Expired TLS cert"], answer: 0 },
      { q: "Mitigation now?", options: ["Cordon & drain node, prune images / replace node", "Roll back app", "Increase replicas on same node", "Restart DNS"], answer: 0 },
      { q: "Prevention?", options: ["Image GC thresholds, disk alerts, pod anti-affinity", "Manual weekly checks", "Bigger pods", "Turn off kubelet"], answer: 0 },
    ],
  },
];
export function IncidentGame() {
  const [diff, setDiff] = useState<Difficulty>("easy");
  const [step, setStep] = useState(-1);
  const [picks, setPicks] = useState<number[]>([]);
  const [opts, setOpts] = useState<{ o: string; k: number }[][]>([]);
  const inc = INCIDENTS.find((x) => x.level === diff)!;
  const playing = step >= 0 && step < 3;
  const start = () => { setStep(0); setPicks([]); setOpts(inc.steps.map((s) => shuffle(s.options.map((o, k) => ({ o, k }))))); };
  const pick = (k: number) => {
    const np = [...picks, k];
    setPicks(np);
    if (step === 2) { setStep(3); finish("incident", diff, np.filter((p, i) => p === inc.steps[i]!.answer).length, 3); } else setStep(step + 1);
  };
  return (
    <Frame id="incident" title="Incident Commander" rules="Review the evidence, then choose root cause, mitigation and prevention." diff={diff} setDiff={setDiff} playing={playing} onStart={start}>
      <div className="panel space-y-4 p-5">
        {step < 0 ? <p className="text-center text-muted-foreground">Press Start to take command.</p> : (
          <>
            <p className="font-semibold text-destructive">🚨 {inc.title}</p>
            <pre className="whitespace-pre-wrap rounded-lg bg-terminal p-3 font-mono text-xs">{inc.evidence.join("\n")}</pre>
            {step < 3 ? (
              <>
                <p className="font-medium">{step + 1}/3 · {inc.steps[step]!.q}</p>
                <div className="grid gap-2 sm:grid-cols-2">{opts[step]?.map(({ o, k }) => <Button key={o} variant="outline" className="h-auto justify-start whitespace-normal text-left" onClick={() => pick(k)}>{o}</Button>)}</div>
              </>
            ) : (
              <ul className="space-y-2 text-sm">{inc.steps.map((s, i) => (
                <li key={s.q}><strong>{s.q}</strong> {picks[i] === s.answer ? <span className="text-primary">✓ {s.options[s.answer]}</span> : <span className="text-destructive">✗ you chose "{s.options[picks[i] ?? 0]}" — correct: {s.options[s.answer]}</span>}</li>
              ))}</ul>
            )}
          </>
        )}
      </div>
    </Frame>
  );
}
