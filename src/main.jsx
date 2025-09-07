import React from "react";
import { createRoot } from "react-dom/client";

function App() {
  const [text, setText] = React.useState("Hello! Welcome to BOOM AI.");
  const [log, setLog] = React.useState("");
  const append = (m) => setLog((x) => x + m + "\n");

  async function speak() {
    try {
      const r = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
      if (!r.ok) throw new Error(await r.text());
      const buf = await r.arrayBuffer();
      const url = URL.createObjectURL(new Blob([buf], { type: "audio/mpeg" }));
      const a = new Audio(url);
      await a.play();
      append("Spoke your text.");
    } catch (e) { append("TTS error: " + e.message); }
  }

  async function record(ms = 4000) {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const rec = new MediaRecorder(stream); const chunks = [];
    rec.ondataavailable = e => chunks.push(e.data);
    rec.start(); await new Promise(r => setTimeout(r, ms)); rec.stop();
    await new Promise(r => rec.onstop = r);
    return new Blob(chunks, { type: chunks[0]?.type || "audio/webm" });
  }

  async function transcribeAndSpeak() {
    try {
      append("Recording 4s…");
      const blob = await record(4000);
      const fd = new FormData();
      fd.append("audio", blob, "clip.webm");
      const r = await fetch("/api/stt", { method: "POST", body: fd });
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      const said = data.text || JSON.stringify(data);
      append("You said: " + said);
      setText(said);
      await speak();
    } catch (e) { append("STT error: " + e.message); }
  }

  return (
    <div style={{ fontFamily: "system-ui, Arial", padding: 24, maxWidth: 600, margin: "0 auto" }}>
      <h1>🎙️ BOOM AI TTS</h1>
      <label>Enter Text:</label>
      <textarea value={text} onChange={e => setText(e.target.value)} rows={6} style={{width:"100%",margin:"8px 0"}} />
      <div style={{display:"flex", gap: 12, marginBottom: 12}}>
        <button onClick={speak}>🔊 Generate Speech</button>
        <button onClick={transcribeAndSpeak}>🎤 Record 4s → Transcribe → Speak</button>
      </div>
      <pre style={{background:"#fafafa",border:"1px solid #eee",padding:12,borderRadius:8,whiteSpace:"pre-wrap"}}>{log}</pre>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);