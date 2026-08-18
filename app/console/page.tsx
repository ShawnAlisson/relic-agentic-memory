"use client";

import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";

type Episode = {
  id: string;
  title: string;
  service: string;
  severity: string;
  status: string;
  region: string;
  summary: string | null;
  started_at: string;
};
type Trace = {
  step: number;
  thought: string;
  tool: string | null;
  action: string | null;
  observation: string | null;
};
type Memory = { kind: string; title: string; content: string; importance: number };
type Snapshot = {
  episodes: Episode[];
  memories: Memory[];
  traces: Trace[];
};

export default function ConsolePage() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [running, setRunning] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/memory");
    if (!res.ok) {
      setError("CockroachDB is not reachable yet. Start docker compose and migrate.");
      return;
    }
    setError(null);
    setData(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function run() {
    setRunning(true);
    setError(null);
    const res = await fetch("/api/demo/run", { method: "POST" });
    const body = await res.json();
    setRunning(false);
    if (!res.ok) {
      setError(body.error || "run failed");
      return;
    }
    setActive(body.episode.id);
    await load();
  }

  const episode =
    data?.episodes.find((e) => e.id === active) ?? data?.episodes[0];
  const traces = (data?.traces || []).slice(0, 12);

  return (
    <>
      <Nav />
      <div className="console">
        <aside className="col">
          <div className="kicker">Episodes</div>
          <button className="btn" style={{ margin: "16px 0", width: "100%" }} onClick={run} disabled={running}>
            {running ? "Remembering…" : "Page Relic"}
          </button>
          {error ? <p className="bad">{error}</p> : null}
          {(data?.episodes || []).map((e) => (
            <div key={e.id} className="item" onClick={() => setActive(e.id)}>
              <div className={e.severity}>{e.severity.toUpperCase()} · {e.status}</div>
              <div>{e.title}</div>
              <small>{e.service} · {e.region}</small>
            </div>
          ))}
        </aside>
        <main className="col">
          <div className="kicker">Agent trace</div>
          <h2 style={{ fontFamily: "var(--sans)", fontWeight: 500, fontSize: 32, margin: "8px 0 4px" }}>
            {episode?.title || "No incident yet"}
          </h2>
          <p style={{ color: "var(--muted)" }}>{episode?.summary || "Page Relic to open a SEV1 against durable memory."}</p>
          {(traces.length ? traces : data?.traces || []).slice(0, 12).map((t, i) => (
            <div className="trace" key={`${t.step}-${i}`}>
              <div className="tool">step {t.step} · {t.tool}</div>
              <p>{t.thought}</p>
              {t.observation ? <pre>{t.observation.slice(0, 700)}</pre> : null}
            </div>
          ))}
        </main>
        <aside className="col">
          <div className="kicker">Retrieved memory</div>
          {(data?.memories || []).slice(0, 8).map((m, i) => (
            <div className="mem" key={`${m.title}-${i}`}>
              <div className="kind">{m.kind}</div>
              <h4>{m.title}</h4>
              <p>{m.content.slice(0, 220)}</p>
            </div>
          ))}
        </aside>
      </div>
    </>
  );
}
