import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/AppShell";
import { useProgress, setState, resetAll } from "@/lib/progress";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — DevOps 100" },
      { name: "description", content: "Profile, data export and reset for your DevOps 100 progress." },
      { property: "og:title", content: "DevOps 100 Settings" },
      { property: "og:description", content: "Manage your profile and learning data." },
    ],
  }),
  component: Settings,
});

function Settings() {
  const s = useProgress();
  const [name, setName] = useState("");
  useEffect(() => setName(s.name), [s.name]);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(s, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `devops100-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <PageHeader title="Settings" />
      <div className="max-w-2xl space-y-6">
        <section className="panel space-y-3 p-5">
          <h2 className="font-semibold">Profile</h2>
          <label htmlFor="name" className="text-sm text-muted-foreground">Display name</label>
          <div className="flex gap-2">
            <Input id="name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            <Button onClick={() => { setState((st) => ({ ...st, name: name.trim() })); toast.success("Profile saved"); }}>Save</Button>
          </div>
        </section>
        <section className="panel space-y-2 p-5">
          <h2 className="font-semibold">Storage mode</h2>
          <p className="text-sm"><span className="rounded bg-warning/15 px-2 py-0.5 text-warning">Local demo mode</span></p>
          <p className="text-sm text-muted-foreground">Progress is saved in this browser only. It is not synced to the cloud or across devices. Clearing browser data will erase it — export a backup regularly.</p>
        </section>
        <section className="panel space-y-3 p-5">
          <h2 className="font-semibold">Data</h2>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportJson}><Download className="h-4 w-4" />Export progress (JSON)</Button>
            <AlertDialog>
              <AlertDialogTrigger asChild><Button variant="destructive"><RotateCcw className="h-4 w-4" />Reset all progress</Button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset all progress?</AlertDialogTitle>
                  <AlertDialogDescription>This deletes your days, XP, streaks, notes and game scores from this browser. This cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => { resetAll(); toast("Progress reset"); }}>Yes, reset</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </section>
      </div>
    </>
  );
}
