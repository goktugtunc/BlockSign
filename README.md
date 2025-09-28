# BlockSign

> **Project Summary**  
> BlockSign is an end‑to‑end example that anchors the **IPFS CID** of a document on Algorand.  
> - **Smart contract (Algopy / ARC‑4):** `create_contract` mints a *single‑supply ASA (NFT; total=1)* per document, stores **authorized signers** and **actual signers** in **Box Storage**, and exposes `sign`, `issign`, `iscomplete`, `reject`, etc.  
> - **Backend (FastAPI + py‑algorand‑sdk):** builds **unsigned** transactions (Payment + AppCall or single AppCall). Users sign them in the browser with **Lute**, and the backend broadcasts the signed bytes to the network.  
> - **Frontend (React/Next + Lute Wallet + IPFS):** uploads the file to **IPFS**, retrieves the **CID**, connects a wallet with Lute, signs transactions, and displays status.

> **Live URLs**  
> - Website (frontend): **https://algorand.hackstack.com.tr**  
> - Backend API (Swagger): **https://algoback.hackstack.com.tr/docs**

---

## Table of Contents
- [Architecture](#architecture)
- [Technologies](#technologies)
- [Folder Structure](#folder-structure)
- [Smart Contract (Algopy / ARC‑4)](#smart-contract-algopy--arc4)
  - [Methods & Rules](#methods--rules)
  - [Box Storage Layout](#box-storage-layout)
  - [About IPFS CIDs](#about-ipfs-cids)
- [Backend (FastAPI)](#backend-fastapi)
  - [Setup & Run](#setup--run)
  - [API Endpoints](#api-endpoints)
- [Frontend (React/Next + Lute)](#frontend-reactnext--lute)
  - [Wallet Connect & `create_contract` Flow](#wallet-connect--create_contract-flow)
- [End‑to‑End Flow](#end-to-end-flow)
- [Troubleshooting](#troubleshooting)
- [Security Notes](#security-notes)
- [License](#license)

---

## Architecture

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
                              └──> Smart Contract (Algopy ARC‑4)
```

---

## Technologies
- **Algorand**: ARC‑4 ABI, ASA (NFT), Box Storage  
- **Smart contract**: Algopy (`ARC4Contract`)  
- **Backend**: FastAPI, `py-algorand-sdk`  
- **Frontend**: React/Next.js, `lute-connect` (Algorand wallet), **IPFS** (CID retrieval)

---

## Folder Structure
```
BlockSign/
├─ backend/                  # FastAPI service (unsigned tx build + submit)
├─ blockchain/
│  └─ blocksign/             # Algopy ARC‑4 smart contract sources
└─ frontend/                 # React/Next + lute-connect + IPFS client
```
> Adjust file/dir names as needed to match your repo layout.

---

## Smart Contract (Algopy / ARC‑4)

### Methods & Rules
- **`create_contract(file_hash: byte[], signers: address[]) -> uint64`**  
  - **Group requirement:** `Global.group_size == 2`  
  - **Gtxn[0]** = Payment → **app address**, **amount ≥ 5 ALGO**, `sender == Txn.sender`, `rekey_to == zero`, `close_remainder_to == zero`  
  - **Gtxn[1]** = AppCall (this method)  
  - Internally performs **inner `AssetConfig`** to mint a **single‑supply ASA** (`manager = app address`)  
  - Stores mappings in Boxes: `file_hash` (here: **IPFS CID bytes**) → `asset_id`, admin, signers blob, signed blob  
  - Returns: `asset_id`
- **`cancel(file_hash: byte[]) -> uint64`**  
  - Only `Global.creator_address` can call; attempts ASA destroy and marks record canceled.
- **`sign(file_hash: byte[], signer: address) -> uint64`**  
  - **Group requirement:** `Global.group_size == 1`  
  - `signer` must be authorized and `Txn.sender == signer`  
  - Append signer to the `sgh_` blob (idempotent)
- **`issign(file_hash: byte[]) -> uint64`**  
  - Returns `1` if `Txn.sender` signed this `file_hash`, else `0`
- **`iscomplete(file_hash: byte[]) -> uint64`**  
  - Returns `1` if **all** authorized signers have signed and the record is not canceled
- **`reject(file_hash: byte[], signer: address) -> uint64`**  
  - If authorized and `Txn.sender == signer`, performs ASA destroy + cancels the record
- **Read helpers**: `get_asset_id`, `is_active`, `total_signers`, `signed_count`, `my_contracts`

### Box Storage Layout
- `asa_<file_hash>` : `UInt64(asset_id)`  
- `adm_<file_hash>` : `Address(creator)`  
- `sgn_<file_hash>` : **authorized signers** (32‑byte addresses, concatenated)  
- `sgh_<file_hash>` : **signed signers** (32‑byte addresses, concatenated)  
- `del_<file_hash>` : `UInt64(0/1)` (canceled flag)  
- `uhs_<user_addr_32B>` : all file hashes created by a user (32‑byte chunks)

### About IPFS CIDs
- In this project, `file_hash` carries the **IPFS CID** of the uploaded document.  
- The frontend uploads the file to IPFS (HTTP API / pinning service), receives the **CID string** (`bafy...` or `Qm...`), and passes it into the contract call as **`byte[]`**.  
- Converting the CID string to bytes can be done via **multibase/multicodec** decoding or by sending **UTF‑8 bytes** if you only need an opaque, consistent identifier on‑chain.  
- The critical part is to use the **exact same CID** consistently across `create_contract`, `sign`, `issign`, `iscomplete`, and `reject`.

---

## Backend (FastAPI)

### Setup & Run
```bash
cd backend
pip install -r requirements.txt   # or: pip install fastapi uvicorn py-algorand-sdk pydantic
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
> Live docs: **https://algoback.hackstack.com.tr/docs**

**Config (dotenv optional):**
- `ALGOD_URL` (e.g., `https://testnet-api.algonode.cloud`)
- `ALGOD_TOKEN` (empty or API key depending on your provider)
- `ALGOD_TOKEN_HEADER` (e.g., `X-Algo-API-Token` or `X-API-Key` for PureStake)

> **SDK compatibility:** Some environments ship older `py-algorand-sdk`. This project encodes ABI arguments using **`Method` + `ABIType`** (instead of `ABIMethod`), making it work across both 1.x and 2.x versions.

### API Endpoints

#### 1) `POST /blocksign/create/build`
Builds an **unsigned 2‑tx group** for `create_contract`:
- Returns: **`unsigned_group_b64: [payment_b64, appcall_b64]`**, `app_address`  
- AppCall fee: `2000–3000 µAlgo` (to cover inner `AssetConfig`)

#### 2) `POST /tx/submit`
Broadcasts an array of **signed** base64 transactions **in the same order** as built.

#### 3) `POST /blocksign/sign/build`
Builds a **single unsigned AppCall** for `sign(file_hash, signer)`.

#### 4) `POST /blocksign/issign/build`
Builds a **single unsigned AppCall** for `issign(file_hash)`.  
> `Txn.sender` must be the address you want to check.

#### 5) `POST /blocksign/iscomplete/build`
Builds a **single unsigned AppCall** for `iscomplete(file_hash)` (boxes: `sgn_`, `sgh_`, `del_`).

#### 6) `POST /tx/submit_and_decode_uint64` (optional)
Broadcasts, waits for confirmation, and decodes the last log as an **ABI `uint64`** (e.g., `0/1` for `issign` / `iscomplete`).

#### 7) `POST /blocksign/reject/build`
Builds a **single unsigned AppCall** for `reject(file_hash, signer)` (boxes: `asa_`, `sgn_`, `sgh_`, `del_`).  
> AppCall fee usually needs `2000–3000 µAlgo` (inner `AssetConfig` destroy).

---

## Frontend (React/Next + Lute)

> Live site: **https://algorand.hackstack.com.tr**

### Wallet Connect & `create_contract` Flow

1. **Upload to IPFS** → get **CID** (`bafy...` / `Qm...`).  
2. **Lute connect** → obtain `sender` (TestNet genesis: `"testnet-v1.0"`, MainNet: `"mainnet-v1.0"`).  
3. **Build**: call `/blocksign/create/build` with `{ app_id, sender, file_hash_hex: <CID as bytes/hex or UTF-8 bytes>, signers }`.  
4. **Sign**: pass `[payment_b64, appcall_b64]` to Lute (`sign`/`signTxns`) **without reordering**.  
5. **Submit**: POST to `/tx/submit`.  
6. **Sign flow**: `/blocksign/sign/build` → sign → submit.  
7. **Check**:  
   - `issign`: `/blocksign/issign/build` → sign → `/tx/submit_and_decode_uint64` (returns `0/1`)  
   - `iscomplete`: `/blocksign/iscomplete/build` → sign → `/tx/submit_and_decode_uint64` (returns `0/1`)  
8. **Reject**: `/blocksign/reject/build` → sign → submit.

> `create_contract` strictly requires **Gtxn[0] = Payment** and **Gtxn[1] = AppCall**. Keep the order intact when signing and submitting.

---

## End‑to‑End Flow

1) **Upload the file to IPFS** and obtain the **CID**.  
2) **Connect** the wallet with Lute → `sender`.  
3) **Create**: backend builds an **unsigned** `[Payment, AppCall]` → Lute signs both in order → backend submits.  
4) **Sign**: each authorized signer executes the **single AppCall** `sign`.  
5) **Verify**: use `issign` for per‑address checks and `iscomplete` to ensure all signers have signed (via `submit_and_decode_uint64`).  
6) **Reject (optional)**: any authorized signer may `reject`, which destroys the ASA and cancels the record.

---

## Security Notes

- **Never send mnemonics/private keys to the backend.** All signing happens in the user’s wallet (Lute).  
- A custodial model (server‑side keys) is **not recommended** due to security/compliance risks.  
- The payment transaction checks `rekey_to` and `close_remainder_to` are zero in the contract logic.  
- Signers and signature state are kept on-chain via **Box Storage**.
