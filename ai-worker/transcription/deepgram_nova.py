"""Normalize Deepgram Listen JSON to Boom captions. HTTP caller is separate."""
from __future__ import annotations

from typing import Any, List

from .types import Caption, ProviderError, TranscribeResult


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


def _from_utterances(utterances: list) -> List[Caption]:
    out: List[Caption] = []
    for u in utterances or []:
        if not isinstance(u, dict):
            continue
        cap = _seg(u.get("transcript") or u.get("text"), u.get("start"), u.get("end"))
        if cap:
            out.append(cap)
    return out


def _from_sentences(payload: dict) -> List[Caption]:
    out: List[Caption] = []
    channels = ((payload.get("results") or {}).get("channels") or [])
    for ch in channels:
        alts = (ch or {}).get("alternatives") or []
        for alt in alts:
            paras = ((alt or {}).get("paragraphs") or {}).get("paragraphs") or []
            for para in paras:
                for sent in (para or {}).get("sentences") or []:
                    cap = _seg((sent or {}).get("text"), (sent or {}).get("start"), (sent or {}).get("end"))
                    if cap:
                        out.append(cap)
            if out:
                return out
    return out


def _from_words(payload: dict) -> List[Caption]:
    channels = ((payload.get("results") or {}).get("channels") or [])
    words = []
    for ch in channels:
        alts = (ch or {}).get("alternatives") or []
        if alts and isinstance(alts[0], dict):
            words = alts[0].get("words") or []
            break
    buf: list[tuple[str, float, float]] = []
    out: List[Caption] = []
    for w in words:
        if not isinstance(w, dict):
            continue
        word = str(w.get("punctuated_word") or w.get("word") or "").strip()
        if not word:
            continue
        try:
            start = float(w.get("start") or 0)
            end = float(w.get("end") or 0)
        except (TypeError, ValueError):
            continue
        if buf and start - buf[-1][2] >= 0.8:
            joined = " ".join(x[0] for x in buf)
            cap = _seg(joined, buf[0][1], buf[-1][2])
            if cap:
                out.append(cap)
            buf = []
        buf.append((word, start, end))
    if buf:
        joined = " ".join(x[0] for x in buf)
        cap = _seg(joined, buf[0][1], buf[-1][2])
        if cap:
            out.append(cap)
    return out


def captions_from_deepgram(payload: dict) -> List[Caption]:
    if not isinstance(payload, dict):
        return []
    utterances = (payload.get("results") or {}).get("utterances") or payload.get("utterances")
    caps = _from_utterances(utterances if isinstance(utterances, list) else [])
    if caps:
        return caps
    caps = _from_sentences(payload)
    if caps:
        return caps
    return _from_words(payload)


_TEMP_STATUS = {408, 429, 500, 502, 503, 504}


def deepgram_http_error(status: int, body_text: str) -> ProviderError:
    from whisper_error import sanitize_text
    reason = f"http_{status}"
    msg = sanitize_text(body_text, max_len=180)
    try:
        import json
        parsed = json.loads(body_text) if body_text else {}
        if isinstance(parsed, dict):
            code = parsed.get("err_code") or parsed.get("code")
            err = parsed.get("err_msg") or parsed.get("message") or parsed.get("error") or ""
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
        detail=f"Deepgram API error: HTTP {status} ({reason})",
        error_type="deepgram",
        error_code=reason,
    )


def call_deepgram(audio_bytes: bytes, cfg) -> TranscribeResult:
    import requests
    from whisper_error import sanitize_text

    model = cfg.deepgram_model or "nova-3"
    url = (
        "https://api.deepgram.com/v1/listen"
        f"?model={model}&smart_format=true&punctuate=true&utterances=true&paragraphs=true"
    )
    try:
        resp = requests.post(
            url,
            headers={
                "Authorization": f"Token {cfg.deepgram_key}",
                "Content-Type": "audio/wav",
            },
            data=audio_bytes,
            timeout=120,
        )
    except requests.RequestException as exc:
        return TranscribeResult(
            ok=False, captions=[], duration=0, provider="deepgram", model=model,
            http_status=503,
            error=ProviderError(
                status=503, reason="network_error", fallback_eligible=True,
                detail=f"Deepgram network error: {sanitize_text(type(exc).__name__, max_len=80)}",
                error_type="network_error", error_code="network_error",
            ),
        )
    if resp.status_code != 200:
        err = deepgram_http_error(resp.status_code, resp.text or "")
        return TranscribeResult(
            ok=False, captions=[], duration=0, provider="deepgram", model=model,
            http_status=resp.status_code, error=err,
        )
    try:
        payload = resp.json()
    except ValueError:
        return TranscribeResult(
            ok=False, captions=[], duration=0, provider="deepgram", model=model,
            http_status=502,
            error=ProviderError(status=502, reason="bad_json", fallback_eligible=True,
                                detail="Deepgram API error: HTTP 502 (bad_json)"),
        )
    captions = captions_from_deepgram(payload if isinstance(payload, dict) else {})
    duration = 0.0
    try:
        duration = float((((payload.get("metadata") or {}).get("duration")) or 0) or 0)
    except (TypeError, ValueError):
        duration = 0.0
    return TranscribeResult(
        ok=True, captions=captions, duration=duration, provider="deepgram", model=model,
        http_status=200,
    )
