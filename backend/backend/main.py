from fastapi import FastAPI, HTTPException, Depends, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.exc import OperationalError
from database import get_db
import requests
import base64
import hmac
import hashlib
import json
import random
import uuid
from pydantic import BaseModel
from starlette.requests import Request
from starlette.responses import Response
from fastapi.staticfiles import StaticFiles
# CORS ve ayarlar için gerekli import ###################
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import os, uuid, hashlib, shutil
from typing import List, Optional, Tuple
from fastapi.responses import JSONResponse

app = FastAPI()

# CORS middleware tanımı
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8084",             # local development
        "http://algoback.hackstack.com.tr",             # live frontend
        "https://algoback.hackstack.com.tr"            # ssl varsa
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
ALLOWED_CONTENT_TYPES = {"application/pdf"}
ALLOWED_EXTS = {".pdf"}
MAX_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", 20 * 1024 * 1024))
app.mount("/files", StaticFiles(directory=str(UPLOAD_DIR), html=False), name="files")

def _validate_file_meta(file: UploadFile):
    # Basit uzantı ve içerik türü kontrolü (tam güven için python-magic kullanabilirsin)
    ext = Path(file.filename or "").suffix.lower()
    if ALLOWED_EXTS and ext not in ALLOWED_EXTS:
        raise HTTPException(415, detail=f"İzin verilmeyen uzantı: {ext}")
    if ALLOWED_CONTENT_TYPES and file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(415, detail=f"İzin verilmeyen içerik türü: {file.content_type}")


async def _save_streaming(
    file: UploadFile,
    dest_dir: Path,
    max_bytes: int = MAX_BYTES,
    compute_sha256: bool = True
) -> Tuple[Path, int, Optional[str]]:
    """
    Dosyayı memory'e yüklemeden, parça parça diske kaydeder.
    max_bytes aşılırsa 413 döndürür.
    """
    dest_dir.mkdir(parents=True, exist_ok=True)

    # Güvenli bir dosya adı üret (UUID + orijinal uzantı)
    ext = Path(file.filename or "").suffix.lower()
    safe_name = f"{uuid.uuid4().hex}{ext}"
    dest_path = dest_dir / safe_name

    hasher = hashlib.sha256() if compute_sha256 else None
    total = 0
    chunk_size = 1024 * 1024  # 1 MB

    with dest_path.open("wb") as out:
        while True:
            chunk = await file.read(chunk_size)
            if not chunk:
                break
            total += len(chunk)
            if total > max_bytes:
                try:
                    dest_path.unlink(missing_ok=True)
                except Exception:
                    pass
                raise HTTPException(413, detail=f"Dosya {max_bytes} bayt limitini aşıyor")
            out.write(chunk)
            if hasher:
                hasher.update(chunk)

    await file.close()
    sha256 = hasher.hexdigest() if hasher else None
    return dest_path, total, sha256


async def _check_content_length(request: Request):
    """
    Content-Length başlığından kaba bir ön kontrol (isteğe bağlı).
    Gerçek limit kontrolü _save_streaming içinde de var.
    """
    cl = request.headers.get("content-length")
    if cl and cl.isdigit():
        if int(cl) > (MAX_BYTES * 2):  # çoklu dosya olabilir diye toleranslı bak
            raise HTTPException(413, detail="İstek gövdesi çok büyük")
    return True


@app.post("/upload")
async def upload_file(
    request_ok: bool = Depends(_check_content_length),
    file: UploadFile = File(..., description="Yüklenecek dosya"),
):
    """
    Tek dosya yükleme.
    - Form-Data: key 'file' ile dosya
    """
    _validate_file_meta(file)
    target_dir = UPLOAD_DIR  # alt klasör yok, direkt uploads/ içine yazacak
    saved_path, size, sha256 = await _save_streaming(file, target_dir)

    return JSONResponse({
        "ok": True,
        "original_filename": file.filename,
        "stored_filename": saved_path.name,
        "content_type": file.content_type,
        "size_bytes": size,
        "sha256": sha256,
        "relative_path": str(saved_path.relative_to(UPLOAD_DIR)),
        "public_url": f"/files/{saved_path.name}"
    })


@app.get("/")
def read_root():
    return {"message": "FastAPI + MySQL çalışıyor!"}

@app.get("/db-check")
def db_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "message": "Veritabanı bağlantısı başarılı"}
    except OperationalError as e:
        return {"status": "error", "message": f"Veritabanı bağlantı hatası: {str(e)}"}

# --- EK IMPORTLAR (ÇATIŞMA YOK) ---
from typing import List
from algosdk.v2client import algod
from algosdk import encoding, transaction
# EKLE
from base64 import b64decode
import time
from algosdk import encoding
from algosdk.abi import Method, ABIType
from algosdk.logic import get_application_address

# --- ALGOD CLIENT (ENV YOK) ---
ALGOD_URL = "https://testnet-api.algonode.cloud"
ALGOD_TOKEN = ""  # PureStake kullanırsan anahtarını ekle ve aşağıdaki header'ı değiştir
ALGOD_TOKEN_HEADER = "X-Algo-API-Token"  # PureStake için genelde "X-API-Key"

_algod_headers = {ALGOD_TOKEN_HEADER: ALGOD_TOKEN} if ALGOD_TOKEN else {}
algod_client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_URL, _algod_headers)

# ARC-4 method imzası (sözleşmene uygun)
M_CREATE = Method.from_signature("create_contract(byte[],address[])uint64")
M_SIGN = Method.from_signature("sign(byte[],address)uint64")
M_ISSIGN = Method.from_signature("issign(byte[])uint64")
M_ISCOMPLETE = Method.from_signature("iscomplete(byte[])uint64")
M_REJECT = Method.from_signature("reject(byte[],address)uint64")

# --- yardımcılar ---
def _hex_to_bytes(h: str) -> bytes:
    h = h[2:] if h.startswith("0x") else h
    return bytes.fromhex(h)

def _prefixed_box(prefix: bytes, data: bytes) -> bytes:
    return prefix + data

def _box_ref(app_id: int, name: bytes) -> transaction.BoxReference:
    return transaction.BoxReference(app_id, name)

app_id = 746531052


# --- İSTEK MODELLERİ ---
class CreateBuildRequest(BaseModel):
    sender: str
    file_hash_hex: str
    signers: List[str]

class SubmitRequest(BaseModel):
    signed_b64: List[str]

class SignBuildRequest(BaseModel):
    sender: str        # Txn.sender = imza atan adres
    file_hash_hex: str # 32B hash (hex string)

class IssignBuildRequest(BaseModel):
    sender: str        # kontrol edilecek adres
    file_hash_hex: str

class IsCompleteBuildRequest(BaseModel):
    sender: str         # AppCall'ı kimin gönderdiği (Txn.sender)
    file_hash_hex: str

class RejectBuildRequest(BaseModel):
    sender: str         # reddeden/çağıran imzacı (Txn.sender)
    file_hash_hex: str  # 32 bayt (64 hex)

# --- YENİ: create_contract için unsigned grup üret ---
@app.post("/blocksign/create/build")
def blocksign_build_create(req: CreateBuildRequest):
    """
    Gtxn[0]: Payment (>= 5 ALGO -> app address)
    Gtxn[1]: AppCall (create_contract) + boxes (inner ASA mint için fee yükseltilmiş)
    """
    try:
        # temel kontroller
        if len(req.file_hash_hex.replace("0x","")) != 64:
            raise ValueError("file_hash_hex 32 bayt (64 hex) olmalı")

        sp = algod_client.suggested_params()
        sp2 = algod_client.suggested_params()
        sp2.flat_fee = True
        sp2.fee = 2000  # inner itxn için gerekirse 3000 yap

        app_addr = get_application_address(app_id)

        # Gtxn[0] Payment
        pay = transaction.PaymentTxn(
            sender=req.sender,
            sp=sp,
            receiver=app_addr,
            amt=5_000_000  # 5 ALGO (microAlgo)
        )

        # ---- BOXES OLUŞTUR ----
        fh = _hex_to_bytes(req.file_hash_hex)              # 32B file hash
        sender_pk = encoding.decode_address(req.sender)    # 32B address bytes

        boxes = [
            _box_ref(app_id, _prefixed_box(b"asa_", fh)),
            _box_ref(app_id, _prefixed_box(b"adm_", fh)),
            _box_ref(app_id, _prefixed_box(b"sgn_", fh)),
            _box_ref(app_id, _prefixed_box(b"sgh_", fh)),
            _box_ref(app_id, _prefixed_box(b"del_", fh)),
            _box_ref(app_id, _prefixed_box(b"uhs_", sender_pk)),
        ]

        # ---- ABI ARG ENCODE (geriye-uyumlu) ----
        arg0 = ABIType.from_string("byte[]").encode(fh)             # file_hash
        arg1 = ABIType.from_string("address[]").encode(req.signers) # signers

        app_call = transaction.ApplicationCallTxn(
            sender=req.sender,
            sp=sp2,
            index=app_id,
            on_complete=transaction.OnComplete.NoOpOC,
            app_args=[ M_CREATE.get_selector(), arg0, arg1 ],
            boxes=boxes,
        )

        # Grup ID ata (sıra: 0=Payment, 1=AppCall)
        gid = transaction.calculate_group_id([pay, app_call])
        pay.group = gid
        app_call.group = gid

        unsigned_group_b64 = [
            encoding.msgpack_encode(pay),
            encoding.msgpack_encode(app_call),
        ]
        return {
            "unsigned_group_b64": unsigned_group_b64,
            "app_address": app_addr,
            "note": "Sıra korunmalı: [payment, appcall]. Lute ile bu sırayla imzala."
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"build_create error: {e}")

# --- YENİ: imzalı grup yayınla ---
@app.post("/tx/submit")
def blocksign_submit(req: SubmitRequest):
    try:
        if not req.signed_b64:
            raise ValueError("signed_b64 boş")

        raw_group = [encoding.base64.b64decode(b64) for b64 in req.signed_b64]
        txid = algod_client.send_raw_transaction(raw_group)
        return {"txid": txid}

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"submit error: {e}")

@app.post("/blocksign/sign/build")
def blocksign_build_sign(req: SignBuildRequest):
    """
    Tek AppCall: sign(file_hash, signer)
    """
    try:
        if len(req.file_hash_hex.replace("0x","")) != 64:
            raise ValueError("file_hash_hex 32 bayt (64 hex) olmalı")

        sp = algod_client.suggested_params()
        sp.flat_fee = True
        sp.fee = 1000

        fh = _hex_to_bytes(req.file_hash_hex)

        # Kutular (sözleşmen bu metodda sgn_, sgh_, del_, asa_ okuyor)
        boxes = [
            _box_ref(app_id, _prefixed_box(b"asa_", fh)),
            _box_ref(app_id, _prefixed_box(b"sgn_", fh)),
            _box_ref(app_id, _prefixed_box(b"sgh_", fh)),
            _box_ref(app_id, _prefixed_box(b"del_", fh)),
        ]

        # ABI argümanlarını encode et
        arg0 = ABIType.from_string("byte[]").encode(fh)
        arg1 = ABIType.from_string("address").encode(req.sender)

        app_call = transaction.ApplicationCallTxn(
            sender=req.sender,
            sp=sp,
            index=app_id,
            on_complete=transaction.OnComplete.NoOpOC,
            app_args=[ M_SIGN.get_selector(), arg0, arg1 ],
            boxes=boxes,
        )

        unsigned_b64 = encoding.msgpack_encode(app_call)
        return {"unsigned_b64": unsigned_b64, "note": "Tek AppCall. Bunu Lute ile imzala, sonra /tx/submit’e gönder."}

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"build_sign error: {e}")

@app.post("/blocksign/issign/build")
def blocksign_build_issign(req: IssignBuildRequest):
    """
    Tek AppCall: issign(file_hash)
    Txn.sender = kontrol edilecek adres olmalı.
    """
    try:
        fh = _hex_to_bytes(req.file_hash_hex)

        sp = algod_client.suggested_params()
        sp.flat_fee = True
        sp.fee = 1000

        # boxes: sadece sgh_ lazım
        boxes = [_box_ref(app_id, _prefixed_box(b"sgh_", fh))]

        arg0 = ABIType.from_string("byte[]").encode(fh)

        app_call = transaction.ApplicationCallTxn(
            sender=req.sender,
            sp=sp,
            index=app_id,
            on_complete=transaction.OnComplete.NoOpOC,
            app_args=[M_ISSIGN.get_selector(), arg0],
            boxes=boxes,
        )

        unsigned_b64 = encoding.msgpack_encode(app_call)
        return {"unsigned_b64": unsigned_b64, "note": "Tek AppCall. Lute ile imzala, /tx/submit sonrası returnValue=1/0."}

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"build_issign error: {e}")

@app.post("/blocksign/iscomplete/build")
def blocksign_build_iscomplete(req: IsCompleteBuildRequest):
    """
    Tek AppCall: iscomplete(file_hash)
    Boxes: sgn_, sgh_, del_
    """
    try:
        hx = req.file_hash_hex[2:] if req.file_hash_hex.startswith("0x") else req.file_hash_hex
        if len(hx) != 64:
            raise ValueError("file_hash_hex 32 bayt (64 hex) olmalı")

        fh = bytes.fromhex(hx)

        sp = algod_client.suggested_params()
        sp.flat_fee = True
        sp.fee = 1000  # sadece okuma, 1000 yeterli

        boxes = [
            _box_ref(app_id, _prefixed_box(b"sgn_", fh)),
            _box_ref(app_id, _prefixed_box(b"sgh_", fh)),
            _box_ref(app_id, _prefixed_box(b"del_", fh)),
        ]

        # ABI arg: byte[] (file_hash)
        arg0 = ABIType.from_string("byte[]").encode(fh)

        app_call = transaction.ApplicationCallTxn(
            sender=req.sender,
            sp=sp,
            index=app_id,
            on_complete=transaction.OnComplete.NoOpOC,
            app_args=[ M_ISCOMPLETE.get_selector(), arg0 ],
            boxes=boxes,
        )

        unsigned_b64 = encoding.msgpack_encode(app_call)
        return {
            "unsigned_b64": unsigned_b64,
            "note": "Tek AppCall. Bunu Lute ile imzala ve /tx/submit ile yayınla."
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"build_iscomplete error: {e}")

@app.post("/blocksign/reject/build")
def blocksign_build_reject(req: RejectBuildRequest):
    """
    Tek AppCall: reject(file_hash, signer)
    - Global.group_size == 1 şartını sağlar
    - Boxes: asa_, sgn_, sgh_, del_
    """
    try:
        hx = req.file_hash_hex[2:] if req.file_hash_hex.startswith("0x") else req.file_hash_hex
        if len(hx) != 64:
            raise ValueError("file_hash_hex 32 bayt (64 hex) olmalı")

        fh = bytes.fromhex(hx)

        sp = algod_client.suggested_params()
        sp.flat_fee = True
        sp.fee = 2000  # inner AssetConfig için; yetmezse 3000 yap

        boxes = [
            _box_ref(app_id, _prefixed_box(b"asa_", fh)),
            _box_ref(app_id, _prefixed_box(b"sgn_", fh)),
            _box_ref(app_id, _prefixed_box(b"sgh_", fh)),
            _box_ref(app_id, _prefixed_box(b"del_", fh)),
        ]

        # ABI argümanlarını encode et
        arg0 = ABIType.from_string("byte[]").encode(fh)        # file_hash
        arg1 = ABIType.from_string("address").encode(req.sender)  # signer

        app_call = transaction.ApplicationCallTxn(
            sender=req.sender,
            sp=sp,
            index=app_id,
            on_complete=transaction.OnComplete.NoOpOC,
            app_args=[ M_REJECT.get_selector(), arg0, arg1 ],
            boxes=boxes,
        )

        unsigned_b64 = encoding.msgpack_encode(app_call)
        return {
            "unsigned_b64": unsigned_b64,
            "note": "Tek AppCall. Lute ile imzala; ardından /tx/submit veya /tx/submit_and_decode_uint64 kullan."
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"build_reject error: {e}")
