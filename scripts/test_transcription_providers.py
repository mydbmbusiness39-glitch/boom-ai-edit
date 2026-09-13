#!/usr/bin/env python3
"""Transcription provider abstraction. No live Deepgram / OpenAI / Whisper calls."""
from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "ai-worker"))

from transcription.config import TranscriptionConfig, load_transcription_config  # noqa: E402
from transcription.deepgram_nova import captions_from_deepgram  # noqa: E402
from transcription.openai_whisper import captions_from_whisper  # noqa: E402
from transcription.service import (  # noqa: E402
    ProviderError,
    TranscribeResult,
    transcribe_media,
)
from transcription.types import Caption  # noqa: E402


def _cfg(**kwargs):
    base = dict(
        primary="deepgram",
        fallback="openai",
        deepgram_key="dg-test",
        openai_key="sk-test",
        openai_allowed=True,
        deepgram_model="nova-3",
    )
    base.update(kwargs)
    return TranscriptionConfig(**base)


class ConfigTests(unittest.TestCase):
    def test_defaults_deepgram_then_openai(self):
        cfg = load_transcription_config(
            {
                "TRANSCRIPTION_PROVIDER": "",
                "TRANSCRIPTION_FALLBACK": "",
                "DEEPGRAM_API_KEY": "x",
                "OPENAI_API_KEY": "y",
                "ALLOW_PAID_CALLS": "FALSE",
            },
            entitled=True,
        )
        self.assertEqual(cfg.primary, "deepgram")
        self.assertEqual(cfg.fallback, "openai")
        self.assertTrue(cfg.openai_allowed)

    def test_free_not_openai_allowed_without_global(self):
        cfg = load_transcription_config(
            {"DEEPGRAM_API_KEY": "x", "OPENAI_API_KEY": "y", "ALLOW_PAID_CALLS": "FALSE"},
            entitled=False,
        )
        self.assertFalse(cfg.openai_allowed)


class CaptionNormalizeTests(unittest.TestCase):
    def test_deepgram_utterances_mov_shape(self):
        payload = {
            "results": {
                "utterances": [
                    {"transcript": "hello from mov", "start": 0.12, "end": 1.44},
                    {"transcript": "second line", "start": 1.5, "end": 2.8},
                ]
            }
        }
        caps = captions_from_deepgram(payload)
        self.assertEqual(caps[0], {"text": "hello from mov", "start": 0.12, "end": 1.44})
        self.assertEqual(caps[1]["end"], 2.8)
        self.assertTrue(all("text" in c and "start" in c and "end" in c for c in caps))

    def test_deepgram_sentences_mp4_shape(self):
        payload = {
            "results": {
                "channels": [{
                    "alternatives": [{
                        "transcript": "hello from mp4",
                        "paragraphs": {
                            "paragraphs": [{
                                "sentences": [
                                    {"text": "hello from mp4", "start": 0.5, "end": 2.0},
                                ]
                            }]
                        },
                    }]
                }]
            }
        }
        caps = captions_from_deepgram(payload)
        self.assertEqual(caps, [{"text": "hello from mp4", "start": 0.5, "end": 2.0}])

    def test_deepgram_drops_empty_and_zero_span(self):
        payload = {
            "results": {
                "utterances": [
                    {"transcript": "  ", "start": 0, "end": 1},
                    {"transcript": "ok", "start": 1.0, "end": 1.0},
                    {"transcript": "kept", "start": 1.2, "end": 2.0},
                ]
            }
        }
        caps = captions_from_deepgram(payload)
        self.assertEqual(caps, [{"text": "kept", "start": 1.2, "end": 2.0}])

    def test_deepgram_empty_is_not_fabricated(self):
        self.assertEqual(captions_from_deepgram({"results": {"utterances": []}}), [])
        self.assertEqual(captions_from_deepgram({}), [])

    def test_whisper_segments_unchanged(self):
        payload = {"segments": [{"text": " hello ", "start": 0.1, "end": 1.4}], "duration": 12.7}
        caps = captions_from_whisper(payload)
        self.assertEqual(caps, [{"text": "hello", "start": 0.1, "end": 1.4}])


class FallbackPolicyTests(unittest.TestCase):
    def test_deepgram_success_no_openai_call(self):
        calls = []

        def deepgram(_audio):
            calls.append("deepgram")
            return TranscribeResult(ok=True, captions=[{"text": "dg", "start": 0.1, "end": 1.0}], duration=1.0, provider="deepgram", model="nova-3")

        def openai(_audio):
            calls.append("openai")
            raise AssertionError("openai must not be called")

        result = transcribe_media(
            b"wav", media_duration_s=1.0, cfg=_cfg(),
            providers={"deepgram": deepgram, "openai": openai},
        )
        self.assertTrue(result.ok)
        self.assertEqual(result.captions[0]["text"], "dg")
        self.assertFalse(result.fallback_used)
        self.assertEqual(calls, ["deepgram"])
        self.assertEqual(result.provider_calls, {"deepgram": 1, "openai": 0})

    def test_deepgram_temporary_failure_falls_back_once(self):
        calls = []

        def deepgram(_audio):
            calls.append("deepgram")
            return TranscribeResult(
                ok=False, captions=[], duration=1.0, provider="deepgram", model="nova-3",
                error=ProviderError(status=503, reason="http_503", fallback_eligible=True, detail="Deepgram HTTP 503"),
            )

        def openai(_audio):
            calls.append("openai")
            return TranscribeResult(ok=True, captions=[{"text": "wh", "start": 0.2, "end": 0.9}], duration=1.0, provider="openai", model="whisper-1")

        result = transcribe_media(b"wav", 1.0, _cfg(), {"deepgram": deepgram, "openai": openai})
        self.assertTrue(result.ok)
        self.assertTrue(result.fallback_used)
        self.assertEqual(calls, ["deepgram", "openai"])
        self.assertEqual(result.provider_calls, {"deepgram": 1, "openai": 1})

    def test_no_retry_storm_same_provider(self):
        n = {"deepgram": 0}

        def deepgram(_audio):
            n["deepgram"] += 1
            return TranscribeResult(
                ok=False, captions=[], duration=1.0, provider="deepgram", model="nova-3",
                error=ProviderError(status=500, reason="http_500", fallback_eligible=True, detail="boom"),
            )

        def openai(_audio):
            return TranscribeResult(
                ok=False, captions=[], duration=1.0, provider="openai", model="whisper-1",
                error=ProviderError(status=429, reason="insufficient_quota", fallback_eligible=False, detail="no credit"),
            )

        result = transcribe_media(b"wav", 1.0, _cfg(), {"deepgram": deepgram, "openai": openai})
        self.assertFalse(result.ok)
        self.assertEqual(n["deepgram"], 1)
        self.assertEqual(result.provider_calls["deepgram"], 1)
        self.assertEqual(result.provider_calls["openai"], 1)

    def test_openai_no_credit_does_not_loop(self):
        def deepgram(_audio):
            return TranscribeResult(
                ok=False, captions=[], duration=1.0, provider="deepgram", model="nova-3",
                error=ProviderError(status=503, reason="http_503", fallback_eligible=True, detail="tmp"),
            )

        openai_n = {"n": 0}

        def openai(_audio):
            openai_n["n"] += 1
            return TranscribeResult(
                ok=False, captions=[], duration=1.0, provider="openai", model="whisper-1",
                error=ProviderError(
                    status=429, reason="insufficient_quota", fallback_eligible=False,
                    detail="Whisper API error: HTTP 429 (insufficient_quota)",
                    error_type="insufficient_quota", error_code="insufficient_quota",
                ),
            )

        result = transcribe_media(b"wav", 1.0, _cfg(), {"deepgram": deepgram, "openai": openai})
        self.assertFalse(result.ok)
        self.assertEqual(openai_n["n"], 1)
        self.assertEqual(result.error.reason, "insufficient_quota")
        self.assertTrue(result.fallback_used)

    def test_openai_not_allowed_skips_fallback(self):
        def deepgram(_audio):
            return TranscribeResult(
                ok=False, captions=[], duration=1.0, provider="deepgram", model="nova-3",
                error=ProviderError(status=503, reason="http_503", fallback_eligible=True, detail="tmp"),
            )

        def openai(_audio):
            raise AssertionError("openai blocked")

        result = transcribe_media(b"wav", 1.0, _cfg(openai_allowed=False), {"deepgram": deepgram, "openai": openai})
        self.assertFalse(result.ok)
        self.assertFalse(result.fallback_used)
        self.assertEqual(result.provider_calls["openai"], 0)

    def test_missing_deepgram_key_skips_without_call(self):
        called = []

        def deepgram(_audio):
            called.append("deepgram")
            raise AssertionError("no key")

        def openai(_audio):
            called.append("openai")
            return TranscribeResult(ok=True, captions=[{"text": "wh", "start": 0, "end": 1}], duration=1, provider="openai", model="whisper-1")

        result = transcribe_media(b"wav", 1.0, _cfg(deepgram_key=""), {"deepgram": deepgram, "openai": openai})
        self.assertTrue(result.ok)
        self.assertNotIn("deepgram", called)
        self.assertEqual(called, ["openai"])
        self.assertTrue(result.fallback_used)

    def test_max_one_call_per_provider(self):
        cfg = _cfg()
        self.assertEqual(cfg.max_calls_per_provider, 1)


class SourceContractTests(unittest.TestCase):
    def test_interface_exported(self):
        from transcription import transcribe_media as exported
        self.assertTrue(callable(exported))

    def test_whisper_url_once(self):
        src = (ROOT / "ai-worker" / "transcription" / "openai_whisper.py").read_text()
        self.assertEqual(src.count("api.openai.com/v1/audio/transcriptions"), 1)
        self.assertIn("whisper-1", src)
        self.assertIn("sanitize_whisper_error", src)

    def test_deepgram_official_listen(self):
        src = (ROOT / "ai-worker" / "transcription" / "deepgram_nova.py").read_text()
        self.assertIn("api.deepgram.com/v1/listen", src)
        self.assertIn("Authorization", src)
        self.assertIn("Token ", src)
        self.assertIn("utterances=true", src)
        self.assertNotIn("sk-", src)

    def test_main_uses_transcribe_media(self):
        main = (ROOT / "ai-worker" / "main.py").read_text()
        self.assertIn("from transcription import transcribe_media", main)
        self.assertIn("transcribe_media(", main)
        self.assertIn('os.getenv("ALLOW_PAID_CALLS", "FALSE")', main)
        self.assertNotIn('ALLOW_PAID_CALLS", "TRUE"', main)
        self.assertIn("x_boom_paid_transcription", main)
        self.assertIn('status_code=422, detail="Source has no usable audio"', main)
        self.assertIn('"reason": "silent_source"', main)
        self.assertIn("fallback_used", main)
        self.assertEqual(main.count("api.openai.com/v1/audio/transcriptions"), 0)

    def test_no_hardcoded_deepgram_secret(self):
        for rel in [
            "ai-worker/transcription/deepgram_nova.py",
            "ai-worker/transcription/service.py",
            "ai-worker/main.py",
        ]:
            text = (ROOT / rel).read_text()
            self.assertNotIn("DEEPGRAM_API_KEY = \"", text)
            self.assertNotRegex(text, r"Token [A-Za-z0-9]{20,}")


if __name__ == "__main__":
    unittest.main(verbosity=2)
