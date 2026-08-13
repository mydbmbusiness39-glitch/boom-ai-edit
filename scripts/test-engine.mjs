// Quick Node test of the repurpose engine logic (same API calls the browser uses)
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log("Loading ffmpeg.wasm core...");
  const ffmpeg = new FFmpeg();
  ffmpeg.on("log", ({ message }) => {
    if (message.includes("error") || message.includes("Error")) console.log("LOG:", message.slice(0, 200));
  });
  ffmpeg.on("progress", ({ progress }) => {
    if (progress > 0) console.log(`  progress: ${(progress * 100).toFixed(0)}%`);
  });

  const baseURL = path.join(__dirname, "..", "public", "ffmpeg");
  await ffmpeg.load({
    coreURL: await toBlobURL(`file://${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`file://${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
  });
  console.log("Core loaded ✓");

  // Use a small real video (first 5s trimmed to keep test fast)
  const input = readFileSync("/root/bcwa-twin/c45_a.mp4");
  console.log("Input bytes:", input.length);

  const inputName = "input.mp4";
  await ffmpeg.writeFile(inputName, new Uint8Array(input));
  console.log("Input written ✓");

  // 9:16 crop — same command the app runs
  const filter = "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920";
  console.log("Running crop filter:", filter);
  await ffmpeg.exec([
    "-i", inputName,
    "-vf", filter,
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-crf", "23",
    "-c:a", "aac",
    "-b:a", "128k",
    "-movflags", "+faststart",
    "-y",
    "output.mp4",
  ]);

  const out = await ffmpeg.readFile("output.mp4");
  console.log("OUTPUT bytes:", out.length);
  if (out.length > 0) {
    const { writeFileSync } = await import("fs");
    writeFileSync("/tmp/engine-test-9x16.mp4", Buffer.from(out));
    console.log("Saved to /tmp/engine-test-9x16.mp4 ✓");
  }
  process.exit(0);
}

main().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
