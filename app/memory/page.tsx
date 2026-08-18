"use client";

import { useEffect, useState } from "react";
import { Footer, Nav } from "@/components/Nav";

type Match = {
  kind: string;
  title: string;
  content: string;
};

const KIND_LABEL: Record<string, string> = {
  episodic: "Past outage",
  procedural: "Playbook",
  semantic: "Lesson",
  working: "Tonight",
};

export default function MemoryPage() {
  const [q, setQ] = useState("Europe checkout is timing out after a canary");
  const [matches, setMatches] = useState<Match[]>([]);

  async function search(query: string) {
    const res = await fetch(`/api/memory/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) return;
    const body = await res.json();
    setMatches(body.matches || []);
  }

  useEffect(() => {
    search(q);
  }, []);

  return (
    <>
      <Nav />
      <div className="shell" style={{ paddingTop: 36, paddingBottom: 80 }}>
        <div className="kicker">Have we seen this before?</div>
        <h1 style={{ fontSize: 48 }}>Ask Relic like you would ask last night’s on-call.</h1>
        <p className="lede">
          This is not a second database. The same CockroachDB that holds the ticket
          also finds the nearest past outage — so an agent (or a human) can reuse a
          fix instead of rediscovering it.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            search(q);
          }}
          style={{ display: "flex", gap: 8, margin: "24px 0 32px" }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{
              flex: 1,
              background: "var(--bg-2)",
              color: "var(--ink)",
              border: "1px solid var(--line)",
              padding: "10px 12px",
            }}
          />
          <button className="btn" type="submit">
            Ask memory
          </button>
        </form>
        {matches.map((m, i) => (
          <div className="mem" key={`${m.title}-${i}`}>
            <div className="kind">{KIND_LABEL[m.kind] || m.kind}</div>
            <h4>{m.title}</h4>
            <p>{m.content}</p>
          </div>
        ))}
      </div>
      <Footer />
    </>
  );
}
