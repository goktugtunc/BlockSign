// lib/ipfs-utils.ts
export async function uploadToIPFS(
  pdfBytes: Uint8Array,
  filename = "contract.pdf"
): Promise<string> {
  const file = new File([pdfBytes], filename, { type: "application/pdf" });
  const form = new FormData();
  form.append("file", file, filename);

  const res = await fetch("/api/pinata", { method: "POST", body: form });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Pinata upload failed: ${res.status} ${detail}`);
  }
  const data = (await res.json()) as { IpfsHash: string };
  return `ipfs://${data.IpfsHash}`;
}
