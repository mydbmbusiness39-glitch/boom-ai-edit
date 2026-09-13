"""Config-driven transcription provider selection. No network."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping


@dataclass
class TranscriptionConfig:
    primary: str = "deepgram"
    fallback: str = "openai"
    deepgram_key: str = ""
    openai_key: str = ""
    openai_allowed: bool = False
    deepgram_model: str = "nova-3"
    max_calls_per_provider: int = 1


def load_transcription_config(env: Mapping[str, str], entitled: bool = False) -> TranscriptionConfig:
    primary = (env.get("TRANSCRIPTION_PROVIDER") or "deepgram").strip().lower() or "deepgram"
    fallback = (env.get("TRANSCRIPTION_FALLBACK") or "openai").strip().lower() or "openai"
    if fallback == primary:
        fallback = ""
    globally = (env.get("ALLOW_PAID_CALLS") or "FALSE").strip().upper() == "TRUE"
    openai_key = (env.get("OPENAI_API_KEY") or "").strip()
    return TranscriptionConfig(
        primary=primary,
        fallback=fallback,
        deepgram_key=(env.get("DEEPGRAM_API_KEY") or "").strip(),
        openai_key=openai_key,
        openai_allowed=bool(openai_key) and (entitled or globally),
        deepgram_model=(env.get("DEEPGRAM_MODEL") or "nova-3").strip() or "nova-3",
        max_calls_per_provider=1,
    )
