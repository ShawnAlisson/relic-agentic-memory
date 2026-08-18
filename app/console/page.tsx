"use client";

import { useEffect, useMemo, useState } from "react";
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
  episode_id?: string;
  step: number;
  thought: string;
  tool: string | null;
  action: string | null;
  observation: string | null;
};
type Memory = { kind: string; title: string; content: string };
type Snapshot = {
  episodes: Episode[];
  memories: Memory[];
  traces: Trace[];
};

const KIND_LABEL: Record<string, string> = {
  episodic: "Past outage",
  procedural: "Playbook",
  semantic: "Lesson",
  working: "Tonight",
};

export default function ConsolePage() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [running, setRunning] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/memory");
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(typeof body.error === "string" ? body.error : "Cannot reach CockroachDB.");
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

  const traces = useMemo(() => {
    const all = data?.traces || [];
    const mine = episode ? all.filter((t) => t.episode_id === episode.id) : [];
    const list = mine.length ? mine : all.slice(0, 5);
    return [...list].sort((a, b) => a.step - b.step);
  }, [data, episode]);

  const remembered = (data?.memories || []).filter((m) => m.kind !== "working").slice(0, 6);

  return (
    <>
      <Nav />
      <div className="console">
        <aside className="col">
          <div className="kicker">Pages</div>
          <p className="hint">
            Click once. Relic opens tonight’s outage, looks up July, and writes the lesson down.
          </p>
          <button className="btn" style={{ margin: "16px 0", width: "100%" }} onClick={run} disabled={running}>
            {running ? "Relic is on the page…" : "Fire the 3am page"}
          </button>
          {error ? <p className="bad">{error}</p> : null}
          {(data?.episodes || []).map((e) => (
            <div key={e.id} className="item" onClick={() => setActive(e.id)}>
              <div className={e.severity}>{e.status} · {e.region}</div>
              <div>{e.title}</div>
              <small>{e.service}</small>
            </div>
          ))}
        </aside>
        <main className="col">
          <div className="kicker">What just happened</div>
          <h2 className="case-title">{episode?.title || "No page yet"}</h2>
          {episode?.status === "resolved" ? (
            <div className="outcome">
              <strong>Relic already knew this outage.</strong>
              <p>
                {episode.summary ||
                  "It reused the July checkout case instead of starting from a blank chat."}
              </p>
            </div>
          ) : (
            <p className="lede-inline">
              Fire the page. You will see Relic save the case, ask if it has happened
              before, then remember the answer for the next agent.
            </p>
          )}
          <div className="compare">
            <div>
              <div className="kicker">Without Relic</div>
              <p>New agent. Empty memory. Re-learns the July rollback. ~41 minutes. Humans get paged anyway.</p>
            </div>
            <div>
              <div className="kicker">With Relic</div>
              <p>Same page. July case comes back from CockroachDB. Freeze the canary. Next spawn inherits it.</p>
            </div>
          </div>
          {traces.map((t) => (
            <div className="trace" key={`${t.step}-${t.thought}`}>
              <div className="tool">
                {t.step}. {t.action || t.tool}
              </div>
              <p>{t.thought}</p>
              {t.observation ? <p className="obs">{t.observation}</p> : null}
            </div>
          ))}
        </main>
        <aside className="col">
          <div className="kicker">What it remembered</div>
          {remembered.map((m, i) => (
            <div className="mem" key={`${m.title}-${i}`}>
              <div className="kind">{KIND_LABEL[m.kind] || m.kind}</div>
              <h4>{m.title}</h4>
              <p>{m.content.slice(0, 260)}</p>
            </div>
          ))}
        </aside>
      </div>
    </>
  );
}
