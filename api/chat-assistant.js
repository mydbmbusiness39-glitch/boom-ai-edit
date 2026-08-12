// AI Editor Assistant — Vercel serverless function (Edge runtime)
// Smart built-in brain: maps editing commands to structured actions.
// Later: plug OmniRoute / real LLM here (AI_GATEWAY_URL env) for full AI.

export const config = { runtime: 'edge' };

const COMMANDS = [
  { match: /cut.*boring|boring parts|trim/i, action: "cut_boring", label: "Cut boring parts" },
  { match: /caption|subtitle|drake/i, action: "add_captions", label: "Add captions" },
  { match: /meme/i, action: "make_meme", label: "Turn into a meme" },
  { match: /speed|faster|slow/i, action: "adjust_speed", label: "Adjust speed" },
  { match: /music|sound|audio/i, action: "add_music", label: "Add music" },
  { match: /zoom|punch/i, action: "punch_in", label: "Punch-in zoom" },
  { match: /remove.*silence|silence/i, action: "remove_silence", label: "Remove silence" },
  { match: /split|cut here|slice/i, action: "split_clip", label: "Split clip" },
  { match: /duplicate|copy|clone/i, action: "duplicate_clip", label: "Duplicate clip" },
  { match: /delete|remove clip|erase/i, action: "delete_clip", label: "Delete clip" },
];

function parseCommand(message) {
  for (const c of COMMANDS) {
    if (c.match.test(message)) {
      return { action: c.action, parameters: { query: message }, status: "processing" };
    }
  }
  return null;
}

function buildResponse(message, command) {
  if (command) {
    const labels = {
      cut_boring: "I'll find the slow sections and cut them out — keeping only the moments that hold attention.",
      add_captions: "Adding punchy captions to every highlight. Big, bold, impossible to miss.",
      make_meme: "Turning this into a meme-style cut — snappy timing, funny beat drops, share-ready.",
      adjust_speed: "Adjusting the tempo — speeding up the slow parts, holding the money shots.",
      add_music: "Laying in a track that matches the energy. Auto-music will pick the vibe.",
      punch_in: "Adding punch-in zooms on the key moments to keep eyes locked.",
      remove_silence: "Scanning for dead air and tightening every gap.",
      split_clip: "Splitting the clip at the playhead.",
      duplicate_clip: "Duplicating the selected clip.",
      delete_clip: "Removing the selected clip from the timeline.",
    };
    return labels[command.action] || "On it — applying that now.";
  }
  return "Here's what I can do: cut boring parts, add captions in Drake style, turn this into a meme, adjust speed, add music, punch-in zoom, remove silence, split, duplicate, or delete clips. Try one of those!";
}

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const message = (body?.message || "").toString();

    // Optional: route to a real LLM via OmniRoute if configured
    const gatewayUrl = process.env.AI_GATEWAY_URL;
    const gatewayKey = process.env.AI_GATEWAY_KEY;

    if (gatewayUrl && gatewayKey) {
      try {
        const llmRes = await fetch(`${gatewayUrl}/v1/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${gatewayKey}`,
          },
          body: JSON.stringify({
            model: body?.model || "default",
            messages: [
              { role: "system", content: "You are the AI editing assistant for BoomStudio. Analyze the user's editing request and respond briefly. If it's an editing action, end your reply with a line: ACTION:<action_name>" },
              { role: "user", content: message },
            ],
            max_tokens: 200,
          }),
        });
        if (llmRes.ok) {
          const llmData = await llmRes.json();
          const text = llmData?.choices?.[0]?.message?.content || "";
          const actionMatch = text.match(/ACTION:(\w+)/);
          return new Response(JSON.stringify({
            response: text.replace(/ACTION:\w+\s*/g, "").trim(),
            command: actionMatch ? { action: actionMatch[1], parameters: { query: message }, status: "processing" } : null,
          }), { status: 200, headers: { "Content-Type": "application/json" } });
        }
      } catch (e) {
        // fall through to built-in brain
      }
    }

    const command = parseCommand(message);
    const response = buildResponse(message, command);

    return new Response(JSON.stringify({ response, command }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Bad request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}
