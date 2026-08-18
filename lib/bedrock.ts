import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";

export function bedrockEnabled(): boolean {
  return Boolean(
    process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.BEDROCK_MODEL_ID &&
      !process.env.S3_ENDPOINT,
  );
}

export async function bedrockReason(input: {
  system: string;
  prompt: string;
}): Promise<string | null> {
  if (!process.env.BEDROCK_MODEL_ID || !process.env.AWS_ACCESS_KEY_ID) {
    return null;
  }
  if (process.env.S3_ENDPOINT && !process.env.FORCE_BEDROCK) {
    return null;
  }
  try {
    const client = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || "eu-west-1",
    });
    const res = await client.send(
      new ConverseCommand({
        modelId: process.env.BEDROCK_MODEL_ID,
        system: [{ text: input.system }],
        messages: [{ role: "user", content: [{ text: input.prompt }] }],
        inferenceConfig: { maxTokens: 700, temperature: 0.2 },
      }),
    );
    const text = res.output?.message?.content
      ?.map((c) => ("text" in c ? c.text : ""))
      .join("\n");
    return text || null;
  } catch {
    return null;
  }
}
