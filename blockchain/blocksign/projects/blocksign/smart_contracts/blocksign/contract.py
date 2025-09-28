# smart_contracts/blocksign/contract.py
from algopy import (
    ARC4Contract,
    UInt64,
    Account,
    Global,
    Txn,
    gtxn,
    itxn,
    BoxMap,
    Bytes,
    Asset,
    arc4,
)

# Sabitler
FIVE_ALGO = 5_000_000   # microAlgos
PAYMENT_INDEX = 0       # Gtxn[0] ödeme

class Blocksign(ARC4Contract):
    """
    create_contract(file_hash, signers):
      - Gtxn[0]: Payment -> app address, amount >= 5 ALGO, sender == caller
      - Gtxn[1]: AppCall (bu method)
      - 1 adetlik NFT (ASA) mint eder, manager = app address
      - file_hash -> asset_id ve admin eşleşmesini box storage'da tutar
      - signers (address[]) -> tek box'ta (sgn_) ardışık 32B adres blob'u olarak saklanır
      - asset_id döndürür

    cancel(file_hash):
      - Sadece uygulamayı oluşturan hesap (Global.creator_address) çağırabilir
      - (Mümkünse) ASA’yı siler, kaydı iptal eder

    sign(file_hash, signer):
      - Sadece yetkili imzacılar (sgn_ blob’unda olan adresler) çağırabilir
      - signer.bytes == Txn.sender.bytes olmalı
      - İmza kaydını sgh_ kutusuna ekler (idempotent)

    issign(file_hash):
      - Txn.sender bu hash’i imzalamış mı? (1/0)

    iscomplete(file_hash):
      - Listedeki tüm imzacılar imzalamış mı? (1/0)

    reject(file_hash, signer):
      - signers listesindeki herhangi bir kişi reddederse ASA silinip kayıt iptal edilir

    my_contracts():
      - Txn.sender’ın oluşturduğu sözleşme hash’lerini 32B ardışık blob olarak döner

    Aşağıdaki okuma metodları tek tek bilgi verir (tuple yerine):
      - get_asset_id(file_hash)  -> UInt64
      - is_active(file_hash)     -> UInt64 (iptal edilmemiş:1 / iptal:0)
      - total_signers(file_hash) -> UInt64
      - signed_count(file_hash)  -> UInt64
    """

    def __init__(self) -> None:
        # file_hash -> asset_id
        self.asset_by_hash = BoxMap(arc4.DynamicBytes, UInt64, key_prefix=b"asa_")
        # bilgi amaçlı; global admin = creator
        self.admin_by_hash = BoxMap(arc4.DynamicBytes, Account, key_prefix=b"adm_")
        # file_hash -> yetkili imzacılar blob'u (32B adresler ardışık)
        self.signers_blob_by_hash = BoxMap(arc4.DynamicBytes, Bytes, key_prefix=b"sgn_")
        # file_hash -> canceled flag (0/1)
        self.canceled_by_hash = BoxMap(arc4.DynamicBytes, UInt64, key_prefix=b"del_")
        # file_hash -> imza atan adresler blob'u (32B adresler ardışık)
        self.signed_blob_by_hash = BoxMap(arc4.DynamicBytes, Bytes, key_prefix=b"sgh_")
        # kullanıcı (address) -> kendi oluşturduğu hash’ler (32B’lik ardışık blob)
        self.user_hashes = BoxMap(arc4.Address, Bytes, key_prefix=b"uhs_")

    @arc4.abimethod()
    def create_contract(
        self,
        file_hash: arc4.DynamicBytes,
        signers: arc4.DynamicArray[arc4.Address],
    ) -> UInt64:
        # --- 0) Önkoşullar ---
        canceled_flag, canceled_exists = self.canceled_by_hash.maybe(file_hash)
        assert not (canceled_exists and canceled_flag == 1), "hash canceled"

        # --- 1) Ödeme doğrulama ---
        assert Global.group_size == 2, "group must be size 2 (Payment + AppCall)"

        pay = gtxn.PaymentTransaction(PAYMENT_INDEX)
        assert pay.receiver == Global.current_application_address, "payment must go to app address"
        assert pay.amount >= FIVE_ALGO, "insufficient payment: need >= 5 ALGO"
        assert pay.sender == Txn.sender, "payer must be the caller"
        assert pay.rekey_to == Global.zero_address, "rekey not allowed"
        assert pay.close_remainder_to == Global.zero_address, "close not allowed"

        # --- 2) Daha önce mint edilmiş mi? ---
        existing_id, exists = self.asset_by_hash.maybe(file_hash)
        if exists:
            # Kullanıcı indeksine ekli değilse ekle (idempotent)
            user_key = arc4.Address(Txn.sender.bytes)
            blob_u, has_u = self.user_hashes.maybe(user_key)
            if not has_u:
                blob_u = Bytes(b"")
            i0 = UInt64(0)
            present = UInt64(0)
            while i0 < blob_u.length:
                if blob_u[i0 : i0 + UInt64(32)] == file_hash.bytes:
                    present = UInt64(1)
                    break
                i0 = i0 + UInt64(32)
            if present == UInt64(0):
                self.user_hashes[user_key] = blob_u + file_hash.bytes
            return existing_id

        # --- 3) NFT mint (inner txn) ---
        prefix: Bytes = file_hash.bytes[:8]  # label için ilk 8 bayt
        asset_name: Bytes = Bytes(b"FILE-") + prefix
        unit_name: Bytes = Bytes(b"FILE")

        mint_res = itxn.AssetConfig(
            total=UInt64(1),
            decimals=UInt64(0),
            default_frozen=False,
            unit_name=unit_name,
            asset_name=asset_name,
            manager=Global.current_application_address,  # ASA yönetimi sözleşmede
            reserve=Global.zero_address,
            freeze=Global.zero_address,
            clawback=Global.zero_address,
        ).submit()

        asset_id: UInt64 = mint_res.created_asset.id

        # --- 4) Eşlemeleri kaydet ---
        self.asset_by_hash[file_hash] = asset_id
        self.admin_by_hash[file_hash] = Global.creator_address

        # --- 5) İmzacıları (sgn_) sakla
        blob: Bytes = Bytes(b"")
        i = UInt64(0)
        n = signers.length
        while i < n:
            addr = signers[i]          # arc4.Address
            blob = blob + addr.bytes   # 32 bayt ekle
            i = i + UInt64(1)
        self.signers_blob_by_hash[file_hash] = blob

        # sgh_ (signed) başlangıçta boş
        self.signed_blob_by_hash[file_hash] = Bytes(b"")

        # --- 6) Kullanıcı indeksine (uhs_) ekle (idempotent) ---
        user_key = arc4.Address(Txn.sender.bytes)
        blob_u, has_u = self.user_hashes.maybe(user_key)
        if not has_u:
            blob_u = Bytes(b"")
        j = UInt64(0)
        present = UInt64(0)
        while j < blob_u.length:
            if blob_u[j : j + UInt64(32)] == file_hash.bytes:
                present = UInt64(1)
                break
            j = j + UInt64(32)
        if present == UInt64(0):
            self.user_hashes[user_key] = blob_u + file_hash.bytes

        # --- 7) asset_id döndür ---
        return asset_id

    @arc4.abimethod()
    def cancel(self, file_hash: arc4.DynamicBytes) -> UInt64:
        assert Txn.sender == Global.creator_address, "only app creator can cancel"

        asset_id, exists = self.asset_by_hash.maybe(file_hash)
        assert exists, "hash not found"

        canceled_flag, canceled_exists = self.canceled_by_hash.maybe(file_hash)
        assert not (canceled_exists and canceled_flag == 1), "already canceled"

        # ASA delete dene (manager = app address ve arz app'te olmalı)
        itxn.AssetConfig(
            config_asset=Asset(asset_id),
        ).submit()

        self.canceled_by_hash[file_hash] = UInt64(1)
        self.signers_blob_by_hash[file_hash] = Bytes(b"")
        self.signed_blob_by_hash[file_hash] = Bytes(b"")

        return asset_id

    @arc4.abimethod()
    def sign(self, file_hash: arc4.DynamicBytes, signer: arc4.Address) -> UInt64:
        assert Global.group_size == 1, "invalid group size"

        canceled_flag, canceled_exists = self.canceled_by_hash.maybe(file_hash)
        assert not (canceled_exists and canceled_flag == 1), "hash canceled"

        _asset_id, exists = self.asset_by_hash.maybe(file_hash)
        assert exists, "hash not found"

        assert signer.bytes == Txn.sender.bytes, "sender mismatch"

        sgn_blob, has_sgn = self.signers_blob_by_hash.maybe(file_hash)
        assert has_sgn, "no signers set"

        i = UInt64(0)
        authorized = UInt64(0)
        while i < sgn_blob.length:
            if sgn_blob[i : i + UInt64(32)] == signer.bytes:
                authorized = UInt64(1)
                break
            i = i + UInt64(32)
        assert authorized == UInt64(1), "unauthorized signer"

        sgh_blob, has_sgh = self.signed_blob_by_hash.maybe(file_hash)
        if not has_sgh:
            sgh_blob = Bytes(b"")

        j = UInt64(0)
        while j < sgh_blob.length:
            if sgh_blob[j : j + UInt64(32)] == signer.bytes:
                return UInt64(1)  # idempotent
            j = j + UInt64(32)

        self.signed_blob_by_hash[file_hash] = sgh_blob + signer.bytes
        return UInt64(1)

    @arc4.abimethod()
    def issign(self, file_hash: arc4.DynamicBytes) -> UInt64:
        assert Global.group_size == 1, "invalid group size"

        sgh_blob, has_sgh = self.signed_blob_by_hash.maybe(file_hash)
        if not has_sgh:
            return UInt64(0)

        i = UInt64(0)
        while i < sgh_blob.length:
            if sgh_blob[i : i + UInt64(32)] == Txn.sender.bytes:
                return UInt64(1)
            i = i + UInt64(32)

        return UInt64(0)

    @arc4.abimethod()
    def iscomplete(self, file_hash: arc4.DynamicBytes) -> UInt64:
        assert Global.group_size == 1, "invalid group size"

        canceled_flag, canceled_exists = self.canceled_by_hash.maybe(file_hash)
        if canceled_exists and canceled_flag == UInt64(1):
            return UInt64(0)

        sgn_blob, has_sgn = self.signers_blob_by_hash.maybe(file_hash)
        if not has_sgn or sgn_blob.length == UInt64(0):
            return UInt64(0)

        sgh_blob, has_sgh = self.signed_blob_by_hash.maybe(file_hash)
        if not has_sgh or sgh_blob.length == UInt64(0):
            return UInt64(0)

        i = UInt64(0)
        while i < sgn_blob.length:
            signer_bytes = sgn_blob[i : i + UInt64(32)]
            j = UInt64(0)
            found = UInt64(0)
            while j < sgh_blob.length:
                if sgh_blob[j : j + UInt64(32)] == signer_bytes:
                    found = UInt64(1)
                    break
                j = j + UInt64(32)
            if found == UInt64(0):
                return UInt64(0)
            i = i + UInt64(32)

        return UInt64(1)

    @arc4.abimethod()
    def reject(self, file_hash: arc4.DynamicBytes, signer: arc4.Address) -> UInt64:
        assert Global.group_size == 1, "invalid group size"

        canceled_flag, canceled_exists = self.canceled_by_hash.maybe(file_hash)
        assert not (canceled_exists and canceled_flag == 1), "hash canceled"

        asset_id, exists = self.asset_by_hash.maybe(file_hash)
        assert exists, "hash not found"

        assert signer.bytes == Txn.sender.bytes, "sender mismatch"

        sgn_blob, has_sgn = self.signers_blob_by_hash.maybe(file_hash)
        assert has_sgn, "no signers set"
        i = UInt64(0)
        authorized = UInt64(0)
        while i < sgn_blob.length:
            if sgn_blob[i : i + UInt64(32)] == signer.bytes:
                authorized = UInt64(1)
                break
            i = i + UInt64(32)
        assert authorized == UInt64(1), "unauthorized signer"

        itxn.AssetConfig(
            config_asset=Asset(asset_id),
        ).submit()

        self.canceled_by_hash[file_hash] = UInt64(1)
        self.signers_blob_by_hash[file_hash] = Bytes(b"")
        self.signed_blob_by_hash[file_hash] = Bytes(b"")

        return asset_id

    @arc4.abimethod()
    def my_contracts(self) -> Bytes:
        """
        Txn.sender’ın oluşturduğu tüm sözleşme hash’lerini döner.
        Dönüş: 32 baytlık hash’lerin ardışık olarak biriktiği Bytes blob’u.
        """
        key = arc4.Address(Txn.sender.bytes)
        blob, has = self.user_hashes.maybe(key)
        if not has:
            return Bytes(b"")
        return blob

    # ---- Ayrı okuma metodları (tuple yerine) ----
    @arc4.abimethod()
    def get_asset_id(self, file_hash: arc4.DynamicBytes) -> UInt64:
        asset_id, has_asset = self.asset_by_hash.maybe(file_hash)
        if not has_asset:
            return UInt64(0)
        return asset_id

    @arc4.abimethod()
    def is_active(self, file_hash: arc4.DynamicBytes) -> UInt64:
        canceled_flag, canceled_exists = self.canceled_by_hash.maybe(file_hash)
        if canceled_exists and canceled_flag == UInt64(1):
            return UInt64(0)
        return UInt64(1)

    @arc4.abimethod()
    def total_signers(self, file_hash: arc4.DynamicBytes) -> UInt64:
        sgn_blob, has_sgn = self.signers_blob_by_hash.maybe(file_hash)
        if not has_sgn:
            return UInt64(0)
        # 32 baytlık parça say
        i = UInt64(0)
        cnt = UInt64(0)
        while i < sgn_blob.length:
            cnt = cnt + UInt64(1)
            i = i + UInt64(32)
        return cnt

    @arc4.abimethod()
    def signed_count(self, file_hash: arc4.DynamicBytes) -> UInt64:
        sgh_blob, has_sgh = self.signed_blob_by_hash.maybe(file_hash)
        if not has_sgh:
            return UInt64(0)
        # 32 baytlık parça say
        i = UInt64(0)
        cnt = UInt64(0)
        while i < sgh_blob.length:
            cnt = cnt + UInt64(1)
            i = i + UInt64(32)
        return cnt
