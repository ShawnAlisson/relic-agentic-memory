#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
docker compose up -d crdb minio createbucket
echo "waiting for cockroach..."
for i in $(seq 1 40); do
  if docker exec build_with_agedntic_memory-crdb-1 cockroach sql --insecure -e "SELECT 1" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done
npm install
npm run db:migrate
npm run db:seed
npm run dev
