import Link from "next/link";

export function Nav() {
  return (
    <div className="shell">
      <nav className="nav">
        <Link href="/" className="brand">
          <span className="mark">CRDB × AWS</span>
          <strong>Relic</strong>
        </Link>
        <div className="links">
          <Link href="/console">Console</Link>
          <Link href="/memory">Memory</Link>
          <Link href="/architecture">Architecture</Link>
        </div>
      </nav>
    </div>
  );
}

export function Footer() {
  return (
    <div className="shell">
      <footer className="footer">
        <span>Relic uses CockroachDB as the system of record for agent memory.</span>
        <span>MIT · Hackathon 2026</span>
      </footer>
    </div>
  );
}
