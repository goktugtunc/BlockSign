import { GoogleGenerativeAI } from "@google/generative-ai"

interface ContractParams {
  prompt: string
  parties: Array<{ name: string; address: string }>
  country: string
  currency: string
  deadline: string
  termination: string
}

interface GeneratedContract {
  contract: string
  summary: string[]
  riskAnalysis: Array<{ level: string; description: string }>
}

/** helper: pretty date for TR */
function formatDateTR(dateStr?: string) {
  if (!dateStr) return ""
  try {
    return new Date(dateStr).toLocaleDateString("tr-TR")
  } catch {
    return dateStr
  }
}

/** Basic heuristic language detector (TR / EN). Returns 'tr' or 'en' or 'tr' fallback. */
function detectLanguage(text?: string): "tr" | "en" {
  if (!text) return "tr"
  const sample = text.slice(0, 500).toLowerCase()

  // Turkish indicator words
  const turkishWords = ["ve", "ile", "taraf", "sözleşme", "teslim", "fesh", "mücbir", "fatura", "tarih", "gün"]
  const englishWords = ["the", "and", "party", "agreement", "deliver", "termination", "due", "day", "contract"]

  let tScore = 0
  let eScore = 0

  for (const w of turkishWords) if (new RegExp(`\\b${w}\\b`, "i").test(sample)) tScore += 2
  for (const w of englishWords) if (new RegExp(`\\b${w}\\b`, "i").test(sample)) eScore += 2

  // presence of Turkish-specific chars
  if (/[ğıüşöçİŞĞÜÖ]/.test(sample)) tScore += 3

  return tScore >= eScore ? "tr" : "en"
}

/** helper: try to unescape common JSON-escaped sequences so text becomes readable */
function unescapeText(s: string) {
  if (!s) return s
  return s
    .replace(/\\r/g, "\r")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    // decode simple \u00XX escapes
    .replace(/\\u00([0-9A-Fa-f]{2})/g, (_m, p1) => String.fromCharCode(parseInt(p1, 16)))
    // decode full \uXXXX escapes
    .replace(/\\u([0-9A-Fa-f]{4})/g, (_m, p1) => String.fromCharCode(parseInt(p1, 16)))
}

/** extract first JSON-like substring (naive) */
function extractJsonSubstring(text: string): string | null {
  if (!text) return null
  // try fenced block first
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (fenced && fenced[1]) return fenced[1].trim()

  // try to find substring that starts with { and ends with matching }
  // This is naive: find first "{" and last "}" and return substring — then parse attempts will validate
  const first = text.indexOf("{")
  const last = text.lastIndexOf("}")
  if (first >= 0 && last > first) return text.slice(first, last + 1).trim()

  return null
}

/** try parse JSON with some fallbacks */
function tryParseJsonMaybe(text: string): any | null {
  if (!text) return null
  // direct parse
  try {
    return JSON.parse(text)
  } catch {
    // try unescape then parse
    try {
      const t = unescapeText(text)
      return JSON.parse(t)
    } catch {
      // strip wrapping quotes/backticks and try
      const stripped = text.replace(/^\s*["'`]+\s*/, "").replace(/\s*["'`]+\s*$/, "")
      try {
        return JSON.parse(unescapeText(stripped))
      } catch {
        return null
      }
    }
  }
}

/** Try to extract the human-readable contract + summary + risks from free text */
function parseContractFromPlainText(text: string): GeneratedContract {
  const contract = text.trim()

  let summary: string[] = []
  let riskAnalysis: Array<{ level: string; description: string }> = []

  const summaryMatch =
    text.match(/(?:^|\n)#{0,3}\s*ÖZET\s*[:\-]?\s*([\s\S]*?)(?:\n#{1,3}\s|$)/i) ||
    text.match(/(?:^|\n)#{0,3}\s*Özet\s*[:\-]?\s*([\s\S]*?)(?:\n#{1,3}\s|$)/i) ||
    text.match(/(?:^|\n)#{0,3}\s*SUMMARY\s*[:\-]?\s*([\s\S]*?)(?:\n#{1,3}\s|$)/i)

  if (summaryMatch) {
    const bullets = summaryMatch[1]
      .split(/\n/)
      .map((l) => l.replace(/^\s*[-*]\s*/, "").trim())
      .filter(Boolean)
    if (bullets.length) summary = bullets.slice(0, 6)
  }

  // fallback: search for any bullet list near top
  if (summary.length === 0) {
    const bulletsAny = text.match(/(^|\n)\s*[-*]\s+.+/g)
    if (bulletsAny) {
      summary = bulletsAny.map((b) => b.replace(/(^|\n)\s*[-*]\s+/, "").trim()).slice(0, 6)
    }
  }

  // risk extraction
  const riskMatch =
    text.match(/(?:^|\n)#{0,3}\s*(Risk Analizi|RİSK|RISK|RİSK ANALİZİ|RISK ANALYSIS)\s*[:\-]?\s*([\s\S]*?)(?:\n#{1,3}\s|$)/i) ||
    text.match(/(?:^|\n)(RİSK|RISK)[\s\S]{0,200}/i)

  if (riskMatch && riskMatch[2]) {
    const lines = riskMatch[2].split(/\n/).map((l) => l.trim()).filter(Boolean)
    for (const l of lines) {
      const m = l.match(/(High|Medium|Low|Yüksek|Orta|Mini)\s*[:\-–]\s*(.+)/i)
      if (m) {
        let level = m[1]
        const desc = m[2]
        if (/yüksek/i.test(level)) level = "High"
        if (/orta/i.test(level)) level = "Medium"
        if (/mini/i.test(level)) level = "Low"
        riskAnalysis.push({ level, description: desc })
      } else {
        riskAnalysis.push({ level: "Medium", description: l })
      }
    }
  }

  if (summary.length === 0) summary = ["Özet otomatik olarak üretilemedi."]
  if (riskAnalysis.length === 0) riskAnalysis = [{ level: "Medium", description: "Risk analizi otomatik olarak üretilemedi." }]

  return { contract, summary, riskAnalysis }
}

/** Normalize result object to GeneratedContract with safe defaults */
function normalizeParsedJson(parsed: any): GeneratedContract {
  const contractRaw = parsed.contract ?? parsed.text ?? parsed.content ?? ""
  const contract = typeof contractRaw === "string" ? unescapeText(contractRaw).replace(/^"(.*)"$/s, "$1").trim() : JSON.stringify(contractRaw)
  const summaryArr = Array.isArray(parsed.summary) ? parsed.summary.map(String) : parsed.summary ? [String(parsed.summary)] : ["Özet bulunamadı"]
  const riskArr = Array.isArray(parsed.riskAnalysis)
    ? parsed.riskAnalysis.map((r: any) => ({ level: String(r.level ?? "Medium"), description: String(r.description ?? r) }))
    : [{ level: "Medium", description: "Risk analizi yok" }]

  return { contract, summary: summaryArr, riskAnalysis: riskArr }
}

/** main function */
export async function generateContract(params: ContractParams): Promise<GeneratedContract> {
  // prefer server-side key variables
  const apiKey = process.env.GENAI_API_KEY || process.env.GENERATIVE_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY

  if (!apiKey) {
    // dev fallback
    return {
      contract: `# FREELANCE YAZILIM GELİŞTİRME SÖZLEŞMESİ\n\n## TARAFLAR\n${params.parties.map((p) => `**${p.name}:** ${p.address}`).join("\n")}\n\n## PROJE KAPSAMI\n${params.prompt}\n\n## ÖDEME KOŞULLARI\n- Para birimi: ${params.currency}\n- Ülke: ${params.country}\n\n## TESLİM TARİHİ\n${params.deadline ? `Proje ${formatDateTR(params.deadline)} tarihine kadar tamamlanacaktır.` : "Teslim tarihi belirtilmemiştir."}\n\n## FESİH KOŞULLARI\n${params.termination ? `Her iki taraf da ${params.termination} gün önceden yazılı bildirimde bulunarak sözleşmeyi feshedebilir.` : "Fesih koşulları belirtilmemiştir."}`,
      summary: ["AI tarafından oluşturulan sözleşme", `Para birimi: ${params.currency}`, `Ülke: ${params.country}`, `${params.parties.length} taraf dahil`],
      riskAnalysis: [{ level: "Low", description: "Geliştirme ortamında simüle edildi" }],
    }
  }

  try {
    const lang = detectLanguage(params.prompt) // 'tr' or 'en'
    const langName = lang === "tr" ? "Türkçe" : "English"

    const genAI = new GoogleGenerativeAI(apiKey)
    // adjust model if you need another; keep current project model if working
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

    // Compose strong instruction telling model to return JSON if possible, and respond in the detected language.
    const contractPrompt = `
You are a professional legal-drafting assistant. Respond in ${langName}.
User-supplied details below (do not invent missing legal identifiers).
Description: ${params.prompt}
Parties: ${params.parties.map((p) => `${p.name} (${p.address || "adres yok"})`).join("; ")}
Country: ${params.country}
Currency: ${params.currency}
Deadline: ${formatDateTR(params.deadline)}
Termination (days): ${params.termination || "Belirtilmemiş"}

OUTPUT INSTRUCTION (priority order):
1) Preferably return a valid JSON object ONLY (no code fences, no extra text) with keys:
   {
     "contract": "<full contract as markdown or plain text>",
     "summary": ["bullet1","bullet2",...],
     "riskAnalysis": [{"level":"High|Medium|Low","description":"..."}]
   }
   If you return JSON, ensure strings are not escaped JSON-within-JSON (return real JSON).

2) If you cannot return JSON, return CLEAN markdown in ${langName} with the following headings:
   # <TITLE>
   ## TARAFLAR (or PARTIES)
   ## PROJE KAPSAMI (or SCOPE)
   ## ÖDEME KOŞULLARI (or PAYMENT TERMS)
   ## TESLİM TARİHİ (or DELIVERY DATE)
   ## FİKRİ MÜLKİYET (or IP)
   ## FESİH KOŞULLARI (or TERMINATION)
   Then append:
   ## ÖZET (or SUMMARY) - 3 to 6 bullet points
   ## RISK ANALIZI (or RISK ANALYSIS) - up to 3 items like "High: reason"

IMPORTANT:
- If the user prompt is in Turkish, produce the contract and headings in Turkish. If in English, produce in English.
- Do not wrap the JSON in markdown code blocks. Do not output anything other than the JSON object if you can.
- If you cannot produce JSON, produce only the clean markdown described above.
`

    const result = await model.generateContent(contractPrompt)
    const response = await result.response
    const rawText = String(await response.text())

    // Step 1: try to extract JSON substring and parse
    const jsonSub = extractJsonSubstring(rawText)
    if (jsonSub) {
      const parsed = tryParseJsonMaybe(jsonSub)
      if (parsed && (parsed.contract || parsed.summary || parsed.riskAnalysis)) {
        return normalizeParsedJson(parsed)
      }
    }

    // Step 2: try parse entire rawText as JSON (maybe unescaped)
    const tryFull = tryParseJsonMaybe(rawText)
    if (tryFull && (tryFull.contract || tryFull.summary || tryFull.riskAnalysis)) {
      return normalizeParsedJson(tryFull)
    }

    // Step 3: unescape and retry JSON extraction
    const unescaped = unescapeText(rawText)
    const jsonSub2 = extractJsonSubstring(unescaped)
    if (jsonSub2) {
      const parsed2 = tryParseJsonMaybe(jsonSub2)
      if (parsed2 && (parsed2.contract || parsed2.summary || parsed2.riskAnalysis)) {
        return normalizeParsedJson(parsed2)
      }
    }

    // Step 4: fallback - parse plain text / markdown into structure
    const readable = unescaped.trim()
    const parsedPlain = parseContractFromPlainText(readable)
    return parsedPlain
  } catch (error) {
    console.error("Gemini API error (generateContract):", error)
    return {
      contract: `# UYARI: Otomatik sözleşme oluşturulamadı\n\nSistem bir hata ile karşılaşıldı; lütfen daha sonra tekrar deneyin.\n\n(Hata: ${String(error)})`,
      summary: ["Sistemsel hata nedeniyle sözleşme oluşturulamadı."],
      riskAnalysis: [{ level: "High", description: "AI çağrısı sırasında hata oluştu." }],
    }
  }
}
