"""
Unified Storage Module:
1. Supabase: PostgreSQL Database for structured Specimen records and Complaints.
2. Cloudflare R2: S3-compatible Object Storage for packaging label image files.
"""

import os
import json
import base64
import uuid
import re
import urllib.request
import urllib.error
from typing import List, Dict, Any, Optional
from app.config import Settings  # ensures .env is loaded

# Supabase settings
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://mwpgbtviumhzjwqvbvuo.supabase.co")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

# Cloudflare R2 settings
R2_ACCOUNT_ID = os.getenv("R2_ACCOUNT_ID", "")
R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID", "")
R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY", "")
R2_BUCKET_NAME = os.getenv("R2_BUCKET_NAME", "nutriscan-labels")
R2_PUBLIC_DOMAIN = os.getenv("R2_PUBLIC_DOMAIN", "").rstrip("/")

# Local file fallback
DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data"))
SPECIMENS_FILE = os.path.join(DATA_DIR, "specimens.json")

def _supabase_headers(use_service_key: bool = True) -> dict:
    key = SUPABASE_SERVICE_KEY if (use_service_key and SUPABASE_SERVICE_KEY) else SUPABASE_ANON_KEY
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }

def is_supabase_enabled() -> bool:
    return bool(SUPABASE_URL and (SUPABASE_ANON_KEY or SUPABASE_SERVICE_KEY))

def is_r2_enabled() -> bool:
    return bool(R2_ACCOUNT_ID and R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY and R2_BUCKET_NAME)

def get_r2_client():
    if not is_r2_enabled():
        return None
    try:
        import boto3
        from botocore.config import Config
        endpoint_url = f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
        return boto3.client(
            "s3",
            endpoint_url=endpoint_url,
            aws_access_key_id=R2_ACCESS_KEY_ID,
            aws_secret_access_key=R2_SECRET_ACCESS_KEY,
            config=Config(signature_version="s3v4"),
            region_name="auto"
        )
    except Exception as e:
        print(f"Error initializing R2 client: {e}")
        return None

def get_image_from_r2(object_key: str) -> Optional[tuple[bytes, str]]:
    """
    Downloads an object from Cloudflare R2 and returns (bytes, content_type).
    """
    client = get_r2_client()
    if not client:
        return None
    try:
        resp = client.get_object(Bucket=R2_BUCKET_NAME, Key=object_key)
        data = resp["Body"].read()
        content_type = resp.get("ContentType", "image/jpeg")
        return data, content_type
    except Exception as e:
        print(f"Error fetching {object_key} from R2: {e}")
        return None

async def upload_image_to_r2(file_bytes: bytes, filename: str, content_type: str = "image/jpeg") -> Optional[str]:
    """
    Uploads an image file to Cloudflare R2 and returns its permanent URL.
    """
    client = get_r2_client()
    if not client:
        return None

    try:
        ext = filename.split(".")[-1] if "." in filename else "jpg"
        clean_name = re.sub(r'[^a-zA-Z0-9_\.-]', '_', filename)
        object_key = f"specimens/{uuid.uuid4().hex[:12]}_{clean_name}"

        client.put_object(
            Bucket=R2_BUCKET_NAME,
            Key=object_key,
            Body=file_bytes,
            ContentType=content_type,
        )

        # 1. If custom domain is set (e.g. cdn.domain.com), use it directly
        if R2_PUBLIC_DOMAIN and not R2_PUBLIC_DOMAIN.endswith(".r2.dev"):
            return f"{R2_PUBLIC_DOMAIN}/{object_key}"

        # 2. Permanent non-expiring proxy route through our API
        # Any browser or frontend can load this URL forever!
        return f"/api/audit/images/{object_key}"
    except Exception as e:
        print(f"Cloudflare R2 upload error: {e}")
        return None

def get_specimens_from_db(limit: int = 10, offset: int = 0) -> List[Dict[str, Any]]:
    """
    Fetches specimens from Supabase in packets, with graceful fallback to local file.
    Supports limit & offset for high-performance packeted pagination.
    """
    if is_supabase_enabled():
        try:
            cols = "id,audit_id,product_name,product_category,compliance_score,grade,legal_status,status_text,created_at,image_url,panel_count,summary"
            url = f"{SUPABASE_URL}/rest/v1/specimens?select={cols}&order=created_at.desc&limit={limit}&offset={offset}"
            req = urllib.request.Request(url, headers=_supabase_headers(use_service_key=True))
            with urllib.request.urlopen(req, timeout=12) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                if isinstance(data, list):
                    return data
        except Exception as e:
            print(f"Supabase fetch error, falling back to local file: {e}")


    # Local fallback
    if os.path.exists(SPECIMENS_FILE):
        try:
            with open(SPECIMENS_FILE, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if content:
                    records = json.loads(content)
                    return records[offset : offset + limit]
        except Exception as e:
            print(f"Local file read error: {e}")
    return []

def insert_specimen_to_db(record: Dict[str, Any]) -> None:
    """
    Saves a specimen into Supabase, and updates local file as backup.
    """
    # 1. Save to Supabase
    if is_supabase_enabled():
        try:
            url = f"{SUPABASE_URL}/rest/v1/specimens"
            payload = json.dumps(record).encode("utf-8")
            req = urllib.request.Request(url, data=payload, headers=_supabase_headers(use_service_key=True), method="POST")
            with urllib.request.urlopen(req, timeout=8) as resp:
                pass
        except Exception as e:
            print(f"Supabase insert error: {e}")

    # 2. Also keep in local backup file
    try:
        os.makedirs(DATA_DIR, exist_ok=True)
        records = []
        if os.path.exists(SPECIMENS_FILE):
            with open(SPECIMENS_FILE, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if content:
                    records = json.loads(content)
        records = [record] + [r for r in records if r.get("id") != record.get("id")]
        with open(SPECIMENS_FILE, "w", encoding="utf-8") as f:
            json.dump(records[:100], f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Local file write error: {e}")

def delete_specimen_from_db(specimen_id: str) -> bool:
    """
    Deletes a specimen from Supabase and local file.
    """
    deleted = False
    if is_supabase_enabled():
        try:
            url = f"{SUPABASE_URL}/rest/v1/specimens?id=eq.{specimen_id}"
            req = urllib.request.Request(url, headers=_supabase_headers(use_service_key=True), method="DELETE")
            with urllib.request.urlopen(req, timeout=5) as resp:
                deleted = True
        except Exception as e:
            print(f"Supabase delete error: {e}")

    # Also delete from local file
    try:
        if os.path.exists(SPECIMENS_FILE):
            with open(SPECIMENS_FILE, "r", encoding="utf-8") as f:
                records = json.loads(f.read().strip() or "[]")
            filtered = [r for r in records if r.get("id") != specimen_id and r.get("audit_id") != specimen_id]
            with open(SPECIMENS_FILE, "w", encoding="utf-8") as f:
                json.dump(filtered, f, ensure_ascii=False, indent=2)
            deleted = True
    except Exception:
        pass

    return deleted
