import express from "express";
import cors from "cors";
import multer from "multer";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

const ELEVEN_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "Rachel";
const STT_MODEL = process.env.ELEVENLABS_STT_MODEL_ID || "scribe_v1";

// TTS: text -> mp3
app.post("/api/tts", async (req, res) => {
  try {
    const { text, voice_id, voice_settings } = req.body || {};
    if (!text) return res.status(400).send("Missing 'text'");
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voice_id || VOICE_ID}`;
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": ELEVEN_API_KEY,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg"
      },
      body: JSON.stringify({
        text,
        voice_settings: voice_settings ?? { stability: 0.5, similarity_boost: 0.75 }
      })
    });
    if (!r.ok) return res.status(r.status).send(await r.text());
    res.setHeader("Content-Type", "audio/mpeg");
    r.body.pipe(res);
  } catch (e) { res.status(500).send(e.message || "Server error"); }
});

// STT: audio file -> text
const upload = multer();
app.post("/api/stt", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No audio file" });
    const form = new FormData();
    form.set("model_id", STT_MODEL);
    form.set("file", new Blob([req.file.buffer]), req.file.originalname || "clip.webm");
    const r = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": ELEVEN_API_KEY },
      body: form
    });
    if (!r.ok) return res.status(r.status).send(await r.text());
    res.json(await r.json());
  } catch (e) { res.status(500).send(e.message || "Server error"); }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API up on http://localhost:${PORT}`));