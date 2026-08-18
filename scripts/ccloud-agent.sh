#!/usr/bin/env bash
set -euo pipefail
# Agent-ready CockroachDB Cloud control plane.
# The Relic agent shells this (or ccloud directly) and expects JSON.

if [[ -z "${CCLOUD_API_KEY:-}" ]]; then
  cat <<'JSON'
{
  "ok": true,
  "mode": "simulated",
  "cluster": {
    "name": "relic-prod",
    "cloud": "AWS",
    "regions": ["eu-west-1", "us-east-1"],
    "sql_status": "HEALTHY",
    "under_replicated_ranges": 0
  },
  "hint": "Export CCLOUD_API_KEY and CCLOUD_API_SECRET, then this script calls real ccloud."
}
JSON
  exit 0
fi

ccloud cluster list --output json
