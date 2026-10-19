import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Laptop } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/AppShell";
import { useProgress, award } from "@/lib/progress";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "Hands-on Projects — DevOps 100" },
      { name: "description", content: "Ten portfolio projects from Bash scripts to an end-to-end DevOps capstone." },
      { property: "og:title", content: "DevOps Project Ladder" },
      { property: "og:description", content: "Build ten real DevOps projects with checklists and cleanup guides." },
    ],
  }),
  component: Projects,
});

type P = { title: string; cloud: boolean; objective: string; arch: string; prereq: string[]; steps: string[]; validate: string[]; mistakes: string[]; cleanup: string };
const PROJECTS: P[] = [
  { title: "Linux health-check script", cloud: false, objective: "Bash script reporting CPU, memory, disk and top processes.", arch: "Bash script → stdout + log file, scheduled by cron.", prereq: ["Linux/WSL", "Days 1–12, 27–30"], steps: ["Collect uptime, free, df", "Add thresholds with colors", "Write to /var/log/health.log", "Schedule via cron"], validate: ["Exits non-zero when disk > 90%", "Runs from cron"], mistakes: ["Relative paths in cron", "Unquoted variables"], cleanup: "crontab -e and remove the entry." },
  { title: "Automated backup script", cloud: false, objective: "Rotate compressed backups of a directory with retention.", arch: "tar + gzip → /backups, delete >7 days.", prereq: ["Bash basics"], steps: ["tar -czf with date stamp", "find -mtime +7 -delete", "Log and exit codes", "Test restore"], validate: ["Restore matches original (diff -r)"], mistakes: ["Never testing restore"], cleanup: "Remove test backups." },
  { title: "Dockerized web app", cloud: false, objective: "Containerize an app with Compose and a database.", arch: "app container + postgres + volume on a user network.", prereq: ["Docker installed", "Days 45–55"], steps: ["Multi-stage Dockerfile", "docker-compose.yml with healthchecks", "Named volume", "Non-root user"], validate: ["docker compose up works from a clean clone", "Data persists restart"], mistakes: ["Secrets in image", "No .dockerignore"], cleanup: "docker compose down -v; docker image prune." },
  { title: "GitHub Actions CI", cloud: false, objective: "Lint, test and build on every PR.", arch: "push/PR → Actions → lint → test → build → artifact.", prereq: ["GitHub account"], steps: ["Create workflow", "Cache deps", "Upload artifact", "Branch protection"], validate: ["PR blocked when tests fail"], mistakes: ["Unpinned actions", "Secrets in logs"], cleanup: "None required." },
  { title: "Jenkins pipeline", cloud: false, objective: "Declarative Jenkinsfile in a local Jenkins container.", arch: "Jenkins in Docker → pipeline from Git.", prereq: ["Docker"], steps: ["Run jenkins/jenkins:lts", "Create pipeline job", "Add stages + post"], validate: ["Green build with archived artifact"], mistakes: ["Running builds on controller"], cleanup: "docker rm -f jenkins; remove volume." },
  { title: "AWS static website", cloud: true, objective: "Host a static site on S3 (+ CloudFront optional).", arch: "S3 bucket → (CloudFront) → browser.", prereq: ["AWS account with budget alert", "Days 31–44"], steps: ["Create bucket", "Upload site", "Configure access", "Set budget alert"], validate: ["Site loads over HTTPS (with CloudFront)"], mistakes: ["Public bucket with sensitive files", "Forgetting cleanup"], cleanup: "Empty and delete bucket, delete distribution." },
  { title: "Terraform infrastructure lab", cloud: true, objective: "Provision a VPC + instance with Terraform modules.", arch: "Terraform → AWS provider → VPC, subnet, SG, EC2.", prereq: ["Terraform CLI", "AWS credentials"], steps: ["Write module", "plan -out", "apply", "Remote state concept"], validate: ["Plan clean after apply"], mistakes: ["Committing tfstate"], cleanup: "terraform destroy and verify in console." },
  { title: "Kubernetes deployment", cloud: false, objective: "Deploy an app to kind/minikube with probes and Ingress.", arch: "Deployment → Service → Ingress; ConfigMap/Secret.", prereq: ["kind or minikube", "Days 66–78"], steps: ["Write manifests", "Probes + limits", "Ingress", "HPA"], validate: ["Rolling update with zero failed requests"], mistakes: ["No resource requests", "Selector mismatch"], cleanup: "kind delete cluster." },
  { title: "Prometheus & Grafana lab", cloud: false, objective: "Monitor an app with dashboards and alerts.", arch: "app /metrics → Prometheus → Grafana + Alertmanager.", prereq: ["Docker Compose"], steps: ["Compose stack", "Scrape config", "Dashboard", "Alert rule"], validate: ["Alert fires on induced errors"], mistakes: ["Alerting on causes not symptoms"], cleanup: "docker compose down -v." },
  { title: "End-to-end capstone", cloud: true, objective: "Code → CI → image → IaC → K8s → monitoring, documented.", arch: "GitHub → Actions → registry → Terraform infra → K8s → Prometheus.", prereq: ["All phases"], steps: ["Containerize", "Pipeline", "Provision", "Deploy", "Observe", "Document"], validate: ["Fresh engineer can deploy from README"], mistakes: ["No rollback plan", "No cost guardrails"], cleanup: "Destroy all infra; check billing next day." },
];

function Projects() {
  const s = useProgress();
  const [open, setOpen] = useState<number | null>(0);
  return (
    <>
      <PageHeader title="Project Ladder" sub="Portfolio-ready projects. Local projects are free; cloud ones are clearly marked." />
      <div className="space-y-3">
        {PROJECTS.map((p, i) => {
          const key = `project:${i}`;
          const done = key in s.rewards;
          return (
            <section key={p.title} className="panel">
              <button className="flex w-full items-center gap-3 p-4 text-left" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
                <span className="font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                <span className="min-w-0 flex-1 font-medium">{p.title}</span>
                {p.cloud ? <span className="flex shrink-0 items-center gap-1 rounded bg-warning/15 px-2 py-0.5 text-xs text-warning"><AlertTriangle className="h-3 w-3" />Real cloud · may bill</span> : <span className="flex shrink-0 items-center gap-1 rounded bg-accent px-2 py-0.5 text-xs text-accent-foreground"><Laptop className="h-3 w-3" />Local</span>}
                {done && <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-label="Completed" />}
              </button>
              {open === i && (
                <div className="grid gap-4 border-t border-border p-4 text-sm md:grid-cols-2">
                  <div><h3 className="font-semibold text-cyan">Objective</h3><p>{p.objective}</p></div>
                  <div><h3 className="font-semibold text-cyan">Architecture</h3><p className="font-mono text-xs">{p.arch}</p></div>
                  <div><h3 className="font-semibold text-cyan">Prerequisites</h3><ul className="list-disc pl-5">{p.prereq.map((x) => <li key={x}>{x}</li>)}</ul></div>
                  <div><h3 className="font-semibold text-cyan">Steps</h3><ol className="list-decimal pl-5">{p.steps.map((x) => <li key={x}>{x}</li>)}</ol></div>
                  <div><h3 className="font-semibold text-cyan">Validation checklist</h3><ul className="list-disc pl-5">{p.validate.map((x) => <li key={x}>{x}</li>)}</ul></div>
                  <div><h3 className="font-semibold text-cyan">Common mistakes</h3><ul className="list-disc pl-5">{p.mistakes.map((x) => <li key={x}>{x}</li>)}</ul></div>
                  <div><h3 className="font-semibold text-cyan">Cleanup</h3><p>{p.cleanup}</p></div>
                  <div><h3 className="font-semibold text-cyan">README checklist</h3><ul className="list-disc pl-5"><li>Overview & architecture diagram</li><li>Prerequisites & quickstart</li><li>How to validate</li><li>Cleanup & cost notes</li><li>What I learned</li></ul></div>
                  {p.cloud && <p className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-warning md:col-span-2">⚠ This project creates real, possibly billable AWS resources in your own account. This app does not provision anything for you. Set a budget alert first and always run the cleanup steps.</p>}
                  <div className="md:col-span-2"><Button disabled={done} onClick={() => { award(key, 50); toast.success("Project marked complete! +50 XP"); }}>{done ? "Completed ✓" : "Mark project complete (+50 XP)"}</Button></div>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
