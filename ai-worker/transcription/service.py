"""Single transcription interface. Config-driven primary + one fallback. No retry storms."""
from __future__ import annotations

import os
from typing import Callable, Dict, Optional

from .config import TranscriptionConfig, load_transcription_config
from .deepgram_nova import call_deepgram
from .openai_whisper import call_openai
from .types import ProviderError, TranscribeResult

ProviderFn = Callable[[bytes], TranscribeResult]


def default_providers(cfg: TranscriptionConfig) -> Dict[str, ProviderFn]:
    return {
        "deepgram": lambda audio: call_deepgram(audio, cfg),
        "openai": lambda audio: call_openai(audio, cfg),
    }


def transcribe_media(
    audio_bytes: bytes,
    media_duration_s: float = 0.0,
    cfg: Optional[TranscriptionConfig] = None,
    providers: Optional[Dict[str, ProviderFn]] = None,
    entitled: bool = True,
) -> TranscribeResult:
    cfg = cfg or load_transcription_config(os.environ, entitled=entitled)
    providers = providers or default_providers(cfg)
    order: list[str] = []
    if cfg.primary:
        order.append(cfg.primary)
    if cfg.fallback and cfg.fallback not in order:
        order.append(cfg.fallback)

    calls = {"deepgram": 0, "openai": 0}
    last_error: Optional[ProviderError] = None
    last_provider = order[0] if order else "none"
    last_model = ""
    fallback_used = False

    for i, name in enumerate(order):
        if name == "deepgram" and not cfg.deepgram_key:
            continue
        if name == "openai" and not cfg.openai_allowed:
            continue
        fn = providers.get(name)
        if fn is None:
            continue
        if calls.get(name, 0) >= cfg.max_calls_per_provider:
            continue
        if i > 0:
            fallback_used = True
        calls[name] = calls.get(name, 0) + 1
        result = fn(audio_bytes)
        result.fallback_used = fallback_used
        result.provider_calls = dict(calls)
        if result.duration in (None, 0):
            result.duration = media_duration_s
        last_provider = result.provider or name
        last_model = result.model
        if result.ok:
            return result
        last_error = result.error
        if not (result.error and result.error.fallback_eligible):
            return result

    return TranscribeResult(
        ok=False,
        captions=[],
        duration=media_duration_s,
        provider=last_provider,
        model=last_model,
        fallback_used=fallback_used,
        provider_calls=dict(calls),
        error=last_error or ProviderError(
            status=500, reason="no_provider", fallback_eligible=False,
            detail="Transcription provider unavailable",
        ),
    )
