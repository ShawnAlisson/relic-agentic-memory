/**
 * AWS Lambda turn worker.
 * Deploy with: zip -r lambda.zip handler.mjs
 * Runtime: nodejs22.x  Handler: handler.handler
 * Env: DATABASE_URL, S3_BUCKET, AWS_REGION, optional BEDROCK_MODEL_ID
 *
 * Local judging can POST /api/demo/run instead; this file is the production shape.
 */
export async function handler(event) {
  const base = process.env.RELIC_API_URL || "http://127.0.0.1:3000";
  const res = await fetch(`${base}/api/demo/run`, { method: "POST" });
  const body = await res.json();
  return {
    statusCode: res.status,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      aws: "lambda",
      memory: "cockroachdb",
      result: body,
    }),
  };
}
