import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Network, FileCode2, Workflow, Stethoscope, TerminalSquare, Siren } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { PortGame, DockerGame, PipelineGame, K8sGame, CmdGame, IncidentGame } from "@/components/games";

export const Route = createFileRoute("/arcade")({
  head: () => ({
    meta: [
      { title: "DevOps Arcade — DevOps 100" },
      { name: "description", content: "Six playable DevOps games: ports, Dockerfiles, pipelines, Kubernetes, Linux and incidents." },
      { property: "og:title", content: "DevOps Arcade" },
      { property: "og:description", content: "Learn DevOps through six fast, scored mini-games." },
    ],
  }),
  component: Arcade,
});

const GAMES = [
  { id: "ports", name: "Port Challenge", icon: Network, C: PortGame },
  { id: "docker", name: "Dockerfile Detective", icon: FileCode2, C: DockerGame },
  { id: "pipeline", name: "Pipeline Builder", icon: Workflow, C: PipelineGame },
  { id: "k8s", name: "Kubernetes Doctor", icon: Stethoscope, C: K8sGame },
  { id: "cmd", name: "Command Quest", icon: TerminalSquare, C: CmdGame },
  { id: "incident", name: "Incident Commander", icon: Siren, C: IncidentGame },
];

function Arcade() {
  const [g, setG] = useState("ports");
  const game = GAMES.find((x) => x.id === g)!;
  return (
    <>
      <PageHeader title="DevOps Arcade" sub="Scored games with explanations. Best scores and XP are saved (XP once per game & difficulty)." />
      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6" role="tablist">
        {GAMES.map(({ id, name, icon: Icon }) => (
          <button key={id} role="tab" aria-selected={g === id} onClick={() => setG(id)}
            className={`panel flex flex-col items-center gap-2 p-3 text-center text-xs transition-colors ${g === id ? "border-primary text-primary" : "hover:bg-muted"}`}>
            <Icon className="h-5 w-5" aria-hidden />{name}
          </button>
        ))}
      </div>
      <game.C key={g} />
    </>
  );
}
