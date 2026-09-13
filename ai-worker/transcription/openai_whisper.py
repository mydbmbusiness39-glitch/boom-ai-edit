"""OpenAI whisper-1 caller. Diagnostics preserved. One POST, no retry."""
from __future__ import annotations

from typing import List

from whisper_error import sanitize_whisper_error

from .types import Caption, ProviderError, TranscribeResult

_NO_CREDIT = {
    "insufficient_quota",
    "credit_balance_exhausted",
    "organization_usage_limit_exceeded",
    "organization_spend_limit_exceeded",
    "project_spend_limit_exceeded",
}


def captions_from_whisper(payload: dict) -> List[Caption]:
    out: List[Caption] = []
    if not isinstance(payload, dict):
        return out
    for seg in payload.get("segments") or []:
        if not isinstance(seg, dict):
            continue
        text = (seg.get("text") or "").strip()
        if not text:
            continue
        try:
            start = round(float(seg.get("start", 0)), 2)
            end = round(float(seg.get("end", 0)), 2)
        except (TypeError, ValueError):
            continue
        if end > start:
            out.append({"text": text, "start": start, "end": end})
    return out


def call_openai(audio_bytes: bytes, cfg, filename: str = "audio.wav") -> TranscribeResult:
    import io
    import requests

    model = "whisper-1"
    try:
        resp = requests.post(
            "https://api.openai.com/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {cfg.openai_key}"},
            files={"file": (filename, io.BytesIO(audio_bytes), "audio/wav")},
            data={"model": model, "response_format": "verbose_json", "timestamp_granularities": "segment"},
            timeout=120,
        )
    except requests.RequestException as exc:
        return TranscribeResult(
            ok=False, captions=[], duration=0, provider="openai", model=model,
            http_status=503,
            error=ProviderError(
                status=503, reason="network_error", fallback_eligible=False,
                detail=f"Whisper network error: {type(exc).__name__}",
                error_type="network_error", error_code="network_error",
            ),
        )
    if resp.status_code != 200:
        diag = sanitize_whisper_error(resp.status_code, resp.text or "", resp.headers)
        reason = diag.get("error_reason") or f"http_{resp.status_code}"
        no_credit = reason in _NO_CREDIT
        return TranscribeResult(
            ok=False, captions=[], duration=0, provider="openai", model=model,
            http_status=resp.status_code,
            error=ProviderError(
                status=int(resp.status_code),
                reason=reason,
                fallback_eligible=False,
                detail=diag.get("detail") or f"Whisper API error: HTTP {resp.status_code}",
                error_type=diag.get("error_type"),
                error_code=diag.get("error_code"),
                retry_after=diag.get("retry_after"),
            ),
        )
    try:
        payload = resp.json()
    except ValueError:
        return TranscribeResult(
            ok=False, captions=[], duration=0, provider="openai", model=model,
            http_status=502,
            error=ProviderError(status=502, reason="bad_json", fallback_eligible=False,
                                detail="Whisper API error: HTTP 502 (bad_json)"),
        )
    captions = captions_from_whisper(payload if isinstance(payload, dict) else {})
    duration = 0.0
    try:
        duration = float((payload or {}).get("duration") or 0)
    except (TypeError, ValueError):
        duration = 0.0
    return TranscribeResult(
        ok=True, captions=captions, duration=duration, provider="openai", model=model,
        http_status=200,
    )
