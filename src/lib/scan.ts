import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

export type Draft = {
  name?: string
  company?: string
  niche?: string
  value?: string
  contactName?: string
  email?: string
  phone?: string
  summary?: string
  delivery?: string
  pages?: number
}

let workerReady = false

async function extractPdfText(file: File): Promise<{ text: string; pages: number }> {
  const pdfjs = await import('pdfjs-dist')
  if (!workerReady) {
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
    workerReady = true
  }
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: buffer }).promise
  const max = Math.min(pdf.numPages, 8)
  let text = ''
  for (let i = 1; i <= max; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    text += content.items.map((item) => ('str' in item ? item.str : '')).join(' ') + '\n'
  }
  return { text, pages: pdf.numPages }
}

function titleCase(input: string): string {
  return input
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function firstMatch(text: string, patterns: RegExp[]): string | undefined {
  for (const re of patterns) {
    const m = text.match(re)
    if (m?.[1]) return m[1].trim()
  }
  return undefined
}

const MONTHS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']

function formatDelivery(raw: string): string {
  const m = raw.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/)
  if (!m) return raw.toUpperCase()
  const day = m[1].padStart(2, '0')
  const month = MONTHS[Math.max(0, Math.min(11, Number(m[2]) - 1))]
  const year = m[3].length === 2 ? `20${m[3]}` : m[3]
  return `${day} ${month} ${year}`
}

function buildSummary(text: string): string | undefined {
  const sentences = text
    .split(/[.!?\n]+/)
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter((s) => s.length > 34 && s.length < 320 && /[a-záéíóúñ]/i.test(s))
  if (sentences.length === 0) return undefined
  return sentences.slice(0, 2).join('. ').slice(0, 280)
}

export async function scanDocument(file: File): Promise<Draft> {
  const draft: Draft = { name: titleCase(file.name) }

  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)

  if (isPdf) {
    try {
      const { text, pages } = await extractPdfText(file)
      draft.pages = pages

      draft.value = firstMatch(text, [
        /(?:valor|precio|monto|total|contraprestación)[^\n\d$]{0,28}(\$?\s?[\d][\d.,]{3,})/i,
        /\$\s?([\d][\d.,]{3,})/,
        /(?:usd|cop|mxn)\s*([\d][\d.,]{3,})/i,
      ])
      draft.email = text.match(/[\w.+-]+@[\w-]+\.[\w.]{2,}/)?.[0]
      draft.phone = text.match(/(\+?\d[\d\s().-]{8,}\d)/)?.[1]?.trim()
      draft.contactName = firstMatch(text, [
        /(?:atención|contacto|representad[oa] por|sr\.?|sra\.?)\s*:?\s+([A-ZÁÉÍÓÚÑ][\wáéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][\wáéíóúñ]+){1,2})/,
      ])
      draft.company = firstMatch(text, [
        /([\wáéíóúñ&.,-]+\s+(?:S\.?\s?A\.?\s?S\.?|LTDA\.?|INC\.?|CORP\.?|GROUP|LABS|STUDIO|HOLDING))/i,
      ])?.replace(/\s+/g, ' ')

      const dateMatch = text.match(/\d{1,2}[/.-]\d{1,2}[/.-](?:\d{2,4})/g)
      if (dateMatch) draft.delivery = formatDelivery(dateMatch[dateMatch.length - 1])

      draft.summary = buildSummary(text)
      draft.niche = /contrato|legal/i.test(text) ? 'Legal / Contratos' : undefined
    } catch {
      /* PDF protegido o corrupto: se conservan los metadatos */
    }
  }

  if (!draft.summary) {
    draft.summary = `Documento "${file.name}" cargado al campo (${Math.max(1, Math.round(file.size / 1024))} KB). Completa la ficha para activar el seguimiento completo.`
  }

  return draft
}
