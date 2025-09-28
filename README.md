# BlockSign

> **Özet (Project Summary)**  
> BlockSign, bir dosyanın SHA-256 özetine (file hash) karşı **imza süreci** yürüten ve süreç sonunda o dosyayı **tekil bir Algorand NFT’si (ASA, total=1)** ile zincir üzerinde ilişkilendiren uçtan-uca bir örnektir.  
> Mimari üç parçadan oluşur:
> - **Akıllı sözleşme (Algopy/ARC-4)**: `create_contract` ile NFT mint eder, **imzacılar** ve **imzalananlar** listelerini **Box Storage** üzerinde tutar; `sign`, `issign`, `iscomplete`, `reject` vb. metodlarla akışı yönetir.
> - **Backend (FastAPI + py-algorand-sdk)**: Frontend’in isteğiyle **imzasız (unsigned)** işlemleri hazırlar (Payment + AppCall / tek AppCall), kullanıcı Lute ile imzalar; backend imzalı ham işlemleri ağa **publish** eder.
> - **Frontend (React/Next + Lute Wallet)**: Kullanıcı cüzdanını bağlar, işlemleri **Lute** üzerinden imzalar ve backend’e gönderir; imza durumlarını görüntüler.

---

## İçindekiler
- [Mimari](#mimari)
- [Teknolojiler](#teknolojiler)
- [Klasör Yapısı](#klasör-yapısı)
- [Akıllı Sözleşme (Algopy/ARC-4)](#akıllı-sözleşme-algopyarc-4)
  - [Metodlar & Kurallar](#metodlar--kurallar)
  - [Box Storage Şeması](#box-storage-şeması)
- [Backend (FastAPI)](#backend-fastapi)
  - [Kurulum & Çalıştırma](#kurulum--çalıştırma)
  - [API Uçları](#api-uçları)
- [Frontend (React/Next + Lute)](#frontend-reactnext--lute)
  - [Cüzdan Bağlama & create_contract Akışı](#cüzdan-bağlama--create_contract-akışı)
- [Uçtan Uca Akış](#uçtan-uca-akış)
- [Hata Giderme](#hata-giderme)
- [Güvenlik Notları](#güvenlik-notları)
- [Lisans](#lisans)

---

## Mimari

```
Frontend (React/Next + lute-connect)
   └──> Backend (FastAPI)
         ├─ /blocksign/create/build      (unsigned Payment + AppCall)
         ├─ /blocksign/sign/build        (unsigned AppCall)
         ├─ /blocksign/iscomplete/build  (unsigned AppCall)
         ├─ /blocksign/reject/build      (unsigned AppCall)
         ├─ /blocksign/issign/boxread    (ücretsiz box read)
         └─ /tx/submit / /tx/submit_and_decode_uint64
                   └──> Algorand Node (TestNet/MainNet)
                              └──> Smart Contract (Algopy ARC-4)
```

---

## Teknolojiler
- **Algorand**: ARC-4 ABI, ASA (NFT), Box Storage  
- **Akıllı sözleşme**: Algopy (ARC4Contract)  
- **Backend**: FastAPI, `py-algorand-sdk`  
- **Frontend**: React/Next.js, `lute-connect` (Algorand cüzdanı)

---

## Klasör Yapısı
```
BlockSign/
├─ backend/                  # FastAPI servisi (unsigned tx build + submit)
├─ blockchain/
│  └─ blocksign/             # Algopy ARC-4 sözleşme kaynakları
└─ frontend/                 # React/Next + lute-connect istemcisi
```

> Not: Dosya/klasör adları projede kullandıklarınla birebir eşleşecek şekilde düzenlenebilir.

---

## Akıllı Sözleşme (Algopy/ARC-4)

### Metodlar & Kurallar
- **`create_contract(file_hash: byte[], signers: address[]) -> uint64`**
  - **Group şartı**: `Global.group_size == 2`
  - **Gtxn[0]**: Payment → **app address**, **amount ≥ 5 ALGO**, `sender == Txn.sender`, `rekey_to == zero`, `close_remainder_to == zero`
  - **Gtxn[1]**: AppCall (bu method)
  - İçeride **inner `AssetConfig`** ile **1 adetlik NFT (ASA)** mint edilir (`manager = app address`)
  - `file_hash` ⟶ `asset_id` ve `admin` eşleşmesi, `signers` ve `signed` blob’ları **Box**’a yazılır
  - Dönüş: `asset_id`
- **`cancel(file_hash: byte[]) -> uint64`**
  - Sadece `Global.creator_address` çağırabilir; ASA silmeyi dener, kaydı iptal eder.
- **`sign(file_hash: byte[], signer: address) -> uint64`**
  - **Group şartı**: `Global.group_size == 1`
  - `signer` **listede olmalı** ve `Txn.sender == signer`
  - İmza idempotent biçimde `sgh_` blob’una eklenir
- **`issign(file_hash: byte[]) -> uint64`**
  - `Txn.sender` bu hash’i imzalamışsa `1`, değilse `0`
- **`iscomplete(file_hash: byte[]) -> uint64`**
  - Tüm **yetkili imzacılar** imza attıysa `1` (iptal edilmişse `0`)
- **`reject(file_hash: byte[], signer: address) -> uint64`**
  - `signer` yetkiliyse ve `Txn.sender == signer` ise **ASA destroy** (inner `AssetConfig`) + kayıt iptali
- **Okuma metodları**: `get_asset_id`, `is_active`, `total_signers`, `signed_count`, `my_contracts`

### Box Storage Şeması
- `asa_<file_hash>` : `UInt64(asset_id)`
- `adm_<file_hash>` : `Address(creator)`
- `sgn_<file_hash>` : **authorized signers** (32B adresler ardışık blob)
- `sgh_<file_hash>` : **signed signers** (32B adresler ardışık blob)
- `del_<file_hash>` : `UInt64(0/1)` (canceled)
- `uhs_<user_addr_32B>` : kullanıcının oluşturduğu tüm `file_hash`’ler (32B ardışık blob)

---

## Backend (FastAPI)

### Kurulum & Çalıştırma
```bash
cd backend
pip install -r requirements.txt   # veya: pip install fastapi uvicorn py-algorand-sdk pydantic
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Konfig (dotenv opsiyonel):**
- `ALGOD_URL` (örn. `https://testnet-api.algonode.cloud`)
- `ALGOD_TOKEN` (sağlayıcıya göre boş/anahtar)
- `ALGOD_TOKEN_HEADER` (örn. `X-Algo-API-Token` veya PureStake için `X-API-Key`)

> **SDK uyumluluğu:** Bazı ortamlarda `py-algorand-sdk` eski olabilir. Bu projede ABI çağrıları için **`Method` + `ABIType`** ile `app_args` encode edildi; böylece 1.x–2.x sürümleriyle uyumludur.

### API Uçları

#### 1) `POST /blocksign/create/build`
- Döner: **`unsigned_group_b64: [payment_b64, appcall_b64]`**, `app_address`
- AppCall fee: `2000–3000 µAlgo` (inner `AssetConfig` için)
```bash
curl -X POST http://localhost:8000/blocksign/create/build   -H 'Content-Type: application/json'   -d '{
    "app_id": 123456789,
    "sender": "ALGO_SENDER_ADDR",
    "file_hash_hex": "0x<64-hex>",
    "signers": ["ALGO_SIGNER_1", "ALGO_SIGNER_2"]
  }'
```

#### 2) `POST /tx/submit`
- İmzalı b64 dizisini **aynı sırayla** gönder
```bash
curl -X POST http://localhost:8000/tx/submit   -H 'Content-Type: application/json'   -d '{ "signed_b64": ["...","..."] }'
```

#### 3) `POST /blocksign/sign/build`
- Döner: **`unsigned_b64`** (tek AppCall)
```bash
curl -X POST http://localhost:8000/blocksign/sign/build   -H 'Content-Type: application/json'   -d '{ "app_id":123456789, "sender":"ALGO_ADDR", "file_hash_hex":"0x<64-hex>" }'
```

#### 4) `GET /blocksign/issign/boxread`
- Ücretsiz okuma: `?app_id=...&file_hash_hex=...&address=...` → `{ "issign": 0/1 }`

#### 5) `POST /blocksign/iscomplete/build`
- Döner: **`unsigned_b64`** (tek AppCall, boxes: `sgn_`, `sgh_`, `del_`)

#### 6) `POST /tx/submit_and_decode_uint64` (opsiyonel)
- Publish + onay + **ABI `uint64` dönüş** (log decode) → `{ return: 0/1 }`

#### 7) `POST /blocksign/reject/build`
- Döner: **`unsigned_b64`** (tek AppCall, fee `2000–3000`; boxes: `asa_`, `sgn_`, `sgh_`, `del_`)

---

## Frontend (React/Next + Lute)

### Cüzdan Bağlama & `create_contract` Akışı

```tsx
import LuteConnect from "lute-connect";

const APP_ID = 123456789;
const LUTE_GENESIS_ID = "testnet-v1.0"; // mainnet: "mainnet-v1.0"
const API_BASE = "http://localhost:8000"; // backend origin

function bytesToB64(u8: Uint8Array) { return btoa(String.fromCharCode(...u8)); }

async function handleCreate(fileHashHex: string, signers: string[]) {
  const lute = new LuteConnect();
  const addrs = await lute.connect(LUTE_GENESIS_ID);
  const sender = addrs[0];

  // 1) Build
  const r1 = await fetch(`${API_BASE}/blocksign/create/build`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app_id: APP_ID, sender, file_hash_hex: fileHashHex, signers }),
  });
  const { unsigned_group_b64 } = await r1.json();
  if (!r1.ok) throw new Error("build error");

  // 2) Sign (sırayı bozma)
  const signFn = (lute as any).sign ?? (lute as any).signTxns;
  const signed = await signFn(unsigned_group_b64);
  const signed_b64 = signed.map((s: string|Uint8Array) => typeof s === "string" ? s : bytesToB64(s));

  // 3) Submit
  const r2 = await fetch(`${API_BASE}/tx/submit`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ signed_b64 }),
  });
  const { txid } = await r2.json();
  console.log("create_contract txid:", txid);
}
```

**Diğer işlemler**
- `sign`: `/blocksign/sign/build` → `lute.sign([unsigned_b64])` → `/tx/submit`
- `issign`: `GET /blocksign/issign/boxread` (ücretsiz)
- `iscomplete`: `/blocksign/iscomplete/build` → `lute.sign` → `/tx/submit_and_decode_uint64` (dönüş 0/1)
- `reject`: `/blocksign/reject/build` → `lute.sign` → `/tx/submit`

---

## Uçtan Uca Akış

1) **Connect**: Lute ile cüzdan bağla → `sender` adresini al.  
2) **Create**: Backend’den **unsigned** `[Payment, AppCall]` al → Lute ile **iki tx’i de sırayla** imzala → submit.  
3) **Sign**: Yetkili imzacı, tek AppCall **`sign`** tx’ini imzalar ve gönderir.  
4) **Kontrol**:  
   - hızlı/ücretsiz: `issign` = **box read**  
   - zincir üstü: `iscomplete` = **ABI çağrısı** (`return 0/1`)  
5) **Reject (opsiyonel)**: Yetkili bir imzacı `reject` çağırırsa ASA destroy + kayıt iptali.

---

## Hata Giderme

- **`AttributeError: abi.ABIMethod` yok**: Ortamdaki `py-algorand-sdk` eski olabilir. Çözüm:  
  - Ya SDK’yı `pip install --upgrade py-algorand-sdk` ile yükselt,  
  - Ya da bu projede olduğu gibi **`Method` + `ABIType` ile app_args encode** et (geriye uyumlu).
- **`box not found`**: Bu `file_hash` için `create_contract` hiç çalışmamış olabilir ya da farklı hash gönderiliyor. Ücretsiz uç: `issign/boxread` `0` döndürür.  
- **`invalid group size` / `group index`**: `create_contract`’ta **iki tx** (Gtxn[0]=Payment, Gtxn[1]=AppCall) **aynı sırayla** imzalanmalı/gönderilmeli.  
- **`overspend / fee`**: Inner `AssetConfig` için AppCall **fee 2000–3000 µAlgo** ayarla (backend `sp2.fee`).  
- **CORS**: Frontend origin’i backend’in `allow_origins` listesine ekle.

---

## Güvenlik Notları

- **Mnemonic/Private key asla backend’e gönderilmez.** İmza her zaman **kullanıcının cüzdanında (Lute)** yapılır.  
- Custodial model (sunucuda anahtar tutma) **önerilmez**; yasal ve güvenlik riskleri doğurur.  
- Ödeme tx’inde `rekey_to` ve `close_remainder_to` **sıfır adres** olarak kontrol edilir (sözleşmede doğrulanır).  
- İmzacılar ve imza durumları **Box Storage**’ta tutulur; kullanıcı verisi DB’de saklanmıyorsa kimlik eşlemelerini uygulama seviyesinde yap.
