"""ElevenLabs Scribe v2 STT. Official /v1/speech-to-text. No retry, no secrets in logs."""
from __future__ import annotations

from typing import Any, List

from .types import Caption, ProviderError, TranscribeResult

_TEMP_STATUS = {408, 429, 500, 502, 503, 504}


def _seg(text: Any, start: Any, end: Any) -> Caption | None:
    t = str(text or "").strip()
    if not t:
        return None
    try:
        s = round(float(start or 0), 2)
        e = round(float(end or 0), 2)
    except (TypeError, ValueError):
        return None
    if e <= s:
        return None
    return {"text": t, "start": s, "end": e}


def captions_from_scribe(payload: dict) -> List[Caption]:
    if not isinstance(payload, dict):
        return []
    words = payload.get("words") or []
    out: List[Caption] = []
    buf: list[tuple[str, float, float]] = []

    def flush() -> None:
        nonlocal buf
        if not buf:
            return
        joined = " ".join(x[0] for x in buf)
        cap = _seg(joined, buf[0][1], buf[-1][2])
        if cap:
            out.append(cap)
        buf = []

    for w in words:
        if not isinstance(w, dict):
            continue
        wtype = str(w.get("type") or "word").lower()
        if wtype != "word":
            if wtype == "spacing":
                flush()
            continue
        word = str(w.get("text") or "").strip()
        if not word:
            continue
        try:
            start = float(w.get("start") or 0)
            end = float(w.get("end") or 0)
        except (TypeError, ValueError):
            continue
        if buf and start - buf[-1][2] >= 0.8:
            flush()
        buf.append((word, start, end))
    flush()
    return out


def scribe_http_error(status: int, body_text: str) -> ProviderError:
    from whisper_error import sanitize_text
    reason = f"http_{status}"
    msg = sanitize_text(body_text, max_len=180)
    try:
        import json
        parsed = json.loads(body_text) if body_text else {}
        if isinstance(parsed, dict):
            detail = parsed.get("detail")
            if isinstance(detail, dict):
                code = detail.get("status") or detail.get("code") or detail.get("type")
                err = detail.get("message") or detail.get("msg") or ""
            elif isinstance(detail, str):
                code = None
                err = detail
            else:
                code = parsed.get("code") or parsed.get("status")
                err = parsed.get("message") or parsed.get("error") or ""
            if code:
                reason = sanitize_text(code, max_len=80) or reason
            if err:
                msg = sanitize_text(err, max_len=180)
    except Exception:
        pass
    return ProviderError(
        status=int(status),
        reason=reason,
        fallback_eligible=int(status) in _TEMP_STATUS,
        detail=f"ElevenLabs Scribe error: HTTP {status} ({reason})",
        error_type="elevenlabs",
        error_code=reason,
    )


def call_elevenlabs(audio_bytes: bytes, cfg, filename: str = "audio.wav") -> TranscribeResult:
    import io
    import requests
    from whisper_error import sanitize_text

    model = getattr(cfg, "elevenlabs_model", None) or "scribe_v2"
    try:
        resp = requests.post(
            "https://api.elevenlabs.io/v1/speech-to-text",
            headers={"xi-api-key": cfg.elevenlabs_key, "Accept": "application/json"},
            files={"file": (filename, io.BytesIO(audio_bytes), "audio/wav")},
            data={
                "model_id": model,
                "timestamps_granularity": "word",
                "tag_audio_events": "false",
            },
            timeout=120,
        )
    except requests.RequestException as exc:
        return TranscribeResult(
            ok=False, captions=[], duration=0, provider="elevenlabs", model=model,
            http_status=503,
            error=ProviderError(
                status=503, reason="network_error", fallback_eligible=True,
                detail=f"ElevenLabs network error: {sanitize_text(type(exc).__name__, max_len=80)}",
                error_type="network_error", error_code="network_error",
            ),
        )
    if resp.status_code != 200:
        err = scribe_http_error(resp.status_code, resp.text or "")
        return TranscribeResult(
            ok=False, captions=[], duration=0, provider="elevenlabs", model=model,
            http_status=resp.status_code, error=err,
        )
    try:
        payload = resp.json()
    except ValueError:
        return TranscribeResult(
            ok=False, captions=[], duration=0, provider="elevenlabs", model=model,
            http_status=502,
            error=ProviderError(
                status=502, reason="bad_json", fallback_eligible=True,
                detail="ElevenLabs Scribe error: HTTP 502 (bad_json)",
            ),
        )
    captions = captions_from_scribe(payload if isinstance(payload, dict) else {})
    duration = 0.0
    try:
        duration = float((payload or {}).get("audio_duration_secs") or 0)
    except (TypeError, ValueError):
        duration = 0.0
    return TranscribeResult(
        ok=True, captions=captions, duration=duration, provider="elevenlabs", model=model,
        http_status=200,
    )
