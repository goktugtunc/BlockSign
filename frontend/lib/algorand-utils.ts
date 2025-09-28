import algosdk from "algosdk";

export async function writeToAlgorand(
  cid: string,
  walletAddress: string,
  signTransaction: (txns: any[]) => Promise<Uint8Array[]>
): Promise<string> {
  try {
    // Algonode public: token yok, URL env'den
    const algodServer = process.env.NEXT_PUBLIC_ALGOD_URL ?? "https://testnet-api.algonode.cloud";
    const algodClient = new algosdk.Algodv2("", algodServer, ""); // port boş bırakılabilir

    const sp = await algodClient.getTransactionParams().do();

    // Buffer yerine TextEncoder
    const note = new TextEncoder().encode(cid);

    const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: walletAddress,
      to: walletAddress,     // self-tx
      amount: 0,             // 0 microAlgos (sadece not)
      note,
      suggestedParams: sp,
    });

    // Wallet'e iletilecek encoded txn
    const encoded = algosdk.encodeUnsignedTransaction(txn);

    // ÇOĞU WALLET İÇİN (WalletConnect/Pera): base64 alan obje
    const base64Txn =
      typeof window !== "undefined"
        ? btoa(String.fromCharCode(...encoded))
        : Buffer.from(encoded).toString("base64"); // server fallback

    const signed = await signTransaction([{ txn: base64Txn }]); // senin connector'un böyleyse
    // Eğer connector Uint8Array bekliyorsa:  const signed = await signTransaction([encoded]);

    // Ağa gönder
    const { txId } = await algodClient.sendRawTransaction(signed[0]).do();
    await algosdk.waitForConfirmation(algodClient, txId, 4);
    return txId;
  } catch (error) {
    console.error("Algorand transaction error:", error);
    throw new Error("Algorand işlemi sırasında hata oluştu");
  }
}
