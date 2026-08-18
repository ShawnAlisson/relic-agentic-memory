import Link from "next/link";
import { Footer, Nav } from "@/components/Nav";

export default function HomePage() {
  return (
    <>
      <Nav />
      <div className="shell">
        <section className="hero">
          <div>
            <div className="kicker">Agentic memory · CockroachDB · AWS</div>
            <h1>Agents that forget are not production agents.</h1>
            <p className="lede">
              Relic is the system of record for on-call agent fleets. Every spawn writes
              working memory, retrieves semantic neighbors through CockroachDB’s
              distributed vector index, and commits lessons that survive region loss.
              Session chat is not memory. This is.
            </p>
            <div className="cta">
              <Link className="btn" href="/console">
                Run a live incident
              </Link>
              <Link className="btn ghost" href="/architecture">
                See the memory path
              </Link>
            </div>
          </div>
          <aside className="panel">
            <h3>Memory layer now</h3>
            <div className="stat">
              <span>CockroachDB VECTOR</span>
              <span className="ok">C-SPANN</span>
            </div>
            <div className="stat">
              <span>Tenant prefix</span>
              <span className="ok">isolated</span>
            </div>
            <div className="stat">
              <span>Artifacts</span>
              <span>Amazon S3</span>
            </div>
            <div className="stat">
              <span>Turns</span>
              <span>AWS Lambda</span>
            </div>
            <div className="stat">
              <span>Reasoning</span>
              <span>Bedrock optional</span>
            </div>
            <div className="stat">
              <span>Control plane</span>
              <span>ccloud CLI</span>
            </div>
            <div className="stat">
              <span>Cursor / Claude</span>
              <span>Managed MCP</span>
            </div>
          </aside>
        </section>
        <section className="grid3">
          <div className="card">
            <h2>Store</h2>
            <p>
              Episodes, traces, and embeddings are transactional rows. If the agent
              process dies mid-turn, CockroachDB still has the working memory.
            </p>
          </div>
          <div className="card">
            <h2>Retrieve</h2>
            <p>
              Distributed vector search finds the last time checkout p99 exploded —
              across regions, without a sidecar vector database drifting out of sync.
            </p>
          </div>
          <div className="card">
            <h2>Act</h2>
            <p>
              The agent writes an investigation packet to S3, checks cluster health
              with ccloud, and commits a lesson so the next spawn does not repeat the
              rollback.
            </p>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
