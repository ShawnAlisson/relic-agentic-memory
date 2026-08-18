import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { loadEnv } from "./env.mjs";

loadEnv();
const execFileAsync = promisify(execFile);

// Spoken, not a trailer. Contractions, short sentences, what the product is.
const NARRATION = `Relic is memory for on-call A.I. agents.

Not a chatbot. A database, so when an agent dies, the lesson does not.

Here is why that matters. Agents already get paged into production. They investigate a checkout outage, they roll something back, they write constantly. Then the process is gone. The next agent wakes up with a blank context window. That is amnesia wearing a pager.

Relic stores the incident in CockroachDB. The live episode, similar outages from last month, and the runbook, including a vector search so it can actually find: we have seen this checkout timeout before.

Watch a SEV-1. Checkout latency jumps to four seconds in Europe. Relic opens a record, searches memory, and pulls the July incident plus the p99 runbook. It checks that Cockroach itself is healthy, writes the investigation to S3, and saves the lesson.

So tonight's agent, or one in another region, does not repeat the same rollback. That is Relic. Durable memory for agents that have to act.`;

function slideHtml(kicker, title, body, extra = "") {
  return `<!doctype html>
<html><head><meta charset="utf-8"/>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500&family=Newsreader:opsz,wght@6..72,500&display=swap" rel="stylesheet">
<style>
  html,body{margin:0;height:100%;background:#0c0d0b;color:#ece7d8;font-family:"IBM Plex Sans",Helvetica,sans-serif;}
  .wrap{padding:80px 96px;height:100%;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;}
  .k{font-family:"IBM Plex Mono",monospace;letter-spacing:.16em;text-transform:uppercase;color:#d6ff4b;font-size:20px;}
  h1{font-family:"Newsreader",Georgia,serif;font-weight:500;font-size:72px;line-height:1.02;margin:20px 0 16px;max-width:18ch;letter-spacing:-.03em;}
  p{font-size:30px;line-height:1.4;color:#9a947f;max-width:22em;margin:0;}
  .bar{position:absolute;bottom:0;left:0;right:0;height:10px;background:#d6ff4b;}
  .extra{margin-top:36px;display:flex;gap:28px;}
  .card{flex:1;border-top:1px solid #2a2c24;padding-top:14px;}
  .card b{display:block;font-size:22px;margin-bottom:6px;}
  .card span{color:#9a947f;font-size:20px;}
</style></head>
<body><div class="bar"></div>
<div class="wrap">
  <div class="k">${kicker}</div>
  <h1>${title}</h1>
  <p>${body}</p>
  ${extra}
</div></body></html>`;
}

const slides = [
  {
    kicker: "What this is",
    title: "Relic is memory for on-call AI agents.",
    body: "When production pages an agent, Relic is the database it remembers with — not a chat window that vanishes when the process dies.",
  },
  {
    kicker: "The problem",
    title: "Today’s agents forget the outage they just fixed.",
    body: "They investigate, they roll back, they write constantly. Then the spawn is gone. The next one starts from zero. That is amnesia on-call.",
  },
  {
    kicker: "What it does",
    title: "Store the incident. Recall the last time. Act. Write the lesson.",
    body: "Three moves, one system of record in CockroachDB.",
    extra: `<div class="extra">
      <div class="card"><b>Store</b><span>Episode row + working memory</span></div>
      <div class="card"><b>Recall</b><span>VECTOR search over past SEVs</span></div>
      <div class="card"><b>Act</b><span>S3 packet, then commit the lesson</span></div>
    </div>`,
  },
  {
    kicker: "Live example",
    title: "Checkout is dying in Europe. Relic has seen this.",
    body: "p99 hits 4.2 seconds. Memory returns the July SDK incident and the p99 runbook. The agent does not guess from a blank prompt.",
  },
  {
    kicker: "Why CockroachDB",
    title: "The memory is the database. Not a sidecar.",
    body: "Incidents, runbooks, and embeddings live together. Vector search and the ticket share a commit. If the agent process dies, Cockroach still has the night.",
  },
  {
    kicker: "Why it matters",
    title: "The next agent inherits the fix.",
    body: "Relic writes the lesson back. Tonight, or in another region, nobody repeats the same rollback. That is production memory for agents that act.",
  },
];

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit" });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited ${code}`));
    });
  });
}

function chromeBin() {
  const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  if (existsSync(chrome)) return chrome;
  throw new Error("Chrome not found");
}

async function chromeShot(target, pngFile, size = "1920,1080") {
  await run(chromeBin(), [
    "--headless=new",
    "--disable-gpu",
    `--screenshot=${pngFile}`,
    `--window-size=${size}`,
    "--hide-scrollbars",
    "--default-background-color=0c0d0b",
    target,
  ]);
}

async function ttsEleven(text, out) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return false;
  // Will — conversational US, less announcer than George
  const voice = process.env.ELEVENLABS_VOICE_ID || "bIHbv24MWmeRgasZH58o";
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
    method: "POST",
    headers: {
      "xi-api-key": key,
      accept: "audio/mpeg",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.38,
        similarity_boost: 0.78,
        style: 0.22,
        use_speaker_boost: true,
      },
    }),
  });
  if (!res.ok) {
    console.warn("ElevenLabs failed", res.status, await res.text());
    return false;
  }
  await writeFile(out, Buffer.from(await res.arrayBuffer()));
  return true;
}

async function main() {
  const root = path.join(process.cwd(), "demo");
  await mkdir(path.join(root, "slides"), { recursive: true });
  await mkdir(path.join(root, "frames"), { recursive: true });
  await mkdir(path.join(root, "audio"), { recursive: true });
  await mkdir(path.join(root, "out"), { recursive: true });

  const thumbHtml = path.join(root, "thumbnail.html");
  const thumbPng = path.join(root, "out", "relic-thumbnail.png");
  const thumbJpg = path.join(root, "out", "relic-thumbnail.jpg");
  await chromeShot(`file://${thumbHtml}`, thumbPng, "1800,1200");
  await run("ffmpeg", [
    "-y",
    "-i",
    thumbPng,
    "-vf",
    "scale=1800:1200",
    "-q:v",
    "3",
    thumbJpg,
  ]);

  for (let i = 0; i < slides.length; i += 1) {
    const s = slides[i];
    const htmlPath = path.join(root, "slides", `${String(i).padStart(2, "0")}.html`);
    await writeFile(htmlPath, slideHtml(s.kicker, s.title, s.body, s.extra || ""));
    await chromeShot(
      `file://${htmlPath}`,
      path.join(root, "frames", `${String(i).padStart(2, "0")}.png`),
    );
  }

  const live = [
    ["http://127.0.0.1:3000/", "live-home.png"],
    ["http://127.0.0.1:3000/console", "live-console.png"],
    ["http://127.0.0.1:3000/memory", "live-memory.png"],
  ];
  for (const [url, name] of live) {
    try {
      await chromeShot(url, path.join(root, "frames", name));
    } catch (err) {
      console.warn("live screenshot skipped", url, err.message);
    }
  }

  const mp3 = path.join(root, "audio", "vo.mp3");
  const voiced = await ttsEleven(NARRATION, mp3);
  if (!voiced) {
    const wav = path.join(root, "audio", "vo.wav");
    const aiff = path.join(root, "audio", "vo.aiff");
    await execFileAsync("say", ["-v", "Samantha", "-r", "172", "-o", aiff, NARRATION]);
    await run("ffmpeg", ["-y", "-i", aiff, "-ar", "44100", "-ac", "1", wav]);
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
  ];
  const existing = frameNames.filter((n) => existsSync(path.join(root, "frames", n)));
  const duration = voiced ? 10 : 9;
  const list = existing
    .map((n) => `file '${path.join(root, "frames", n)}'\nduration ${duration}`)
    .join("\n");
  const last = path.join(root, "frames", existing[existing.length - 1]);
  const concatPath = path.join(root, "frames", "concat.txt");
  await writeFile(concatPath, `${list}\nfile '${last}'\n`);

  const audio = voiced ? mp3 : path.join(root, "audio", "vo.wav");
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
    "-filter_complex",
    "[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=30[v];[1:a]atempo=0.96[a]",
    "-map",
    "[v]",
    "-map",
    "[a]",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-shortest",
    out,
  ]);
  console.log("wrote", out);
  console.log("thumbnail", thumbJpg);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
