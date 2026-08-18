import { Footer, Nav } from "@/components/Nav";

export default function ArchitecturePage() {
  return (
    <>
      <Nav />
      <div className="shell" style={{ paddingTop: 40 }}>
        <div className="kicker">How Relic actually works</div>
        <h1 style={{ fontSize: 48 }}>The pager hits. The agent must not start from zero.</h1>
        <p className="lede">
          Relic is one loop. Save the outage. Ask if it has happened. Act. Write the
          lesson. CockroachDB is the memory. AWS is the hands (S3 for the packet,
          Lambda for the turn, Bedrock if you want prose).
        </p>
        <div className="arch">
          <div className="box">
            <b>1. The page</b>
            <span>A row in CockroachDB. If the agent process dies mid-turn, the case is still there.</span>
          </div>
          <div className="box">
            <b>2. “Seen this?”</b>
            <span>Vector search on the same database — last time Europe could not check out, plus the playbook.</span>
          </div>
          <div className="box">
            <b>3. The hands</b>
            <span>S3 holds bulky logs. Lambda can run the turn. Bedrock is optional. Memory never lives only there.</span>
          </div>
          <div className="box">
            <b>4. Next spawn</b>
            <span>The lesson is a row. Tonight’s agent, or one in another region, inherits it.</span>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
