import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const execFileAsync = promisify(execFile);

const NARRATION = [
  "Relic is agentic memory that does not go down.",
  "On-call agents spawn, write constantly, and die. Their lessons should not.",
  "We store working memory, episodes, and embeddings in CockroachDB — one system of record.",
  "When checkout p99 explodes in eu-west-1, Relic retrieves the last time it happened using CockroachDB distributed vector indexing.",
  "No sidecar vector store. No consistency gap. Tenant-prefixed C-SPANN keeps customer memories isolated.",
  "The agent checks CockroachDB Cloud with the ccloud CLI — JSON out, service-account RBAC.",
  "Investigation packets go to Amazon S3. Turns can run on AWS Lambda. Bedrock is optional reasoning, not the memory.",
  "Then Relic commits the lesson. The next spawn starts with history, not a blank context window.",
  "Agents that forget are not production agents. Relic remembers.",
];

function slideHtml(title, body, kicker) {
  return `<!doctype html>
<html><head><meta charset="utf-8"/>
<style>
  html,body{margin:0;height:100%;background:#0c0d0b;color:#ece7d8;font-family:IBM Plex Sans,Helvetica,sans-serif;}
  .wrap{padding:72px 88px;height:100%;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;}
  .k{font-family:IBM Plex Mono,monospace;letter-spacing:.18em;text-transform:uppercase;color:#d6ff4b;font-size:18px;}
  h1{font-weight:500;font-size:64px;line-height:1.02;margin:18px 0;max-width:16ch;letter-spacing:-.03em;}
  p{font-size:28px;line-height:1.4;color:#9a947f;max-width:28em;}
  .bar{position:absolute;bottom:0;left:0;right:0;height:8px;background:#d6ff4b;}
</style></head>
<body><div class="bar"></div>
<div class="wrap">
  <div class="k">${kicker}</div>
  <h1>${title}</h1>
  <p>${body}</p>
</div></body></html>`;
}

const slides = [
  {
    kicker: "CockroachDB × AWS · Agentic memory",
    title: "Relic",
    body: "Agents that think. Agents that act. Agents that remember — reliably, globally, at any scale.",
  },
  {
    kicker: "The failure mode",
    title: "An agent whose memory goes offline does not degrade. It stops.",
    body: "Traditional databases were built for human-scale reads. Agentic systems spawn autonomously and write constantly.",
  },
  {
    kicker: "System of record",
    title: "CockroachDB holds the memory. AWS holds the work.",
    body: "Episodes, traces, VECTOR embeddings, and audit logs in CockroachDB. Artifacts on S3. Turns on Lambda.",
  },
  {
    kicker: "Distributed vector indexing",
    title: "Same commit as the incident.",
    body: "CREATE VECTOR INDEX on memories(tenant_id, embedding). Retrieval uses embedding <-> query. No second database to drift.",
  },
  {
    kicker: "Live SEV1",
    title: "Checkout p99 is 4.2 seconds in eu-west-1.",
    body: "Relic retrieves the July SDK incident, the p99 runbook, and the tenant isolation rule — then acts.",
  },
  {
    kicker: "Control plane",
    title: "ccloud cluster list --output json",
    body: "Before the agent trusts memory, it asks CockroachDB Cloud if the memory layer itself is healthy.",
  },
  {
    kicker: "The point",
    title: "The next spawn does not start from zero.",
    body: "Episodic and semantic rows are committed. Relic is production memory for on-call agent fleets.",
  },
];

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit", ...opts });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited ${code}`));
    });
  });
}

async function ttsEleven(text, out) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return false;
  const res = await fetch(
    "https://api.elevenlabs.io/v1/text-to-speech/JBFqnCBsd6RMkjVDRZzb",
    {
      method: "POST",
      headers: {
        "xi-api-key": key,
        accept: "audio/mpeg",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.45, similarity_boost: 0.75 },
      }),
    },
  );
  if (!res.ok) {
    console.warn("ElevenLabs failed", res.status, await res.text());
    return false;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(out, buf);
  return true;
}

async function ttsSay(text, outWav) {
  const aiff = outWav.replace(/\.wav$/, ".aiff");
  await execFileAsync("say", ["-v", "Daniel", "-o", aiff, text]);
  await run("ffmpeg", ["-y", "-i", aiff, "-ar", "44100", "-ac", "1", outWav]);
}

function chromeBin() {
  const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const chrome2 = "/Applications/Chromium.app/Contents/MacOS/Chromium";
  if (existsSync(chrome)) return chrome;
  if (existsSync(chrome2)) return chrome2;
  throw new Error("Chrome not found for slide screenshots");
}

async function chromeShot(target, pngFile) {
  await run(chromeBin(), [
    "--headless=new",
    "--disable-gpu",
    `--screenshot=${pngFile}`,
    "--window-size=1920,1080",
    "--hide-scrollbars",
    "--default-background-color=0c0d0b",
    target,
  ]);
}

async function main() {
  const root = path.join(process.cwd(), "demo");
  await mkdir(path.join(root, "slides"), { recursive: true });
  await mkdir(path.join(root, "frames"), { recursive: true });
  await mkdir(path.join(root, "audio"), { recursive: true });
  await mkdir(path.join(root, "out"), { recursive: true });

  for (let i = 0; i < slides.length; i += 1) {
    const s = slides[i];
    const htmlPath = path.join(root, "slides", `${String(i).padStart(2, "0")}.html`);
    await writeFile(htmlPath, slideHtml(s.title, s.body, s.kicker));
    const png = path.join(root, "frames", `${String(i).padStart(2, "0")}.png`);
    await chromeShot(`file://${htmlPath}`, png);
  }

  const live = [
    ["http://127.0.0.1:3000/", "live-home.png"],
    ["http://127.0.0.1:3000/console", "live-console.png"],
    ["http://127.0.0.1:3000/memory", "live-memory.png"],
    ["http://127.0.0.1:3000/architecture", "live-arch.png"],
  ];
  for (const [url, name] of live) {
    try {
      await chromeShot(url, path.join(root, "frames", name));
    } catch (err) {
      console.warn("live screenshot skipped", url, err.message);
    }
  }

  const full = NARRATION.join(" ");
  const mp3 = path.join(root, "audio", "vo.mp3");
  const wav = path.join(root, "audio", "vo.wav");
  const voiced = await ttsEleven(full, mp3);
  if (!voiced) {
    await ttsSay(full, wav);
  }

  const frameNames = [
    "00.png",
    "live-home.png",
    "01.png",
    "02.png",
    "live-console.png",
    "03.png",
    "live-memory.png",
    "04.png",
    "05.png",
    "live-arch.png",
    "06.png",
  ];
  const existing = frameNames.filter((n) => existsSync(path.join(root, "frames", n)));
  const list = existing
    .map((n) => `file '${path.join(root, "frames", n)}'\nduration 8`)
    .join("\n");
  const last = path.join(root, "frames", existing[existing.length - 1]);
  const concatPath = path.join(root, "frames", "concat.txt");
  await writeFile(concatPath, `${list}\nfile '${last}'\n`);

  const audio = voiced ? mp3 : wav;
  const out = path.join(root, "out", "relic-demo.mp4");
  await run("ffmpeg", [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    concatPath,
    "-i",
    audio,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-vf",
    "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=30",
    "-c:a",
    "aac",
    "-shortest",
    out,
  ]);
  console.log("wrote", out);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
