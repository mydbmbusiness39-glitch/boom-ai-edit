#!/usr/bin/env python3
"""Simulated Whisper non-200 diagnostics. No live OpenAI / Whisper call."""
from __future__ import annotations

import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "ai-worker"))

from whisper_error import (  # noqa: E402
    classify_whisper_reason,
    parse_retry_after,
    sanitize_header_map,
    sanitize_text,
    sanitize_whisper_error,
)


class SanitizeTextTests(unittest.TestCase):
    def test_redacts_api_key(self):
        out = sanitize_text("key sk-proj-ABCDEFG1234567890 used")
        self.assertNotIn("sk-proj-", out)
        self.assertIn("[REDACTED]", out)

    def test_redacts_bearer(self):
        out = sanitize_text("Authorization: Bearer tok_live_secretvalue")
        self.assertNotIn("tok_live_secretvalue", out)
        self.assertIn("[REDACTED]", out)

    def test_truncates(self):
        out = sanitize_text("x" * 500, max_len=40)
        self.assertEqual(len(out), 40)


class ClassifyTests(unittest.TestCase):
    def test_insufficient_quota(self):
        self.assertEqual(
            classify_whisper_reason(
                429, "insufficient_quota", "insufficient_quota",
                "You exceeded your current quota, please check your plan and billing details.",
            ),
            "insufficient_quota",
        )

    def test_credit_balance_exhausted(self):
        self.assertEqual(
            classify_whisper_reason(
                429, "insufficient_quota", "credit_balance_exhausted",
                "Credit balance is exhausted.",
            ),
            "credit_balance_exhausted",
        )

    def test_org_usage_limit(self):
        self.assertEqual(
            classify_whisper_reason(
                429, None, "organization_usage_limit_exceeded", "org usage limit",
            ),
            "organization_usage_limit_exceeded",
        )

    def test_org_spend_limit(self):
        self.assertEqual(
            classify_whisper_reason(
                429, None, "organization_spend_limit_exceeded", "",
            ),
            "organization_spend_limit_exceeded",
        )

    def test_project_spend_limit(self):
        self.assertEqual(
            classify_whisper_reason(
                429, None, "project_spend_limit_exceeded", "",
            ),
            "project_spend_limit_exceeded",
        )

    def test_request_rate_limit(self):
        self.assertEqual(
            classify_whisper_reason(
                429, "tokens", "rate_limit_exceeded",
                "Rate limit reached for whisper-1: 50 requests per min (RPM).",
            ),
            "request_rate_limit",
        )

    def test_token_rate_limit(self):
        self.assertEqual(
            classify_whisper_reason(
                429, "tokens", "rate_limit_exceeded",
                "Rate limit reached for tokens per min (TPM).",
            ),
            "token_rate_limit",
        )

    def test_generic_rate_limit(self):
        self.assertEqual(
            classify_whisper_reason(429, "rate_limit_exceeded", "rate_limit_exceeded", ""),
            "rate_limit_exceeded",
        )

    def test_429_unknown_is_capacity_or_unknown(self):
        self.assertEqual(
            classify_whisper_reason(429, None, None, None),
            "provider_capacity_or_unknown",
        )


class RetryAfterTests(unittest.TestCase):
    def test_integer_seconds(self):
        self.assertEqual(parse_retry_after("20"), 20)

    def test_float_seconds(self):
        self.assertEqual(parse_retry_after("1.9"), 1)

    def test_invalid(self):
        self.assertIsNone(parse_retry_after("Mon, 01 Jan 2026 00:00:00 GMT"))
        self.assertIsNone(parse_retry_after(""))
        self.assertIsNone(parse_retry_after(None))


class HeaderSanitizeTests(unittest.TestCase):
    def test_keeps_ratelimit_only(self):
        got = sanitize_header_map({
            "Retry-After": "20",
            "x-ratelimit-limit-requests": "50",
            "x-ratelimit-remaining-requests": "0",
            "x-ratelimit-reset-requests": "12",
            "x-ratelimit-limit-tokens": "10000",
            "x-ratelimit-remaining-tokens": "0",
            "x-ratelimit-reset-tokens": "8",
            "Authorization": "Bearer sk-secret",
            "Set-Cookie": "session=abc",
            "x-request-id": "req_abc123",
        })
        self.assertEqual(got["retry-after"], "20")
        self.assertEqual(got["x-ratelimit-limit-requests"], "50")
        self.assertEqual(got["x-ratelimit-remaining-requests"], "0")
        self.assertEqual(got["x-ratelimit-reset-requests"], "12")
        self.assertEqual(got["x-ratelimit-limit-tokens"], "10000")
        self.assertNotIn("authorization", got)
        self.assertNotIn("set-cookie", got)
        self.assertNotIn("x-request-id", got)


class EndToEndSanitizeTests(unittest.TestCase):
    def test_insufficient_quota_payload(self):
        body = json.dumps({
            "error": {
                "message": "You exceeded your current quota, please check your plan and billing details. sk-proj-LEAK",
                "type": "insufficient_quota",
                "param": None,
                "code": "insufficient_quota",
            }
        })
        diag = sanitize_whisper_error(
            429, body,
            {"Retry-After": "0", "x-request-id": "req_quota_1", "Authorization": "Bearer sk-LEAK"},
            elapsed_ms=2299,
            media_duration_s=12.73,
        )
        self.assertEqual(diag["whisper_http_status"], 429)
        self.assertEqual(diag["error_type"], "insufficient_quota")
        self.assertEqual(diag["error_code"], "insufficient_quota")
        self.assertEqual(diag["error_reason"], "insufficient_quota")
        self.assertEqual(diag["model"], "whisper-1")
        self.assertEqual(diag["provider"], "openai")
        self.assertIs(diag["retry"], False)
        self.assertEqual(diag["elapsed_ms"], 2299)
        self.assertEqual(diag["request_id"], "req_quota_1")
        self.assertNotIn("sk-proj-LEAK", json.dumps(diag))
        self.assertNotIn("sk-LEAK", json.dumps(diag))
        self.assertNotIn("Bearer", json.dumps(diag))
        self.assertIn("[REDACTED]", diag["error_message"])
        self.assertTrue(diag["detail"].startswith("Whisper API error: HTTP 429"))
        self.assertIn("insufficient_quota", diag["detail"])

    def test_rate_limit_payload(self):
        body = json.dumps({
            "error": {
                "message": "Rate limit reached for whisper-1 in organization org-XXXX: 50 requests per min. Please try again in 20s.",
                "type": "tokens",
                "code": "rate_limit_exceeded",
            }
        })
        diag = sanitize_whisper_error(
            429, body,
            {
                "retry-after": "20",
                "x-ratelimit-limit-requests": "50",
                "x-ratelimit-remaining-requests": "0",
                "x-ratelimit-reset-requests": "20",
                "x-request-id": "req_rpm_1",
            },
            elapsed_ms=400,
        )
        self.assertEqual(diag["error_reason"], "request_rate_limit")
        self.assertEqual(diag["error_code"], "rate_limit_exceeded")
        self.assertEqual(diag["retry_after"], 20)
        self.assertEqual(diag["ratelimit"]["x-ratelimit-limit-requests"], "50")
        self.assertEqual(diag["ratelimit"]["x-ratelimit-remaining-requests"], "0")
        self.assertEqual(diag["retry"], False)
        self.assertNotIn("org-XXXX", json.dumps(diag))

    def test_no_retry_flag(self):
        diag = sanitize_whisper_error(503, "{}", {}, elapsed_ms=1)
        self.assertIs(diag["retry"], False)
        self.assertEqual(diag["whisper_http_status"], 503)


class SourceContractTests(unittest.TestCase):
    def test_worker_uses_helper_once_no_retry(self):
        main = (ROOT / "ai-worker" / "main.py").read_text()
        self.assertIn("from whisper_error import sanitize_whisper_error", main)
        self.assertIn("sanitize_whisper_error(", main)
        self.assertEqual(main.count("api.openai.com/v1/audio/transcriptions"), 1)
        self.assertIn('"retry": False', main)
        self.assertNotIn("whisper_resp = requests.post", main.split("if whisper_resp.status_code != 200:")[1].split("wdata = whisper_resp.json()")[0])
        self.assertIn("ALLOW_PAID_CALLS", main)
        self.assertNotIn('ALLOW_PAID_CALLS", "TRUE"', main)

    def test_helper_file_has_no_network(self):
        src = (ROOT / "ai-worker" / "whisper_error.py").read_text()
        self.assertNotIn("requests.", src)
        self.assertNotIn("openai.com", src)
        self.assertNotIn("http://", src)
        self.assertNotIn("https://", src)


if __name__ == "__main__":
    unittest.main(verbosity=2)
