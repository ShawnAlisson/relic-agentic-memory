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
          <Link href="/console">Live incident</Link>
          <Link href="/memory">Have we seen this?</Link>
          <Link href="/architecture">How it works</Link>
        </div>
      </nav>
    </div>
  );
}

export function Footer() {
  return (
    <div className="shell">
      <footer className="footer">
        <span>Relic: on-call agents that remember the last outage.</span>
        <span>MIT · Hackathon 2026</span>
      </footer>
    </div>
  );
}
