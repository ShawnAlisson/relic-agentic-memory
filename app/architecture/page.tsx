import { Footer, Nav } from "@/components/Nav";

export default function ArchitecturePage() {
  return (
    <>
      <Nav />
      <div className="shell" style={{ paddingTop: 40 }}>
        <div className="kicker">How memory actually moves</div>
        <h1 style={{ fontSize: 48 }}>Pager → VECTOR → S3 → lesson.</h1>
        <p className="lede">
          Relic is built so an agent whose process dies does not lose the incident.
          CockroachDB holds state, embeddings, and audit. AWS holds compute and
          bulky artifacts.
        </p>
        <div className="arch">
          <div className="box">
            <b>1. Episode</b>
            <span>Transactional row in episodes. Status moves open → investigating → resolved. This is working memory.</span>
          </div>
          <div className="box">
            <b>2. VECTOR</b>
            <span>memories.embedding VECTOR(384) with CREATE VECTOR INDEX (tenant_id, embedding). Semantic search stays in the system of record.</span>
          </div>
          <div className="box">
            <b>3. AWS</b>
            <span>Lambda runs the turn. S3 stores the investigation JSON. Bedrock optionally writes the resolution prose.</span>
          </div>
          <div className="box">
            <b>4. Control</b>
            <span>ccloud CLI JSON health. Cursor MCP read-only queries. Agent Skills encode the schema so the next coding agent does not invent a sidecar.</span>
          </div>
        </div>
        <pre style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--muted)", lineHeight: 1.6, paddingBottom: 80 }}>
{`Pager event
  → Relic agent (Next.js locally / AWS Lambda in prod)
  → INSERT working memory          CockroachDB
  → SELECT embedding <-> query     CockroachDB VECTOR / C-SPANN
  → ccloud cluster list --output json
  → PUT s3://relic-agent-artifacts/episodes/{id}/investigation.json
  → UPDATE episode + INSERT episodic/semantic memories
  → audit_log (append-only)`}
        </pre>
      </div>
      <Footer />
    </>
  );
}
