// Simulated, isolated Linux terminal. Never executes real commands.
export type FileNode = { type: "file"; content: string; mode: string } | { type: "dir"; mode: string };
export type Fs = Record<string, FileNode>;
export type Term = { fs: Fs; cwd: string; user: string; history: string[] };

export function initialTerm(): Term {
  return {
    user: "learner",
    cwd: "/home/learner",
    history: [],
    fs: {
      "/": { type: "dir", mode: "rwxr-xr-x" },
      "/home": { type: "dir", mode: "rwxr-xr-x" },
      "/home/learner": { type: "dir", mode: "rwxr-xr-x" },
      "/home/learner/notes.txt": { type: "file", content: "Remember: least privilege!", mode: "rw-r--r--" },
      "/home/learner/projects": { type: "dir", mode: "rwxr-xr-x" },
      "/home/learner/projects/deploy.sh": { type: "file", content: "#!/bin/bash\necho deploying", mode: "rw-r--r--" },
      "/home/learner/projects/app": { type: "dir", mode: "rwxr-xr-x" },
      "/home/learner/projects/app/config.yaml": { type: "file", content: "port: 8080\nenv: prod", mode: "rw-r--r--" },
      "/etc": { type: "dir", mode: "rwxr-xr-x" },
      "/etc/hostname": { type: "file", content: "devops-sandbox", mode: "rw-r--r--" },
      "/var": { type: "dir", mode: "rwxr-xr-x" },
      "/var/log": { type: "dir", mode: "rwxr-xr-x" },
      "/var/log/app.log": {
        type: "file",
        mode: "rw-r--r--",
        content: [
          "2026-10-18 08:00:01 INFO server started on :8080",
          "2026-10-18 08:05:12 INFO GET /health 200",
          "2026-10-18 08:07:44 ERROR database connection refused (db:5432)",
          "2026-10-18 08:07:45 WARN retrying in 5s",
          "2026-10-18 08:08:02 INFO GET /api/users 200",
        ].join("\n"),
      },
      "/var/log/nginx.log": {
        type: "file",
        mode: "rw-r--r--",
        content: "nginx: [emerg] unknown directive \"listn\" in /etc/nginx/nginx.conf:12\nnginx.service: Failed with result 'exit-code'.",
      },
      "/tmp": { type: "dir", mode: "rwxrwxrwt" },
      "/tmp/.secret_key": { type: "file", content: "FLAG{you-found-it}", mode: "rw-------" },
    },
  };
}

export const PROCESSES = [
  ["1", "root", "0.0", "0.3", "systemd"],
  ["412", "root", "0.1", "0.8", "sshd"],
  ["733", "www-data", "1.2", "2.1", "nginx"],
  ["1024", "learner", "0.3", "1.0", "bash"],
  ["1337", "app", "97.8", "12.4", "node /opt/app/worker.js"],
  ["2048", "postgres", "2.4", "8.9", "postgres"],
];

export function resolve(cwd: string, p: string, home = "/home/learner"): string {
  if (!p) return cwd;
  let path = p.startsWith("~") ? home + p.slice(1) : p.startsWith("/") ? p : `${cwd}/${p}`;
  const parts: string[] = [];
  for (const seg of path.split("/")) {
    if (!seg || seg === ".") continue;
    if (seg === "..") parts.pop();
    else parts.push(seg);
  }
  path = "/" + parts.join("/");
  return path;
}

const parent = (p: string) => (p === "/" ? "/" : p.slice(0, p.lastIndexOf("/")) || "/");
const base = (p: string) => p.slice(p.lastIndexOf("/") + 1);
const children = (fs: Fs, dir: string) =>
  Object.keys(fs).filter((k) => k !== dir && parent(k) === dir).sort();

function octalToMode(o: string): string | null {
  if (!/^[0-7]{3}$/.test(o)) return null;
  return o
    .split("")
    .map((d) => {
      const n = Number(d);
      return (n & 4 ? "r" : "-") + (n & 2 ? "w" : "-") + (n & 1 ? "x" : "-");
    })
    .join("");
}

function symbolic(mode: string, spec: string): string | null {
  const m = spec.match(/^([ugoa]*)([+-])([rwx]+)$/);
  if (!m) return null;
  const who = m[1] || "a";
  const arr = mode.split("");
  const idx: Record<string, number> = { r: 0, w: 1, x: 2 };
  for (const w of who === "a" ? "ugo" : who) {
    const off = { u: 0, g: 3, o: 6 }[w as "u" | "g" | "o"];
    for (const p of m[3]!) arr[off! + idx[p]!] = m[2] === "+" ? p : "-";
  }
  return arr.join("");
}

export type RunResult = { term: Term; output: string; clear?: boolean };

export function run(t: Term, line: string): RunResult {
  const input = line.trim();
  const term: Term = { ...t, fs: { ...t.fs }, history: input ? [...t.history, input] : t.history };
  if (!input) return { term, output: "" };

  // simple pipe support: cmd | grep x
  const [main, pipe] = input.split(/\s*\|\s*/);
  const res = exec(term, main ?? "");
  if (pipe) {
    const [pc, ...pargs] = pipe.split(/\s+/);
    if (pc !== "grep") return { term, output: `pipe to '${pc}' is not supported in this simulation (try | grep)` };
    const pat = pargs.filter((a) => !a.startsWith("-")).join(" ").replace(/^['"]|['"]$/g, "");
    const ci = pargs.includes("-i");
    res.output = res.output
      .split("\n")
      .filter((l) => (ci ? l.toLowerCase().includes(pat.toLowerCase()) : l.includes(pat)))
      .join("\n");
  }
  return res;
}

function exec(term: Term, input: string): RunResult {
  const tokens = input.match(/"[^"]*"|'[^']*'|\S+/g)?.map((s) => s.replace(/^['"]|['"]$/g, "")) ?? [];
  const [cmd, ...args] = tokens;
  const fs = term.fs;
  const flags = args.filter((a) => a.startsWith("-")).join("");
  const pos = args.filter((a) => !a.startsWith("-"));
  const out = (output: string): RunResult => ({ term, output });
  const r = (p: string) => resolve(term.cwd, p);

  switch (cmd) {
    case "help":
      return out(
        "Simulated commands: pwd ls cd mkdir touch cat echo cp mv rm whoami date clear help chmod grep find ps df free top curl history",
      );
    case "pwd":
      return out(term.cwd);
    case "whoami":
      return out(term.user);
    case "date":
      return out(new Date().toString());
    case "clear":
      return { term, output: "", clear: true };
    case "history":
      return out(term.history.map((h, i) => `${String(i + 1).padStart(4)}  ${h}`).join("\n"));
    case "echo": {
      const gt = args.indexOf(">");
      if (gt >= 0) {
        const target = r(args[gt + 1] ?? "");
        if (!args[gt + 1]) return out("bash: syntax error near unexpected token `newline'");
        if (fs[parent(target)]?.type !== "dir") return out(`bash: ${args[gt + 1]}: No such file or directory`);
        fs[target] = { type: "file", content: args.slice(0, gt).join(" "), mode: "rw-r--r--" };
        return out("");
      }
      return out(args.join(" "));
    }
    case "cd": {
      const target = r(pos[0] ?? "~");
      if (!fs[target]) return out(`cd: ${pos[0]}: No such file or directory`);
      if (fs[target].type !== "dir") return out(`cd: ${pos[0]}: Not a directory`);
      term.cwd = target;
      return out("");
    }
    case "ls": {
      const target = r(pos[0] ?? ".");
      const node = fs[target];
      if (!node) return out(`ls: cannot access '${pos[0]}': No such file or directory`);
      const list = node.type === "file" ? [target] : children(fs, target);
      const shown = list.filter((k) => flags.includes("a") || !base(k).startsWith("."));
      if (flags.includes("l"))
        return out(
          shown
            .map((k) => {
              const n = fs[k];
              const size = n!.type === "file" ? (n as { content: string }).content.length : 4096;
              return `${n!.type === "dir" ? "d" : "-"}${n!.mode} 1 ${term.user} ${term.user} ${String(size).padStart(5)} ${base(k)}${n!.type === "dir" ? "/" : ""}`;
            })
            .join("\n"),
        );
      return out(shown.map((k) => base(k) + (fs[k]!.type === "dir" ? "/" : "")).join("  "));
    }
    case "mkdir": {
      if (!pos.length) return out("mkdir: missing operand");
      for (const p of pos) {
        const target = r(p);
        if (fs[target]) return out(`mkdir: cannot create directory '${p}': File exists`);
        if (!fs[parent(target)]) {
          if (!flags.includes("p")) return out(`mkdir: cannot create directory '${p}': No such file or directory`);
          let acc = "";
          for (const seg of target.split("/").filter(Boolean)) {
            acc += "/" + seg;
            if (!fs[acc]) fs[acc] = { type: "dir", mode: "rwxr-xr-x" };
          }
        } else fs[target] = { type: "dir", mode: "rwxr-xr-x" };
      }
      return out("");
    }
    case "touch": {
      if (!pos.length) return out("touch: missing file operand");
      for (const p of pos) {
        const target = r(p);
        if (fs[parent(target)]?.type !== "dir") return out(`touch: cannot touch '${p}': No such file or directory`);
        if (!fs[target]) fs[target] = { type: "file", content: "", mode: "rw-r--r--" };
      }
      return out("");
    }
    case "cat": {
      if (!pos.length) return out("cat: missing file operand");
      return out(
        pos
          .map((p) => {
            const n = fs[r(p)];
            if (!n) return `cat: ${p}: No such file or directory`;
            if (n.type === "dir") return `cat: ${p}: Is a directory`;
            if (n.mode[0] !== "r") return `cat: ${p}: Permission denied`;
            return n.content;
          })
          .join("\n"),
      );
    }
    case "cp":
    case "mv": {
      if (pos.length < 2) return out(`${cmd}: missing destination file operand`);
      const src = r(pos[0]!);
      let dst = r(pos[1]!);
      const n = fs[src];
      if (!n) return out(`${cmd}: cannot stat '${pos[0]}': No such file or directory`);
      if (fs[dst]?.type === "dir") dst = `${dst}/${base(src)}`.replace("//", "/");
      if (n.type === "dir" && cmd === "cp" && !flags.includes("r")) return out(`cp: -r not specified; omitting directory '${pos[0]}'`);
      const keys = Object.keys(fs).filter((k) => k === src || k.startsWith(src + "/"));
      for (const k of keys) {
        fs[dst + k.slice(src.length)] = { ...fs[k]! };
        if (cmd === "mv") delete fs[k];
      }
      return out("");
    }
    case "rm": {
      if (!pos.length) return out("rm: missing operand");
      for (const p of pos) {
        const target = r(p);
        const n = fs[target];
        if (!n) return out(`rm: cannot remove '${p}': No such file or directory`);
        if (target === "/" || target === "/home" || target === "/etc") return out(`rm: refusing to remove '${p}' (protected in simulation)`);
        if (n.type === "dir" && !flags.includes("r")) return out(`rm: cannot remove '${p}': Is a directory`);
        for (const k of Object.keys(fs)) if (k === target || k.startsWith(target + "/")) delete fs[k];
      }
      return out("");
    }
    case "chmod": {
      if (pos.length < 2) return out("chmod: missing operand");
      const target = r(pos[1]!);
      const n = fs[target];
      if (!n) return out(`chmod: cannot access '${pos[1]}': No such file or directory`);
      const mode = octalToMode(pos[0]!) ?? symbolic(n.mode, pos[0]!);
      if (!mode) return out(`chmod: invalid mode: '${pos[0]}'`);
      fs[target] = { ...n, mode };
      return out("");
    }
    case "grep": {
      if (pos.length < 2) return out("usage: grep [-i] PATTERN FILE");
      const [pat, file] = pos;
      const n = fs[r(file!)];
      if (!n) return out(`grep: ${file}: No such file or directory`);
      if (n.type === "dir") return out(`grep: ${file}: Is a directory`);
      const ci = flags.includes("i");
      return out(
        n.content
          .split("\n")
          .filter((l) => (ci ? l.toLowerCase().includes(pat!.toLowerCase()) : l.includes(pat!)))
          .join("\n"),
      );
    }
    case "find": {
      const start = r(pos[0] && !pos[0].startsWith("-") ? pos[0] : ".");
      const ni = args.indexOf("-name");
      const pattern = ni >= 0 ? args[ni + 1] : undefined;
      const re = pattern ? new RegExp("^" + pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$") : null;
      return out(
        Object.keys(fs)
          .filter((k) => (k === start || k.startsWith(start === "/" ? "/" : start + "/")) && (!re || re.test(base(k))))
          .sort()
          .join("\n"),
      );
    }
    case "ps":
    case "top": {
      const head = "  PID USER       %CPU %MEM COMMAND";
      const rows = (cmd === "top" ? [...PROCESSES].sort((a, b) => Number(b[2]) - Number(a[2])) : PROCESSES).map(
        ([pid = "", u = "", c = "", m = "", name = ""]) => `${pid.padStart(5)} ${u.padEnd(10)} ${c.padStart(4)} ${m.padStart(4)} ${name}`,
      );
      return out((cmd === "top" ? "top - simulated snapshot, load average: 1.92, 1.40, 0.88\n" : "") + [head, ...rows].join("\n"));
    }
    case "df":
      return out("Filesystem      Size  Used Avail Use% Mounted on\n/dev/sda1        20G   17G  3.0G  85% /\ntmpfs           1.0G   12M 1012M   2% /tmp");
    case "free":
      return out("               total        used        free      shared  buff/cache   available\nMem:           3.8Gi       2.9Gi       210Mi        12Mi       700Mi       640Mi\nSwap:          1.0Gi       120Mi       904Mi");
    case "curl": {
      const url = pos[0];
      if (!url) return out("curl: try 'curl http://localhost:8080/health'");
      if (url.includes("localhost:8080/health")) return out(flags.includes("I") ? "HTTP/1.1 200 OK\ncontent-type: application/json" : '{"status":"ok"}');
      if (url.includes("localhost")) return out("curl: (7) Failed to connect to localhost port 80: Connection refused");
      return out("curl: simulated sandbox has no internet access. Try http://localhost:8080/health");
    }
    case "sudo":
      return out("sudo: this simulation runs without root. Try the command without sudo.");
    default:
      return out(`${cmd}: not implemented in this simulation. Type 'help' for supported commands.`);
  }
}

export type Mission = {
  id: string;
  title: string;
  objective: string;
  hints: string[];
  check: (t: Term, lastCmd: string, lastOut: string) => boolean;
};

export const MISSIONS: Mission[] = [
  {
    id: "find-secret",
    title: "Find the hidden file",
    objective: "Locate and read the hidden secret key file somewhere under /tmp.",
    hints: ["Hidden files start with a dot.", "Try `ls -a /tmp` or `find /tmp -name '.*'`.", "Then `cat` it."],
    check: (_t, _c, o) => o.includes("FLAG{you-found-it}"),
  },
  {
    id: "fix-perm",
    title: "Fix the deploy script permission",
    objective: "Make ~/projects/deploy.sh executable for its owner.",
    hints: ["Check with `ls -l ~/projects`.", "Use `chmod u+x` or `chmod 755`."],
    check: (t) => t.fs["/home/learner/projects/deploy.sh"]?.mode[2] === "x",
  },
  {
    id: "grep-error",
    title: "Find the database error",
    objective: "Use grep to show the ERROR line in /var/log/app.log.",
    hints: ["Syntax: grep PATTERN FILE", "Pattern: ERROR"],
    check: (_t, c, o) => c.includes("grep") && o.includes("database connection refused") && !o.includes("INFO"),
  },
  {
    id: "high-cpu",
    title: "Identify the CPU hog",
    objective: "Find the process using the most CPU, then create /tmp/culprit.txt containing its PID (echo PID > /tmp/culprit.txt).",
    hints: ["`top` sorts by CPU.", "echo 1337 > /tmp/culprit.txt"],
    check: (t) => {
      const f = t.fs["/tmp/culprit.txt"];
      return f?.type === "file" && f.content.trim() === "1337";
    },
  },
  {
    id: "failed-service",
    title: "Diagnose the failed service",
    objective: "Read the nginx log and write the misspelled directive into /tmp/cause.txt.",
    hints: ["cat /var/log/nginx.log", "The directive is in quotes."],
    check: (t) => {
      const f = t.fs["/tmp/cause.txt"];
      return f?.type === "file" && f.content.trim().replace(/"/g, "") === "listn";
    },
  },
];
