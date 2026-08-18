import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

function client() {
  const endpoint = process.env.S3_ENDPOINT;
  return new S3Client({
    region: process.env.AWS_REGION || "eu-west-1",
    endpoint: endpoint || undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true" || Boolean(endpoint),
    credentials:
      process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          }
        : undefined,
  });
}

export function artifactBucket(): string {
  return process.env.S3_BUCKET || "relic-agent-artifacts";
}

export async function ensureBucket(): Promise<void> {
  const s3 = client();
  const bucket = artifactBucket();
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    try {
      await s3.send(new CreateBucketCommand({ Bucket: bucket }));
    } catch {
      /* already exists or local minio race */
    }
  }
}

export async function putArtifact(input: {
  key: string;
  body: string | Buffer;
  contentType: string;
}): Promise<{ bucket: string; key: string; bytes: number }> {
  await ensureBucket();
  const bucket = artifactBucket();
  const body =
    typeof input.body === "string" ? Buffer.from(input.body, "utf8") : input.body;
  const s3 = client();
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: input.key,
      Body: body,
      ContentType: input.contentType,
    }),
  );
  return { bucket, key: input.key, bytes: body.length };
}
