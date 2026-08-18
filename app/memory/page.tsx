"use client";

import { useEffect, useState } from "react";
import { Footer, Nav } from "@/components/Nav";

type Match = {
  kind: string;
  title: string;
  content: string;
  distance?: number;
};

export default function MemoryPage() {
  const [q, setQ] = useState("checkout p99 timeout eu-west-1 canary");
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
        <div className="kicker">Distributed vector indexing</div>
        <h1 style={{ fontSize: 48 }}>Same database. Vectors included.</h1>
        <p className="lede">
          Relic stores operational rows and embeddings together. Retrieval uses
          CockroachDB <code>&lt;-&gt;</code> on a tenant-prefixed VECTOR index — no
          extra store, no reindex job, no consistency gap.
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
            Search memory
          </button>
        </form>
        {matches.map((m, i) => (
          <div className="mem" key={`${m.title}-${i}`}>
            <div className="kind">
              {m.kind}
              {typeof m.distance === "number" ? ` · L2 ${Number(m.distance).toFixed(4)}` : ""}
            </div>
            <h4>{m.title}</h4>
            <p>{m.content}</p>
          </div>
        ))}
      </div>
      <Footer />
    </>
  );
}
