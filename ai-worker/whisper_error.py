"""Sanitized OpenAI Whisper non-200 diagnostics. No network, no retry, no secrets."""
from __future__ import annotations

import json
import re
from typing import Any, Mapping, Optional

_SECRET_RE = re.compile(
    r"(?i)(sk-[A-Za-z0-9_\-]{8,}|Bearer\s+\S+|org-[A-Za-z0-9]+|"
    r"proj_[A-Za-z0-9]+|key-[A-Za-z0-9_\-]{8,})"
)
_EMAIL_RE = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")
_ALLOWED_RATELIMIT_PREFIXES = ("x-ratelimit-limit-", "x-ratelimit-remaining-", "x-ratelimit-reset-")
_KNOWN_CODES = (
    "credit_balance_exhausted",
    "insufficient_quota",
    "organization_usage_limit_exceeded",
    "organization_spend_limit_exceeded",
    "project_spend_limit_exceeded",
    "rate_limit_exceeded",
)


def sanitize_text(value: Any, max_len: int = 180) -> str:
    if value is None:
        return ""
    text = str(value)
    text = _SECRET_RE.sub("[REDACTED]", text)
    text = _EMAIL_RE.sub("[REDACTED]", text)
    text = text.replace("\n", " ").strip()
    if len(text) > max_len:
        return text[:max_len]
    return text


def parse_retry_after(value: Any) -> Optional[int]:
    if value is None:
        return None
    raw = str(value).strip()
    if not raw:
        return None
    try:
        seconds = float(raw)
    except ValueError:
        return None
    if seconds < 0:
        return None
    return int(seconds)


def sanitize_header_map(headers: Optional[Mapping[str, Any]]) -> dict:
    out: dict[str, str] = {}
    if not headers:
        return out
    for key, raw in headers.items():
        name = str(key).lower()
        val = sanitize_text(raw, max_len=64)
        if name == "retry-after":
            out["retry-after"] = val
        elif any(name.startswith(p) for p in _ALLOWED_RATELIMIT_PREFIXES):
            out[name] = val
    return out


def _extract_error_fields(body_text: str) -> tuple[Optional[str], Optional[str], str]:
    err_type = None
    err_code = None
    message = ""
    if not body_text:
        return err_type, err_code, message
    try:
        parsed = json.loads(body_text)
    except (json.JSONDecodeError, TypeError, ValueError):
        return None, None, sanitize_text(body_text)
    err = parsed.get("error") if isinstance(parsed, dict) else None
    if isinstance(err, dict):
        err_type = err.get("type")
        err_code = err.get("code")
        message = err.get("message") or ""
    elif isinstance(parsed, dict):
        err_type = parsed.get("type")
        err_code = parsed.get("code")
        message = parsed.get("message") or ""
    if err_type is not None:
        err_type = sanitize_text(err_type, max_len=80) or None
    if err_code is not None:
        err_code = sanitize_text(err_code, max_len=80) or None
    return err_type, err_code, sanitize_text(message)


def classify_whisper_reason(
    status: int,
    err_type: Optional[str],
    err_code: Optional[str],
    message: Optional[str],
) -> str:
    code = (err_code or "").strip().lower()
    typ = (err_type or "").strip().lower()
    msg = (message or "").lower()
    for known in _KNOWN_CODES:
        if code == known and known != "rate_limit_exceeded":
            return known
        if typ == known and known != "rate_limit_exceeded":
            return known
    if "credit_balance_exhausted" in msg:
        return "credit_balance_exhausted"
    if code == "rate_limit_exceeded" or typ == "rate_limit_exceeded":
        if "tokens per min" in msg or " tpm" in f" {msg}" or "token rate" in msg:
            return "token_rate_limit"
        if "requests per min" in msg or " rpm" in f" {msg}" or "request rate" in msg:
            return "request_rate_limit"
        return "rate_limit_exceeded"
    if typ == "insufficient_quota" or "exceeded your current quota" in msg:
        return "insufficient_quota"
    if status == 429:
        return "provider_capacity_or_unknown"
    return f"http_{status}"


def _request_id(headers: Optional[Mapping[str, Any]]) -> Optional[str]:
    if not headers:
        return None
    lowered = {str(k).lower(): v for k, v in headers.items()}
    for name in ("x-request-id", "openai-request-id", "x-openai-request-id"):
        if name in lowered and lowered[name]:
            return sanitize_text(lowered[name], max_len=80) or None
    return None


def sanitize_whisper_error(
    status: int,
    body_text: str,
    headers: Optional[Mapping[str, Any]],
    elapsed_ms: int = 0,
    media_duration_s: float = 0.0,
) -> dict:
    err_type, err_code, message = _extract_error_fields(body_text or "")
    reason = classify_whisper_reason(status, err_type, err_code, message)
    ratelimit = sanitize_header_map(headers)
    retry_after = parse_retry_after(ratelimit.get("retry-after"))
    request_id = _request_id(headers)
    detail = f"Whisper API error: HTTP {status} ({reason})"
    return {
        "event": "transcribe",
        "provider": "openai",
        "model": "whisper-1",
        "whisper_called": True,
        "retry": False,
        "whisper_http_status": int(status),
        "error_type": err_type,
        "error_code": err_code,
        "error_reason": reason,
        "error_message": message,
        "retry_after": retry_after,
        "ratelimit": ratelimit,
        "request_id": request_id,
        "elapsed_ms": int(elapsed_ms),
        "media_duration_s": media_duration_s,
        "detail": detail,
    }
