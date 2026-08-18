# Relic — YouTube / Vimeo

Upload `demo/out/relic-demo.mp4` as a **public** video (under 3 minutes).

**Title:** Relic — Agentic memory on CockroachDB + AWS

**Description:**

Relic is an on-call agent whose memory is CockroachDB, not a chat window.

When checkout p99 spikes in eu-west-1, the agent:
1. Writes working memory as a transactional episode
2. Retrieves prior incidents with CockroachDB distributed VECTOR indexes (C-SPANN, tenant-prefixed)
3. Checks cluster health with the agent-ready ccloud CLI
4. Stores the investigation packet on Amazon S3
5. Commits episodic + semantic lessons so the next spawn does not start from zero

CockroachDB tools: Distributed Vector Indexing, Agent Skills, ccloud CLI, Managed MCP config.
AWS: Amazon S3, AWS Lambda, Amazon Bedrock (optional).

Repo walkthrough in README. Built for the CockroachDB × AWS Hackathon.
