"""YouTube Data API v3 resumable upload worker.

Downloads a completed Boom MP4 from a signed/public HTTPS URL (streamed, size-capped)
and uploads it with official resumable videos.insert. Tokens are received in the
authenticated worker request only and never written to disk or logs.
"""
from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from typing import Any, Dict, Optional, Tuple

UPLOAD_INIT = (
    "https://www.googleapis.com/upload/youtube/v3/videos"
    "?uploadType=resumable&part=snippet,status"
)
CHUNK = 8 * 1024 * 1024  # 8 MiB (multiple of 256 KiB)
DEFAULT_MAX_BYTES = 200 * 1024 * 1024


class YouTubeUploadError(Exception):
    def __init__(self, code: str, http_status: int = 502, detail: str = ""):
        super().__init__(detail or code)
        self.code = code
        self.http_status = http_status
        self.detail = detail or code


def _sanitize(raw: str) -> str:
    text = str(raw or "publish_failed")
    if "Bearer " in text:
        parts = text.split("Bearer ")
        text = parts[0] + "Bearer [redacted]" + ("" if len(parts) == 1 else "")
    return text.replace("access_token", "access_[redacted]")[:300]


def build_resumable_init(
    title: str,
    description: str,
    privacy: str,
    content_type: str = "video/mp4",
    content_length: Optional[int] = None,
) -> Dict[str, Any]:
    headers = {
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": content_type,
    }
    if content_length is not None:
        headers["X-Upload-Content-Length"] = str(content_length)
    return {
        "url": UPLOAD_INIT,
        "method": "POST",
        "headers": headers,
        "body": {
            "snippet": {
                "title": (title or "Boom Studio Short")[:100],
                "description": (description or "")[:5000],
                "categoryId": "22",
            },
            "status": {
                "privacyStatus": privacy,
                "selfDeclaredMadeForKids": False,
            },
        },
    }


def build_chunk_put(session_url: str, start: int, end: int, total: int) -> Dict[str, Any]:
    return {
        "url": session_url,
        "method": "PUT",
        "headers": {
            "Content-Type": "video/mp4",
            "Content-Range": f"bytes {start}-{end}/{total}",
        },
    }


def read_video_id(payload: Optional[Dict[str, Any]]) -> Optional[str]:
    if not payload:
        return None
    vid = payload.get("id")
    return vid if isinstance(vid, str) and vid else None


def _http_json(
    url: str,
    method: str,
    headers: Dict[str, str],
    body: Optional[bytes] = None,
    timeout: int = 120,
) -> Tuple[int, Dict[str, str], bytes]:
    req = urllib.request.Request(url, data=body, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, dict(resp.headers.items()), resp.read()
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers.items()) if e.headers else {}, e.read() or b""


def download_mp4(video_url: str, dest_path: str, max_bytes: int = DEFAULT_MAX_BYTES) -> int:
    if not video_url.lower().startswith("https://"):
        raise YouTubeUploadError("unsupported_media", 422, "HTTPS video URL required")
    req = urllib.request.Request(video_url, method="GET")
    written = 0
    with urllib.request.urlopen(req, timeout=120) as resp, open(dest_path, "wb") as out:
        while True:
            chunk = resp.read(1024 * 1024)
            if not chunk:
                break
            written += len(chunk)
            if written > max_bytes:
                raise YouTubeUploadError("media_too_large", 413, "Video exceeds upload cap")
            out.write(chunk)
    if written <= 0:
        raise YouTubeUploadError("unsupported_media", 422, "Empty video")
    return written


def resumable_upload(
    access_token: str,
    file_path: str,
    title: str,
    description: str,
    privacy: str,
) -> str:
    size = os.path.getsize(file_path)
    init = build_resumable_init(title, description, privacy, content_length=size)
    headers = dict(init["headers"])
    headers["Authorization"] = f"Bearer {access_token}"
    status, resp_headers, raw = _http_json(
        init["url"],
        init["method"],
        headers,
        json.dumps(init["body"]).encode("utf-8"),
        timeout=60,
    )
    if status not in (200, 201):
        if status == 401:
            raise YouTubeUploadError("token_expired", 401, "YouTube token expired")
        raise YouTubeUploadError("youtube_init_failed", 502, _sanitize(raw.decode("utf-8", "replace")))
    session_url = resp_headers.get("Location") or resp_headers.get("location")
    if not session_url:
        raise YouTubeUploadError("youtube_init_failed", 502, "Missing resumable session URL")

    offset = 0
    video_id = None
    with open(file_path, "rb") as fh:
        while offset < size:
            chunk = fh.read(CHUNK)
            if not chunk:
                break
            end = offset + len(chunk) - 1
            put = build_chunk_put(session_url, offset, end, size)
            put_headers = dict(put["headers"])
            put_headers["Authorization"] = f"Bearer {access_token}"
            put_headers["Content-Length"] = str(len(chunk))
            status, _h, raw = _http_json(put["url"], put["method"], put_headers, chunk, timeout=180)
            if status in (200, 201):
                payload = json.loads(raw.decode("utf-8") or "{}")
                video_id = read_video_id(payload)
                break
            if status not in (308,):
                if status == 401:
                    raise YouTubeUploadError("token_expired", 401, "YouTube token expired")
                raise YouTubeUploadError("youtube_upload_failed", 502, _sanitize(raw.decode("utf-8", "replace")))
            offset = end + 1
    if not video_id:
        raise YouTubeUploadError("youtube_upload_failed", 502, "Upload finished without video id")
    return video_id


def upload_from_url(
    video_url: str,
    access_token: str,
    title: str,
    description: str,
    privacy: str,
    workdir: str,
) -> Dict[str, Any]:
    dest = os.path.join(workdir, "source.mp4")
    download_mp4(video_url, dest)
    try:
        video_id = resumable_upload(access_token, dest, title, description, privacy)
        return {"video_id": video_id, "url": f"https://www.youtube.com/shorts/{video_id}"}
    finally:
        try:
            os.remove(dest)
        except OSError:
            pass
