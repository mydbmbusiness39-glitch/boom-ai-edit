"""Shared transcription types. No network."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional, TypedDict


class Caption(TypedDict):
    text: str
    start: float
    end: float


@dataclass
class ProviderError:
    status: int
    reason: str
    fallback_eligible: bool
    detail: str
    error_type: Optional[str] = None
    error_code: Optional[str] = None
    retry_after: Optional[int] = None


@dataclass
class TranscribeResult:
    ok: bool
    captions: list
    duration: float
    provider: str
    model: str
    fallback_used: bool = False
    provider_calls: dict = field(default_factory=lambda: {"deepgram": 0, "openai": 0})
    error: Optional[ProviderError] = None
    elapsed_ms: int = 0
    http_status: Optional[int] = None
