export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const jwt = process.env.PINATA_JWT?.trim();
    if (!jwt) return new Response(JSON.stringify({ error: "Missing PINATA_JWT" }), { status: 500 });

    const inForm = await req.formData();
    const file = inForm.get("file") as File | null;
    if (!file) return new Response(JSON.stringify({ error: "No file" }), { status: 400 });

    const form = new FormData();
    form.append("file", file, file.name);

    const r = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt}` },
      body: form,
    });

    const text = await r.text();
    return new Response(text, { status: r.status });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "server error" }), { status: 500 });
  }
}

// opsiyonel sağlık kontrolü: GET /api/pinata
export async function GET() {
  const jwt = process.env.PINATA_JWT?.trim();
  const r = await fetch("https://api.pinata.cloud/data/testAuthentication", {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  return new Response(await r.text(), { status: r.status });
}
