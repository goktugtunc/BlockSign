# BlockSign

> **Özet (Project Summary)**  
> BlockSign, **IPFS**’e yüklenen bir belgenin **CID**’ini (hash) zincir üzerinde temsil eden bir akış kurar:  
> - **Akıllı sözleşme (Algopy/ARC-4)**: `create_contract` ile *tekil bir Algorand NFT’si (ASA, total=1)* mint eder, **imzacılar** ve **imzalananlar**ı **Box Storage**’ta tutar; `sign`, `issign`, `iscomplete`, `reject` vb. metodlarla ilerlemeyi yönetir.  
> - **Backend (FastAPI + py-algorand-sdk)**: Frontend’in isteğiyle **imzasız (unsigned)** Algorand işlemlerini hazırlar (Payment + AppCall / tek AppCall). Kullanıcı Lute ile imzalar; backend imzalı ham işlemleri ağa **publish** eder.  
> - **Frontend (React/Next + Lute Wallet)**: Kullanıcı cüzdanını bağlar, dosyayı **IPFS**’e yükler, dönen **CID**’i (hash) sözleşmeye iletir, işlemleri Lute ile imzalar ve backend’e gönderir; ilerlemeyi görüntüler.

> **Canlılar**  
> - Web sitesi: **https://algorand.hackstack.com.tr**  
> - Backend API dokümantasyonu (Swagger): **https://algoback.hackstack.com.tr/docs**

---

## İçindekiler
- [Mimari](#mimari)
- [Teknolojiler](#teknolojiler)
- [Klasör Yapısı](#klasör-yapısı)
- [Akıllı Sözleşme (Algopy/ARC-4)](#akıllı-sözleşme-algopyarc-4)
  - [Metodlar & Kurallar](#metodlar--kurallar)
  - [Box Storage Şeması](#box-storage-şeması)
  - [IPFS CID Hakkında](#ipfs-cid-hakkında)
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
Frontend (React/Next + lute-connect + IPFS)
   └──> Backend (FastAPI)
         ├─ /blocksign/create/build      (unsigned Payment + AppCall)
         ├─ /blocksign/sign/build        (unsigned AppCall)
         ├─ /blocksign/issign/build      (unsigned AppCall)
         ├─ /blocksign/iscomplete/build  (unsigned AppCall)
         ├─ /blocksign/reject/build      (unsigned AppCall)
         └─ /tx/submit / /tx/submit_and_decode_uint64
                   └──> Algorand Node (TestNet/MainNet)
                              └──> Smart Contract (Algopy ARC-4)
```

---

## Teknolojiler
- **Algorand**: ARC-4 ABI, ASA (NFT), Box Storage  
- **Akıllı sözleşme**: Algopy (ARC4Contract)  
- **Backend**: FastAPI, `py-algorand-sdk`  
- **Frontend**: React/Next.js, `lute-connect` (Algorand cüzdanı), **IPFS** (CID alma)

---

## Klasör Yapısı
```
BlockSign/
├─ backend/                  # FastAPI servisi (unsigned tx build + submit)
├─ blockchain/
│  └─ blocksign/             # Algopy ARC-4 sözleşme kaynakları
└─ frontend/                 # React/Next + lute-connect + IPFS istemcisi
```
> Not: Dosya/klasör adları projedeki yapı ile eşleşecek şekilde düzenlenebilir.

---

## Akıllı Sözleşme (Algopy/ARC-4)

### Metodlar & Kurallar
- **`create_contract(file_hash: byte[], signers: address[]) -> uint64`**  
  - **Group şartı**: `Global.group_size == 2`  
  - **Gtxn[0]**: Payment → **app address**, **amount ≥ 5 ALGO**, `sender == Txn.sender`, `rekey_to == zero`, `close_remainder_to == zero`  
  - **Gtxn[1]**: AppCall (bu method)  
  - İçeride **inner `AssetConfig`** ile **1 adetlik NFT (ASA)** mint edilir (`manager = app address`)  
  - `file_hash` (bu projede **IPFS CID**’i) ⟶ `asset_id` ve admin eşleşmesi, `signers` ve `signed` blob’ları **Box**’a yazılır  
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

### IPFS CID Hakkında
- Bu projede `file_hash` alanı, **IPFS’ten dönen CID**’in temsilidir. Frontend dosyayı IPFS’e yükler (ör. HTTP API / pinning servisi), **CID string**’ini alır ve sözleşme çağrısına **byte[]** olarak geçirir.  
- CID string (Base58/Base32) ⟶ **bytes** çevirimi uygulama katmanında yapılır (örn. multibase decode). Alternatif olarak CID string’ini ham bytes’a dönüştürmeden **UTF-8** olarak da gönderebilirsiniz; sözleşme tarafı bu değeri **öznitelik** olarak saklar (uygulama mantığınıza göre seçin).  
- Önemli olan, **aynı CID’in** imza sürecinde tekil anahtar olarak kullanılmasıdır.

---

## Backend (FastAPI)

### Kurulum & Çalıştırma
```bash
cd backend
pip install -r requirements.txt   # veya: pip install fastapi uvicorn py-algorand-sdk pydantic
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
> Canlı dokümantasyon: **https://algoback.hackstack.com.tr/docs**

**Konfig (dotenv opsiyonel):**
- `ALGOD_URL` (örn. `https://testnet-api.algonode.cloud`)
- `ALGOD_TOKEN` (sağlayıcıya göre boş/anahtar)
- `ALGOD_TOKEN_HEADER` (örn. `X-Algo-API-Token` veya PureStake için `X-API-Key`)

> **SDK uyumluluğu:** Bazı ortamlarda `py-algorand-sdk` eski olabilir. Bu projede ABI çağrıları için **`Method` + `ABIType`** ile `app_args` encode edildi; böylece 1.x–2.x sürümleriyle uyumludur.

### API Uçları

#### 1) `POST /blocksign/create/build`
- Döner: **`unsigned_group_b64: [payment_b64, appcall_b64]`**, `app_address`  
- AppCall fee: `2000–3000 µAlgo` (inner `AssetConfig` için)

#### 2) `POST /tx/submit`
- İmzalı b64 dizisini **aynı sırayla** gönder

#### 3) `POST /blocksign/sign/build`
- `sign(file_hash, signer)` için **tek AppCall** (unsigned)

#### 4) `POST /blocksign/issign/build`
- `issign(file_hash)` için **tek AppCall** (unsigned) — `Txn.sender` kontrol edilecek adres olmalı

#### 5) `POST /blocksign/iscomplete/build`
- `iscomplete(file_hash)` için **tek AppCall** (unsigned) — boxes: `sgn_`, `sgh_`, `del_`

#### 6) `POST /tx/submit_and_decode_uint64` (opsiyonel)
- Publish + onay + **ABI `uint64` dönüş** (log decode) → `{ return: 0/1 }`

#### 7) `POST /blocksign/reject/build`
- `reject(file_hash, signer)` için **tek AppCall** (unsigned) — boxes: `asa_`, `sgn_`, `sgh_`, `del_`

---

## Frontend (React/Next + Lute)

> Web sitesi: **https://algorand.hackstack.com.tr**

### Cüzdan Bağlama & `create_contract` Akışı (özet)

1. **IPFS yükle** → **CID** al (örn. `bafy...` / `Qm...`)  
2. **Lute connect** → `sender` adresini al (`genesisID`: testnet için `"testnet-v1.0"`)  
3. **Build**: `/blocksign/create/build` → `[payment_b64, appcall_b64]` al  
4. **Sign**: Lute ile **aynı sırayla** imzala (`sign` / `signTxns`)  
5. **Submit**: `/tx/submit` ile ağa yayınla  
6. **Sign akışı**: `/blocksign/sign/build` → sign → submit  
7. **Kontrol**:  
   - `issign`: `/blocksign/issign/build` → sign → `submit_and_decode_uint64` (dönüş 0/1)  
   - `iscomplete`: `/blocksign/iscomplete/build` → sign → `submit_and_decode_uint64` (dönüş 0/1)  
8. **Reddetme**: `/blocksign/reject/build` → sign → submit

> `create_contract` çağrısı **Gtxn[0]=Payment**, **Gtxn[1]=AppCall** olacak şekilde iki işlemli grup üretir. Sırayı bozmayın.

---

## Uçtan Uca Akış

1) **Dosyayı IPFS’e yükle** ve **CID** al.  
2) **Connect**: Lute ile cüzdan bağla → `sender`.  
3) **Create**: Backend’den **unsigned** `[Payment, AppCall]` al → Lute ile **iki tx’i de sırayla** imzala → submit.  
4) **Sign**: Yetkili imzacı(lar), **tek AppCall** `sign` tx’ini imzalar ve gönderir.  
5) **Kontrol**: `issign` (adres bazlı) ve `iscomplete` (tüm imzacılar) için ABI çağrısı üret; sonucu `submit_and_decode_uint64` ile oku.  
6) **Reject (opsiyonel)**: Yetkili bir imzacı `reject` çağırırsa ASA destroy + kayıt iptali.

---

## Hata Giderme

- **`AttributeError: abi.ABIMethod` yok**: Ortamdaki `py-algorand-sdk` eski olabilir. Çözüm:  
  - Ya SDK’yı `pip install --upgrade py-algorand-sdk` ile yükselt,  
  - Ya da bu projede olduğu gibi **`Method` + `ABIType` ile app_args encode** et (geriye uyumlu).
- **`box not found`**: Bu `file_hash` (CID) için `create_contract` hiç çalışmamış olabilir ya da farklı CID gönderiliyor.  
- **`invalid group size` / `group index`**: `create_contract`’ta **iki tx** (Gtxn[0]=Payment, Gtxn[1]=AppCall) **aynı sırayla** imzalanmalı/gönderilmeli.  
- **`overspend / fee`**: Inner `AssetConfig` için AppCall **fee 2000–3000 µAlgo** ayarla (backend `sp2.fee`).  
- **CORS**: Frontend origin’i backend’in `allow_origins` listesine ekle.

---

## Güvenlik Notları

- **Mnemonic/Private key asla backend’e gönderilmez.** İmza her zaman **kullanıcının cüzdanında (Lute)** yapılır.  
- Custodial model (sunucuda anahtar tutma) **önerilmez**; yasal ve güvenlik riskleri doğurur.  
- Ödeme tx’inde `rekey_to` ve `close_remainder_to` **sıfır adres** olarak kontrol edilir (sözleşmede doğrulanır).  
- İmzacılar ve imza durumları **Box Storage**’ta tutulur; kullanıcı verisi DB’de saklanmıyorsa kimlik eşlemelerini uygulama seviyesinde yap.
