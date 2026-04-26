#!/usr/bin/env python3
"""
Pushes the freshly-built APK's SHA-256, size and version into the
admin_site_settings.app_download row in Lovable Cloud (Supabase REST).

Reads everything it needs from environment variables set by the workflow:
  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SHA256, SIZE_MB, VERSION, APK_URL
"""
import datetime
import json
import os
import sys
import urllib.request

SUPABASE_URL = os.environ["SUPABASE_URL"]
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
HEADERS = {
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
    "Content-Type": "application/json",
}


def get_existing():
    url = f"{SUPABASE_URL}/rest/v1/admin_site_settings?id=eq.app_download&select=value"
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=15) as resp:
        rows = json.loads(resp.read().decode("utf-8"))
    return (rows[0]["value"] if rows else {}) or {}


def main() -> int:
    prev = get_existing()
    prev["version"] = os.environ["VERSION"]
    prev["sha256"] = os.environ["SHA256"]
    prev["size_mb"] = float(os.environ["SIZE_MB"])
    apk_url = os.environ.get("APK_URL", "").strip()
    if apk_url:
        prev["android_apk_url"] = apk_url
    prev.setdefault("enabled", True)

    payload = json.dumps({
        "id": "app_download",
        "value": prev,
        "updated_at": datetime.datetime.utcnow().isoformat() + "Z",
    }).encode("utf-8")

    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/admin_site_settings",
        data=payload,
        headers={**HEADERS, "Prefer": "resolution=merge-duplicates"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        resp.read()

    print(f"✅ Pushed v{prev['version']} ({prev['sha256']}) to admin_site_settings.app_download")
    return 0


if __name__ == "__main__":
    sys.exit(main())
