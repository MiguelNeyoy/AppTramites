import {
  cleanExtractedText,
  parseTramiteFromPdfPages,
  type DocumentExtractionResult,
} from '../documentos/documentParsers.ts'

export const SUPPORTED_OCR_IMAGE_EXTENSIONS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
] as const

export const SUPPORTED_OCR_IMAGE_MIMES = [
  'image/png',
  'image/jpeg',
  'image/webp',
] as const

export const MAX_OCR_IMAGE_SIZE_BYTES = 25 * 1024 * 1024
export const MAX_OCR_PDF_SIZE_BYTES = 120 * 1024 * 1024
export const MAX_OCR_PDF_PAGES = 3
export const LOW_OCR_CONFIDENCE_THRESHOLD = 65

export type OcrStage =
  | 'IDLE'
  | 'LOADING_ENGINE'
  | 'RENDERING_PDF'
  | 'RECOGNIZING'
  | 'PARSING'

export interface OcrProgressUpdate {
  stage: OcrStage
  progress: number
  message: string
  page?: number
  totalPages?: number
}

export interface OcrExtractionMetadata {
  usedOcr: boolean
  confidence: number
  pagesProcessed: number
  engine: 'tesseract.js'
}

export type OcrFileValidationResult =
  | { valid: true; kind: 'IMAGE' | 'PDF' }
  | { valid: false; error: string }

export interface OcrDocumentExtraction {
  extraction: DocumentExtractionResult
  metadata: OcrExtractionMetadata
}

const IMAGE_MIME_SET = new Set<string>(SUPPORTED_OCR_IMAGE_MIMES)

/**
 * Indica si un archivo corresponde a un formato de imagen soportado por OCR.
 */
export function isSupportedOcrImageFile(
  fileName: string,
  mimeType = ''
): boolean {
  const lowerName = fileName.trim().toLowerCase()
  const normalizedMime = mimeType.trim().toLowerCase()
  if (IMAGE_MIME_SET.has(normalizedMime)) {
    return true
  }
  return SUPPORTED_OCR_IMAGE_EXTENSIONS.some((ext) => lowerName.endsWith(ext))
}

/**
 * Indica si un archivo corresponde a un documento PDF.
 */
export function isSupportedOcrPdfFile(
  fileName: string,
  mimeType = ''
): boolean {
  const lowerName = fileName.trim().toLowerCase()
  const normalizedMime = mimeType.trim().toLowerCase()
  return normalizedMime === 'application/pdf' || lowerName.endsWith('.pdf')
}

/**
 * Valida formato y tamano maximo de un archivo PDF o imagen previo al OCR.
 */
export function validateOcrFile(file: {
  name: string
  size: number
  type?: string
}): OcrFileValidationResult {
  if (!file || typeof file.name !== 'string' || !file.name.trim()) {
    return {
      valid: false,
      error: 'Selecciona una imagen o PDF valido para leer con OCR.',
    }
  }

  if (file.size <= 0) {
    return {
      valid: false,
      error: 'El archivo seleccionado esta vacio.',
    }
  }

  const mime = file.type ?? ''
  if (isSupportedOcrImageFile(file.name, mime)) {
    if (file.size > MAX_OCR_IMAGE_SIZE_BYTES) {
      return {
        valid: false,
        error: 'La imagen supera el tamano maximo permitido para OCR (25 MB).',
      }
    }
    return { valid: true, kind: 'IMAGE' }
  }

  if (isSupportedOcrPdfFile(file.name, mime)) {
    if (file.size > MAX_OCR_PDF_SIZE_BYTES) {
      return {
        valid: false,
        error: 'El PDF supera el tamano maximo permitido para OCR (120 MB).',
      }
    }
    return { valid: true, kind: 'PDF' }
  }

  return {
    valid: false,
    error:
      'Formato no compatible para OCR. Usa un archivo .pdf, .png, .jpg o .webp.',
  }
}

/**
 * Normaliza la confianza numerica de Tesseract a entero en [0, 100].
 */
export function normalizeOcrConfidence(rawConfidence: number): number {
  if (!Number.isFinite(rawConfidence)) {
    return 0
  }
  return Math.max(0, Math.min(100, Math.round(rawConfidence)))
}

/**
 * Convierte eventos de progreso de tesseract.js a mensajes en espanol para la UI.
 */
export function mapTesseractStatusToProgress(
  status: string,
  rawProgress: number,
  page?: number,
  totalPages?: number
): OcrProgressUpdate {
  const safeRatio = Number.isFinite(rawProgress) ? rawProgress : 0
  const progress = Math.max(0, Math.min(100, Math.round(safeRatio * 100)))
  const pageSuffix =
    page && totalPages && totalPages > 1 ? ` (Pag. ${page}/${totalPages})` : ''

  const normalized = status.trim().toLowerCase()

  let stage: OcrStage = 'LOADING_ENGINE'
  let message = `Procesando documento con OCR...${pageSuffix}`

  if (
    normalized === 'loading tesseract core' ||
    normalized === 'initializing tesseract'
  ) {
    stage = 'LOADING_ENGINE'
    message = `Cargando motor OCR en tu navegador...${pageSuffix}`
  } else if (normalized === 'loading language traineddata') {
    stage = 'LOADING_ENGINE'
    message = `Descargando diccionario OCR en espanol...${pageSuffix}`
  } else if (normalized === 'initializing api') {
    stage = 'LOADING_ENGINE'
    message = `Preparando analisis OCR...${pageSuffix}`
  } else if (normalized === 'recognizing text') {
    stage = 'RECOGNIZING'
    message = `Leyendo texto del documento con OCR...${pageSuffix}`
  }

  return {
    stage,
    progress,
    message,
    page,
    totalPages,
  }
}

function stripAsciiControlChars(text: string): string {
  let out = ''
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    if (code >= 0x20 || code === 0x09 || code === 0x0a || code === 0x0d) {
      out += text[i]
    } else {
      out += ' '
    }
  }
  return out
}

/**
 * Limpia ruido visual tipico de salida OCR (bordes de tabla, comillas tipograficas y espacios).
 */
export function postProcessOcrText(rawText: string): string {
  if (!rawText) {
    return ''
  }

  const sanitized = stripAsciiControlChars(rawText)
    .replace(/\|+/g, ' ')
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u2013\u2014]/g, '-')

  return cleanExtractedText(sanitized)
}

/**
 * Determina si las paginas ya procesadas contienen los campos minimos de tramite para detener el OCR temprano.
 */
export function hasMinimumTramiteFields(
  pagesText: string[],
  fileName: string
): boolean {
  const cleanedPages = pagesText.map((p) => postProcessOcrText(p))
  const parsed = parseTramiteFromPdfPages(cleanedPages, fileName, 'PDF')
  if (parsed.kind !== 'TRAMITES' || parsed.items.length === 0) {
    return false
  }
  const first = parsed.items[0]
  return Boolean(first.numeroCuenta && first.nombreAlumno && first.claveUa)
}

/**
 * Construye el resultado unificado de extraccion reutilizando los parsers de tramites UAS.
 */
export function buildOcrDocumentResult(
  pagesText: string[],
  fileName: string,
  format: 'PDF' | 'IMAGE',
  averageConfidence: number
): OcrDocumentExtraction {
  const cleanedPages = pagesText.map((page) => postProcessOcrText(page))
  const parsed = parseTramiteFromPdfPages(cleanedPages, fileName, format)
  const confidence = normalizeOcrConfidence(averageConfidence)

  const metadata: OcrExtractionMetadata = {
    usedOcr: true,
    confidence,
    pagesProcessed: pagesText.length,
    engine: 'tesseract.js',
  }

  if (parsed.kind !== 'TRAMITES' || parsed.items.length === 0) {
    return {
      extraction: {
        kind: 'TRAMITES',
        format,
        fileName,
        requiresOcr: true,
        warnings: [
          'El motor OCR no logro leer texto suficiente en el documento escaneado o imagen. Verifica nitidez o captura los datos manualmente.',
        ],
        items: [],
      },
      metadata,
    }
  }

  const warnings = [...parsed.warnings]
  if (confidence > 0 && confidence < LOW_OCR_CONFIDENCE_THRESHOLD) {
    warnings.push(
      `Confianza OCR moderada (${confidence}%). Revisa cuidadosamente cada campo antes de guardar.`
    )
  }

  return {
    extraction: {
      ...parsed,
      warnings,
    },
    metadata,
  }
}
