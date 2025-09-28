// lib/pdf.ts
import { PDFDocument, rgb } from "pdf-lib"
import fontkit from "@pdf-lib/fontkit" // <-- gerekli

// küçük yardımcı: Türkçe ve bazı özel karakterleri WinAnsi-uyumlu ASCII karşılıklarına çevir
function sanitizeForWinAnsi(input: string): string {
  if (!input) return input

  // Normalize to decompose combined characters, then strip combining marks (sağlıklı fallback)
  let s = input.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")

  // Harf eşlemeleri (Türkçe -> ASCII)
  const map: Record<string, string> = {
    ş: "s",
    Ş: "S",
    ı: "i",
    İ: "I",
    ç: "c",
    Ç: "C",
    ğ: "g",
    Ğ: "G",
    ü: "u",
    Ü: "U",
    ö: "o",
    Ö: "O",
    æ: "ae",
    Æ: "AE",
    œ: "oe",
    Œ: "OE",
    "€": "EUR",
    "₺": "TL",
    "£": "GBP",
    "¥": "YEN",
    "–": "-", // en dash
    "—": "-", // em dash
    "“": '"',
    "”": '"',
    "„": '"',
    "«": '"',
    "»": '"',
    "‘": "'",
    "’": "'",
    "\u00A0": " ", // non-breaking space
    "\u200B": "", // zero width space
  }

  // Replace mapped characters
  s = s.replace(/[\u00A0\u200B–—“”„«»‘’₺€£¥æÆœŒğĞüÜöÖşŞıİ]/g, (ch) => map[ch] ?? ch)

  // As a final safety: remove any remaining control characters except newline/tab
  s = s.replace(/[^\x09\x0A\x0D\x20-\x7E\u0080-\u00FF]/g, (c) => {
    // keep basic extended latin range \u0080-\u00FF just in case, otherwise drop
    // (this avoids breaking characters that would still cause encode issues)
    const code = c.charCodeAt(0)
    if (code >= 0x80 && code <= 0xff) return c
    return ""
  })

  return s
}

// Word wrap util (aynı mantık)
function wrapTextToLines(text: string, font: any, fontSize: number, maxWidth: number): string[] {
  const paragraphs = text.replace(/\r/g, "").split("\n")
  const outLines: string[] = []

  for (const para of paragraphs) {
    if (!para.trim()) {
      outLines.push("")
      continue
    }
    const words = para.split(" ")
    let line = ""
    for (const w of words) {
      const candidate = line ? line + " " + w : w
      const width = font.widthOfTextAtSize(candidate, fontSize)
      if (width <= maxWidth) {
        line = candidate
      } else {
        if (line) outLines.push(line)
        // If single word is too long, break it by characters
        if (font.widthOfTextAtSize(w, fontSize) > maxWidth) {
          let chunk = ""
          for (const ch of w) {
            const test = chunk + ch
            if (font.widthOfTextAtSize(test, fontSize) > maxWidth) {
              if (chunk) outLines.push(chunk)
              chunk = ch
            } else {
              chunk = test
            }
          }
          if (chunk) {
            outLines.push(chunk)
            line = ""
          } else {
            line = ""
          }
        } else {
          line = w
        }
      }
    }
    if (line) outLines.push(line)
  }

  return outLines
}

export async function exportToPDF(contractText: string, title = "Sözleşme"): Promise<Uint8Array> {
  try {
    const pdfDoc = await PDFDocument.create()

    // Register fontkit BEFORE embedding a custom font
    pdfDoc.registerFontkit(fontkit)

    // Önce metni sanitize et (Türkçe özel karakterleri ASCII'ye dönüştür)
    const safeText = sanitizeForWinAnsi(contractText)
    const safeTitle = sanitizeForWinAnsi(title)

    // Try to fetch embedded font from public folder
    const fontUrl = "/fonts/NotoSans-Regular.ttf"
    let font: any
    try {
      const resp = await fetch(fontUrl, { cache: "reload" })
      if (!resp.ok) throw new Error("Font fetch failed: " + resp.status)
      const fontBytes = await resp.arrayBuffer()
      // embedFont expects Uint8Array / ArrayBuffer
      font = await pdfDoc.embedFont(fontBytes)
    } catch (e) {
      console.warn(
        "[exportToPDF] Unicode font embed failed, falling back to StandardFonts (may not support Turkish):",
        e
      )
      // fallback to a standard font (non-unicode, may cause WinAnsi error on special chars if any slipped)
      const pdfLib = await import("pdf-lib")
      font = await pdfDoc.embedFont(pdfLib.StandardFonts.Helvetica)
    }

    const pageSize = { width: 595.28, height: 841.89 } // A4
    let page = pdfDoc.addPage([pageSize.width, pageSize.height])
    const margin = 48
    const fontSize = 11
    const titleSize = 16
    const lineHeight = fontSize * 1.35
    const maxWidth = pageSize.width - margin * 2

    // Draw title (sanitized)
    page.drawText(safeTitle, {
      x: margin,
      y: pageSize.height - margin,
      size: titleSize,
      font,
      color: rgb(0, 0, 0),
    })

    let yPosition = pageSize.height - margin - titleSize - 12

    // Normalize and split into logical lines using sanitized text
    const normalized = safeText.replace(/\r/g, "")
    const rawLines = normalized.split("\n")

    for (let i = 0; i < rawLines.length; i++) {
      let line = rawLines[i]

      // Recognize headings (markdown) and adjust size
      let heading = false
      let drawSize = fontSize
      if (/^#\s+/.test(line)) {
        line = line.replace(/^#\s+/, "").trim()
        heading = true
        drawSize = 14
      } else if (/^##\s+/.test(line)) {
        line = line.replace(/^##\s+/, "").trim()
        heading = true
        drawSize = 12.5
      } else if (/^###\s+/.test(line)) {
        line = line.replace(/^###\s+/, "").trim()
        heading = true
        drawSize = 11.5
      }

      if (!line.trim()) {
        yPosition -= lineHeight / 2
        continue
      }

      const linesToDraw = wrapTextToLines(line, font, drawSize, maxWidth)

      for (const outLine of linesToDraw) {
        if (yPosition - lineHeight < margin) {
          page = pdfDoc.addPage([pageSize.width, pageSize.height])
          yPosition = page.getSize().height - margin
        }

        page.drawText(outLine, {
          x: margin,
          y: yPosition,
          size: drawSize,
          font,
          color: rgb(0, 0, 0),
        })

        yPosition -= lineHeight
      }
    }

    const bytes = await pdfDoc.save()
    return bytes
  } catch (error) {
    console.error("PDF generation error:", error)
    throw new Error("PDF oluşturulurken hata oluştu: " + String(error))
  }
}

export function downloadPDF(pdfBytes: Uint8Array, filename = "sozlesme.pdf") {
  const blob = new Blob([pdfBytes], { type: "application/pdf" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // revoke after a small timeout to ensure download starts
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
