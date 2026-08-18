import Link from "next/link";
import { Footer, Nav } from "@/components/Nav";

export default function HomePage() {
  return (
    <>
      <Nav />
      <div className="shell">
        <section className="hero">
          <div>
            <div className="kicker">On-call AI · CockroachDB memory</div>
            <h1>Your on-call agent forgets the outage it just fixed.</h1>
            <p className="lede">
              At 3am, checkout dies. An AI agent investigates, rolls back a canary,
              and saves the company. Then the process ends. The next agent wakes up
              with a blank chat — and spends 40 minutes learning the same lesson.
              Relic is the database that remembers, so the next agent does not.
            </p>
            <div className="cta">
              <Link className="btn" href="/console">
                Watch Relic take the page
              </Link>
              <Link className="btn ghost" href="/memory">
                Ask: have we seen this?
              </Link>
            </div>
          </div>
          <aside className="panel">
            <h3>Tonight at Harbor Pay</h3>
            <div className="stat">
              <span>Shoppers in London</span>
              <span className="bad">cannot pay</span>
            </div>
            <div className="stat">
              <span>Pay time</span>
              <span>4.2s vs 210ms usual</span>
            </div>
            <div className="stat">
              <span>Last time this happened</span>
              <span className="ok">22 July — on file</span>
            </div>
            <div className="stat">
              <span>Without Relic</span>
              <span>repeat a 41 min rollback</span>
            </div>
            <div className="stat">
              <span>With Relic</span>
              <span className="ok">reuse the July fix</span>
            </div>
          </aside>
        </section>
        <section className="split">
          <div className="split-card">
            <div className="kicker">Without memory</div>
            <h2>Blank agent</h2>
            <p>
              New spawn. Empty context. Re-reads dashboards. Rolls back the wrong
              thing. Humans get paged anyway. The July incident might as well never
              have happened.
            </p>
          </div>
          <div className="split-card on">
            <div className="kicker">With Relic</div>
            <h2>Same agent, with a past</h2>
            <p>
              CockroachDB already holds the July case: extra payment round-trip,
              freeze the canary, batch the call. The agent acts. Then it writes
              tonight down, so 4am is not amnesia.
            </p>
          </div>
        </section>
        <section className="grid3">
          <div className="card">
            <h2>1. Save the page</h2>
            <p>The outage is a row, not a chat. If the agent dies, the case does not.</p>
          </div>
          <div className="card">
            <h2>2. Ask “seen this?”</h2>
            <p>CockroachDB vector search finds the last time Europe could not check out.</p>
          </div>
          <div className="card">
            <h2>3. Write the lesson</h2>
            <p>The next agent inherits the fix. That is the whole product.</p>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
