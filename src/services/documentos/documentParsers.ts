import type {
  ProgramaEducativoCatalogo,
  TipoTramiteCatalogo,
  UnidadAcademicaCatalogo,
} from '../catalogos/catalogosValidation.ts'
import {
  containsSqlInjectionPattern,
  validateEmail,
} from '../login/loginValidation.ts'

export type TramiteTipoHint =
  | 'EXAMENES_ESPECIALES'
  | 'COMPLEMENTARIAS'
  | 'CONVALIDACION'
  | 'MIGRACION_CALIFICACIONES'
  | 'CORRECCION_CALIFICACION'
  | 'CERTIFICADO'
  | 'DICTAMENES_ESPECIALES'
  | 'ANULAR_FOLIO'
  | 'DESCONOCIDO'

export type DocumentSourceFormat = 'PDF' | 'XLSX' | 'IMAGE'

export interface ExtractedTramiteDraft {
  sourceLabel: string
  tipoTramiteHint: TramiteTipoHint
  numeroCuenta: string
  nombreAlumno: string
  claveUa: string
  nombreUa: string
  clavePrograma: string
  nombrePrograma: string
  folio: string
  fechaRegistro: string
  observaciones: string
  warnings: string[]
}

export interface ExtractedFichaDraft {
  sourceLabel: string
  curp: string
  aPaterno: string
  aMaterno: string
  nombre: string
  sexo: '1' | '2'
  claveEscuela: string
  claveCarrera: string
  fechaNacimiento: string
  celular: string
  correo: string
  warnings: string[]
}

export interface ExcelSheetMatrix {
  name: string
  rows: string[][]
}

export type DocumentExtractionResult =
  | {
      kind: 'TRAMITES'
      format: DocumentSourceFormat
      fileName: string
      requiresOcr: boolean
      warnings: string[]
      items: ExtractedTramiteDraft[]
    }
  | {
      kind: 'FICHAS'
      format: 'XLSX'
      fileName: string
      requiresOcr: false
      warnings: string[]
      items: ExtractedFichaDraft[]
    }

export interface CatalogMatchOptions {
  unidades: Pick<
    UnidadAcademicaCatalogo,
    'id' | 'claveUa' | 'nombre' | 'nivel'
  >[]
  programas: Pick<
    ProgramaEducativoCatalogo,
    'id' | 'unidadAcademicaId' | 'clavePrograma' | 'nombre'
  >[]
  tiposTramite: Pick<
    TipoTramiteCatalogo,
    'id' | 'nombre' | 'modulo' | 'permitePdf'
  >[]
}

export interface CatalogMatchResult {
  tipoTramiteId: number | null
  unidadAcademicaId: number | null
  programaId: number | null
  warnings: string[]
}

const CYRILLIC_HOMOGLYPH_MAP: Record<string, string> = {
  '\u0410': 'A',
  '\u0412': 'B',
  '\u0421': 'C',
  '\u0415': 'E',
  '\u041D': 'H',
  '\u041A': 'K',
  '\u041C': 'M',
  '\u041E': 'O',
  '\u0420': 'P',
  '\u0422': 'T',
  '\u0425': 'X',
  '\u0430': 'a',
  '\u0435': 'e',
  '\u043E': 'o',
  '\u0440': 'p',
  '\u0441': 'c',
  '\u0443': 'y',
  '\u0445': 'x',
}

const SPANISH_MONTH_MAP: Record<string, number> = {
  enero: 1,
  ene: 1,
  febrero: 2,
  feb: 2,
  marzo: 3,
  mar: 3,
  abril: 4,
  abr: 4,
  mayo: 5,
  may: 5,
  junio: 6,
  jun: 6,
  julio: 7,
  jul: 7,
  agosto: 8,
  aqosto: 8,
  ago: 8,
  septiembre: 9,
  setiembre: 9,
  sept: 9,
  sep: 9,
  octubre: 10,
  doctubre: 10,
  oct: 10,
  noviembre: 11,
  nov: 11,
  diciembre: 12,
  dic: 12,
}

const STOP_SIGNIFICANT_WORDS = new Set([
  'PARA',
  'DEL',
  'LOS',
  'LAS',
  'CON',
  'POR',
  'UNA',
  'MODALIDAD',
  'UNIDAD',
  'ACADEMICA',
  'PROGRAMA',
  'EDUCATIVO',
  'ESCUELA',
  'FACULTAD',
  'PREPARATORIA',
  'LICENCIATURA',
  'INGENIERIA',
])

const OCR_REQUIRED_WARNING =
  'Este PDF no contiene texto seleccionable (documento escaneado o imagen). Captura los datos manualmente o espera el servicio OCR de la Issue #16.'

/**
 * Reemplaza caracteres cirilicos visualmente identicos que aparecen en OCR de oficios PDF.
 */
export function normalizeHomoglyphs(text: string): string {
  if (!text) return ''
  return text.replace(
    /[\u0410\u0412\u0421\u0415\u041D\u041A\u041C\u041E\u0420\u0422\u0425\u0430\u0435\u043E\u0440\u0441\u0443\u0445]/g,
    (ch) => CYRILLIC_HOMOGLYPH_MAP[ch] ?? ch
  )
}

/**
 * Elimina acentos y normaliza homoglyphs para comparaciones tolerantes.
 */
export function stripAccents(value: string): string {
  if (!value) return ''
  return normalizeHomoglyphs(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/**
 * Limpia espacios multiples, NBSP y homoglyphs de texto extraido.
 */
export function cleanExtractedText(value: string): string {
  if (!value) return ''
  return normalizeHomoglyphs(value)
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeForMatch(value: string): string {
  return stripAccents(cleanExtractedText(value)).toUpperCase()
}

function buildValidIsoDate(year: number, month: number, day: number): string {
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return ''
  }
  const dt = new Date(Date.UTC(year, month - 1, day))
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() !== month - 1 ||
    dt.getUTCDate() !== day
  ) {
    return ''
  }
  const yyyy = String(year).padStart(4, '0')
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/**
 * Convierte fechas ISO, DD/MM/YYYY, DD/MM/YY o texto en espanol (incluso con errores OCR) a YYYY-MM-DD.
 */
export function parseDocumentDate(raw: string): string {
  if (!raw) return ''
  const cleaned = stripAccents(cleanExtractedText(raw)).toLowerCase()

  const isoMatch = cleaned.match(/\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/)
  if (isoMatch) {
    const valid = buildValidIsoDate(
      Number(isoMatch[1]),
      Number(isoMatch[2]),
      Number(isoMatch[3])
    )
    if (valid) return valid
  }

  const dmyFullMatch = cleaned.match(/\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b/)
  if (dmyFullMatch) {
    const valid = buildValidIsoDate(
      Number(dmyFullMatch[3]),
      Number(dmyFullMatch[2]),
      Number(dmyFullMatch[1])
    )
    if (valid) return valid
  }

  const dmyShortMatch = cleaned.match(/\b(\d{1,2})[-/](\d{1,2})[-/](\d{2})(?!\d)/)
  if (dmyShortMatch) {
    const yy = Number(dmyShortMatch[3])
    const year = yy <= 79 ? 2000 + yy : 1900 + yy
    const valid = buildValidIsoDate(
      year,
      Number(dmyShortMatch[2]),
      Number(dmyShortMatch[1])
    )
    if (valid) return valid
  }

  const spanishMatch = cleaned.match(
    /\b(\d{1,2})\s*(?:de\s+|(?<=\d)d(?=[a-z]))?\s*([a-z]{3,12})\s*(?:de|del)?\s*(\d{4})\b/
  )
  if (spanishMatch) {
    const day = Number(spanishMatch[1])
    const monthName = spanishMatch[2]
    const year = Number(spanishMatch[3])
    const month = SPANISH_MONTH_MAP[monthName]
    if (month) {
      const valid = buildValidIsoDate(year, month, day)
      if (valid) return valid
    }
  }

  return ''
}

/**
 * Infiere el tipo de tramite general a partir del texto del documento y nombre de archivo.
 */
export function detectTipoTramiteHint(
  text: string,
  fileName = ''
): TramiteTipoHint {
  const haystack = normalizeForMatch(`${text} ${fileName}`)

  if (
    /\bEXAMEN(?:ES)?\s+ESPECIAL(?:ES)?\b/.test(haystack) ||
    /\bESPECIAL\s+(?:LISI|CARRERA)\b/.test(haystack)
  ) {
    return 'EXAMENES_ESPECIALES'
  }
  if (/COMPLEM[EA]NTARIA/.test(haystack)) {
    return 'COMPLEMENTARIAS'
  }
  if (/MIGRACION\s+DE\s+CALIFICACION/.test(haystack) || /\bMIGRACION\b/.test(haystack)) {
    return 'MIGRACION_CALIFICACIONES'
  }
  if (/CONVALIDA(?:CION|R|DO|DOS)/.test(haystack)) {
    return 'CONVALIDACION'
  }
  if (/CORRECCION\s+DE\s+CALIFICACION/.test(haystack)) {
    return 'CORRECCION_CALIFICACION'
  }
  if (/ANULAR\s+FOLIO/.test(haystack)) {
    return 'ANULAR_FOLIO'
  }
  if (/\bDICTAMEN(?:ES)?\s+ESPECIAL(?:ES)?\b/.test(haystack)) {
    return 'DICTAMENES_ESPECIALES'
  }
  if (/\bCERTIFICAD[OA]S?\b/.test(haystack)) {
    return 'CERTIFICADO'
  }

  return 'DESCONOCIDO'
}

function extractUaCodeFromFileName(fileName: string): string {
  const matches = fileName.match(/\b(\d{4})\b/g) ?? []
  for (const candidate of matches) {
    const num = Number(candidate)
    if (num < 1900 || num > 2099) {
      return candidate
    }
  }
  return ''
}

function sanitizeSafeField(value: string): {
  safeValue: string
  rejected: boolean
} {
  const cleaned = cleanExtractedText(value)
  if (!cleaned) {
    return { safeValue: '', rejected: false }
  }
  if (containsSqlInjectionPattern(cleaned)) {
    return { safeValue: '', rejected: true }
  }
  return { safeValue: cleaned, rejected: false }
}

function normalizeStudentName(raw: string): string {
  return cleanExtractedText(raw)
    .replace(/^[:.\-\s]+|[:.\-\s_]+$/g, '')
    .toUpperCase()
}

function extractPdfCuenta(normalizedText: string): string {
  const match = normalizedText.match(
    /(?:NUMERO\s+DE\s+CUENTA|NO\.?\s*DE\s*CUENTA|NUM\.?\s*CTA\.?|NCTA\.?)\s*[:.]?\s*([0-9]{6,12}(?:-[0-9A-Z])?)/
  )
  return match ? match[1].trim() : ''
}

function extractPdfNombreAlumno(normalizedText: string): string {
  const patterns = [
    /NOMBRE\s+DEL\s+ALUMNO(?:\s*\(A\))?\s*[:.]?\s*([A-Z\s]{5,95}?)(?=\s*(?:NUMERO\s+DE\s+CUENTA|NO\.?\s*DE\s*CUENTA|FOLIO|CARRERA|CLAVE|SOLICITO|MATERIA|GRUPO|CICLO|GRADO|PLAN|MAZATLAN|CULIACAN|FECHA|ATENTAMENTE|SIN\s+MAS|$))/,
    /\bNOMBRE\s*[:.]?\s*([A-Z\s]{5,95}?)(?=\s*(?:APELLIDO\s+PATERNO|APELLIDO\s+MATERNO|NO\.?\s*DE\s*CUENTA|NUMERO\s+DE\s+CUENTA|CUA\b|CPE\b|CARRERA|DOMICILIO|TELEFONO|$))/,
    /(?:EL\s*\(LA\)\s*JOVEN|C\.?\s*ALUMNO(?:\s*\(A\))?|NOMBRE\s+DEL\s+SOLICITANTE)\s*[:.]?\s*([A-Z\s]{5,95}?)(?=\s*(?:NCTA\.?|NO\.?\s*DE\s*CUENTA|NUMERO\s+DE\s+CUENTA|CON\s+NUMERO|HA\s+CUBIERTO|QUIEN|SOLICITA|LE\s+SEAN|$))/,
    /\bALUMNO\s*[:.]?\s*\d{6,12}(?:-[0-9A-Z])?\s+([A-Z\s]{5,95}?)(?=\s*(?:PLAN\b|PROMEDIO\b|PER\b|CVE\b|$))/,
  ]

  for (const pattern of patterns) {
    const match = normalizedText.match(pattern)
    if (match?.[1]) {
      const candidate = normalizeStudentName(match[1])
      if (candidate.length >= 5) {
        return candidate
      }
    }
  }

  return ''
}

function extractPdfClaveUa(normalizedText: string, fileName: string): string {
  const labelMatch = normalizedText.match(
    /(?:CUA|CLAVE\s*(?:DE\s*)?UA|INSTITUCION\s+A\s+INGRESAR|INSTITUCION\s+A\s+CONVALIDAR|ESCUELA\s+DE\s+DESTINO|U\.?O\.?|DIRECTOR(?:\s+DE\s+LA\s+ESCUELA)?)\s*[:.]?\s*(\d{4})\b/
  )
  if (labelMatch?.[1]) {
    return labelMatch[1]
  }

  const inlineMatch = normalizedText.match(
    /\b(\d{4})\s+(?:FACULTAD|PREPARATORIA|ESCUELA|UNIDAD\s+ACADEMICA)\b/
  )
  if (inlineMatch?.[1]) {
    return inlineMatch[1]
  }

  return extractUaCodeFromFileName(fileName)
}

function extractPdfNombreUa(normalizedText: string): string {
  const fullMatch = normalizedText.match(
    /\b\d{4}[\s-]+((?:FACULTAD|PREPARATORIA|ESCUELA|UNIDAD\s+ACADEMICA)[^,.\n]{3,75})/
  )
  if (fullMatch?.[1]) {
    const trimmed = fullMatch[1]
      .split(/\b(?:CARRERA|PRESENTE|NUMERO|CUA|PROGRAMA|REFERENCIA|A\s+TRAVES|DE\s+ESTA)\b/)[0]
      .replace(/[\s_\-.]+$/g, '')
      .trim()
    if (trimmed.length >= 6) {
      return trimmed
    }
  }

  const labelMatch = normalizedText.match(
    /\bU\.A\.?\s*[:.]?\s*([A-Z\s]{5,75}?)(?=\s*(?:_|CPE\b|P\.E\.|CARRERA|PLAN|FOLIO|$))/
  )
  if (labelMatch?.[1]) {
    return labelMatch[1].replace(/[\s_\-.]+$/g, '').trim()
  }

  return ''
}

function extractPdfClavePrograma(normalizedText: string): string {
  const ingressMatch = normalizedText.match(
    /CARRERA\s+A\s+INGRESAR\s*[:.]?\s*(\d{1,3})\b/
  )
  if (ingressMatch?.[1]) {
    return String(Number(ingressMatch[1]))
  }

  const cpeMatch = normalizedText.match(/\bCPE\s*[:.]?\s*(\d{1,3})\b/)
  if (cpeMatch?.[1]) {
    return String(Number(cpeMatch[1]))
  }

  const carreraMatch = normalizedText.match(
    /\bCARRERA(?:\s+CURSADA)?\s*[:.]?\s*(\d{1,3})\b/
  )
  if (carreraMatch?.[1]) {
    return String(Number(carreraMatch[1]))
  }

  return ''
}

function extractPdfNombrePrograma(normalizedText: string): string {
  const peMatch = normalizedText.match(
    /\bP\.E\.?\s*[:.]?\s*([A-Z\s()]{6,90}?)(?=\s*(?:_|PLAN\s+DE\s+ESTUDIOS|FOLIO|$))/
  )
  if (peMatch?.[1]) {
    return peMatch[1].trim()
  }

  const ingressMatch = normalizedText.match(
    /CARRERA\s+A\s+INGRESAR\s*[:.]?\s*\d{1,3}\s+([A-Z\s()]{6,95}?)(?=\s*(?:GRADO\b|PLAN\b|CICLO\b|$))/
  )
  if (ingressMatch?.[1]) {
    return ingressMatch[1].trim()
  }

  const carreraMatch = normalizedText.match(
    /\bCARRERA\s*[:.]?\s*\d{1,3}\s*:?\s*([A-Z\s()]{6,95}?)(?=\s*(?:PLAN\b|NUMERO\b|NO\.\s*DE\s*CUENTA|$))/
  )
  if (carreraMatch?.[1]) {
    return carreraMatch[1].trim()
  }

  return ''
}

function extractPdfFolio(normalizedText: string): string {
  const patterns = [
    /FOLIO\s+DE\s+LA\s+HOJA\s+DE\s+PAGO\s*[:.]?\s*([A-Z0-9-]{3,40})/,
    /FOLIO\s+DEL\s+RECIBO\s*[:.]?\s*([A-Z0-9-]{3,40})/,
    /\bFOLIO\s*(?:NO\.?|NUM\.?|#)?\s*[:.]?\s*([A-Z0-9-]{3,40})/,
  ]

  for (const pattern of patterns) {
    const match = normalizedText.match(pattern)
    const candidate = match?.[1]?.trim() ?? ''
    if (candidate && /\d/.test(candidate)) {
      return candidate
    }
  }

  return ''
}

function extractPdfFecha(normalizedText: string): string {
  const cityMatch = normalizedText.match(
    /(?:MAZATLAN|CULIACAN|LOS\s+MOCHIS|GUASAVE|GUAMUCHIL|NAVOLATO|EL\s+ROSARIO|ESCUINAPA|CONCORDIA)[^0-9]{0,30}(\d{1,2}\s*(?:DE\s+|(?<=\d)D(?=[A-Z]))?\s*[A-Z]{3,12}\s*(?:DE|DEL)?\s*\d{4})/
  )
  if (cityMatch?.[1]) {
    const parsed = parseDocumentDate(cityMatch[1])
    if (parsed) return parsed
  }

  const labelMatch = normalizedText.match(
    /FECHA(?:\s+DE\s+EXPEDICION)?\s*(?:FECHA\s*)?[:.]?\s*(\d{1,4}[-/]\d{1,2}[-/]\d{1,4}|\d{1,2}\s*(?:DE\s+|(?<=\d)D(?=[A-Z]))?\s*[A-Z]{3,12}\s*(?:DE|DEL)?\s*\d{4})/
  )
  if (labelMatch?.[1]) {
    const parsed = parseDocumentDate(labelMatch[1])
    if (parsed) return parsed
  }

  const standaloneSpanish = normalizedText.match(
    /\b(\d{1,2}\s*(?:DE\s+|(?<=\d)D(?=[A-Z]))?\s*[A-Z]{3,12}\s*(?:DE|DEL)\s*(?:ANO\s+)?\d{4})\b/
  )
  if (standaloneSpanish?.[1]) {
    const parsed = parseDocumentDate(
      standaloneSpanish[1].replace(/\bDEL\s+ANO\b/, 'DEL')
    )
    if (parsed) return parsed
  }

  return ''
}

/**
 * Extrae el borrador de un tramite desde las paginas de texto obtenidas de un PDF o imagen OCR.
 */
export function parseTramiteFromPdfPages(
  pagesText: string[],
  fileName: string,
  sourceFormat: 'PDF' | 'IMAGE' = 'PDF'
): DocumentExtractionResult {
  const nonEmptyPages = pagesText
    .map((page) => cleanExtractedText(page))
    .filter((page) => page.length >= 20)

  if (nonEmptyPages.length === 0) {
    return {
      kind: 'TRAMITES',
      format: sourceFormat,
      fileName,
      requiresOcr: true,
      warnings: [OCR_REQUIRED_WARNING],
      items: [],
    }
  }

  const warnings: string[] = []
  const primaryNorm = normalizeForMatch(nonEmptyPages[0])
  const allNorm = normalizeForMatch(nonEmptyPages.join('\n'))

  const tipoTramiteHint = detectTipoTramiteHint(allNorm, fileName)

  const rawCuenta =
    extractPdfCuenta(primaryNorm) || extractPdfCuenta(allNorm)
  const rawNombre =
    extractPdfNombreAlumno(primaryNorm) || extractPdfNombreAlumno(allNorm)
  const rawClaveUa =
    extractPdfClaveUa(primaryNorm, '') ||
    extractPdfClaveUa(allNorm, fileName)
  const rawNombreUa =
    extractPdfNombreUa(primaryNorm) || extractPdfNombreUa(allNorm)
  const rawClaveProg =
    extractPdfClavePrograma(primaryNorm) || extractPdfClavePrograma(allNorm)
  const rawNombreProg =
    extractPdfNombrePrograma(primaryNorm) || extractPdfNombrePrograma(allNorm)
  const rawFolio = extractPdfFolio(primaryNorm) || extractPdfFolio(allNorm)
  const fechaRegistro = extractPdfFecha(primaryNorm) || extractPdfFecha(allNorm)

  const cuentaSafe = sanitizeSafeField(rawCuenta)
  const nombreSafe = sanitizeSafeField(rawNombre)
  const folioSafe = sanitizeSafeField(rawFolio.toUpperCase())

  if (cuentaSafe.rejected || nombreSafe.rejected || folioSafe.rejected) {
    warnings.push(
      'Se omitieron caracteres o secuencias no permitidas en el texto extraido.'
    )
  }

  if (!cuentaSafe.safeValue) {
    warnings.push('No se detecto el numero de cuenta en el documento.')
  }
  if (!nombreSafe.safeValue) {
    warnings.push('No se detecto el nombre del alumno en el documento.')
  }
  if (!rawClaveUa && !rawNombreUa) {
    warnings.push('No se detecto la clave de Unidad Academica (CUA).')
  }
  if (!rawClaveProg && !rawNombreProg) {
    warnings.push(
      'No se especifico clave de programa o carrera en el PDF; seleccionala manualmente.'
    )
  }

  const sourceLabel =
    sourceFormat === 'IMAGE'
      ? 'Imagen (OCR)'
      : nonEmptyPages.length > 1
        ? 'PDF (Pag. 1)'
        : 'PDF'

  const item: ExtractedTramiteDraft = {
    sourceLabel,
    tipoTramiteHint,
    numeroCuenta: cuentaSafe.safeValue,
    nombreAlumno: nombreSafe.safeValue,
    claveUa: rawClaveUa,
    nombreUa: rawNombreUa,
    clavePrograma: rawClaveProg,
    nombrePrograma: rawNombreProg,
    folio: folioSafe.safeValue,
    fechaRegistro,
    observaciones: '',
    warnings,
  }

  return {
    kind: 'TRAMITES',
    format: sourceFormat,
    fileName,
    requiresOcr: false,
    warnings: [],
    items: [item],
  }
}

function normalizeHeaderCell(cell: string): string {
  return normalizeForMatch(cell).replace(/[:._]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function isRowEmpty(row: string[]): boolean {
  return row.every((cell) => cleanExtractedText(cell).length === 0)
}

function findFichasHeaderRow(
  rows: string[][]
): { rowIndex: number; colMap: Map<string, number> } | null {
  const limit = Math.min(rows.length, 15)
  for (let r = 0; r < limit; r++) {
    const colMap = new Map<string, number>()
    rows[r].forEach((cell, cIdx) => {
      const h = normalizeHeaderCell(cell)
      if (!h || colMap.has(h)) return
      colMap.set(h, cIdx)
    })

    const hasCurp = colMap.has('CURP')
    const hasNombreOrPaterno =
      colMap.has('NOMBRE') || colMap.has('A PATERNO')
    if (hasCurp && hasNombreOrPaterno) {
      return { rowIndex: r, colMap }
    }
  }
  return null
}

function normalizeClaveProg(raw: string): string {
  const trimmed = cleanExtractedText(raw).replace(/^0+(\d)/, '$1')
  return trimmed
}

function parseFichasSheet(
  sheet: ExcelSheetMatrix
): { items: ExtractedFichaDraft[]; globalWarnings: string[] } {
  const headerInfo = findFichasHeaderRow(sheet.rows)
  if (!headerInfo) {
    return { items: [], globalWarnings: [] }
  }

  const getCell = (row: string[], keys: string[]): string => {
    for (const key of keys) {
      const idx = headerInfo.colMap.get(key)
      if (idx !== undefined && row[idx] !== undefined) {
        return cleanExtractedText(row[idx])
      }
    }
    return ''
  }

  const items: ExtractedFichaDraft[] = []
  const globalWarnings: string[] = []

  for (let r = headerInfo.rowIndex + 1; r < sheet.rows.length; r++) {
    const row = sheet.rows[r]
    if (!row || isRowEmpty(row)) continue

    const curpRaw = getCell(row, ['CURP']).toUpperCase()
    const nombreRaw = getCell(row, ['NOMBRE'])
    if (!curpRaw && !nombreRaw) continue

    const rowWarnings: string[] = []
    const curpSafe = sanitizeSafeField(curpRaw)
    const paternoSafe = sanitizeSafeField(getCell(row, ['A PATERNO']))
    const maternoSafe = sanitizeSafeField(getCell(row, ['A MATERNO']))
    const nombreSafe = sanitizeSafeField(nombreRaw)

    if (
      curpSafe.rejected ||
      paternoSafe.rejected ||
      maternoSafe.rejected ||
      nombreSafe.rejected
    ) {
      rowWarnings.push('Se omitieron caracteres no permitidos en una o mas columnas.')
    }

    const sexoRaw = getCell(row, ['SEXO']).toUpperCase()
    const sexo: '1' | '2' =
      sexoRaw === '2' || sexoRaw.startsWith('F') ? '2' : '1'

    const claveEscuela = getCell(row, ['ESCUELA', 'CLAVE UA', 'UA']).replace(/\D+/g, '')
    const claveCarrera = normalizeClaveProg(
      getCell(row, ['CARRERA', 'CLAVE PROGRAMA', 'PROGRAMA'])
    )

    const fechaNacimiento = parseDocumentDate(
      getCell(row, ['FECHA NAC', 'FECHA NACIMIENTO'])
    )
    if (!fechaNacimiento) {
      rowWarnings.push('No se pudo interpretar FECHA NAC como YYYY-MM-DD.')
    }

    const celularDigits = getCell(row, ['CELULAR', 'TELEFONO']).replace(/\D+/g, '')
    const correoRaw = getCell(row, ['CORREO', 'EMAIL']).toLowerCase()
    const emailValidation = validateEmail(correoRaw)
    if (correoRaw && !emailValidation.valid) {
      rowWarnings.push('El correo extraido no cumple el formato esperado.')
    }

    items.push({
      sourceLabel: `Hoja "${sheet.name}" · Fila ${r + 1}`,
      curp: curpSafe.safeValue,
      aPaterno: paternoSafe.safeValue.toUpperCase(),
      aMaterno: maternoSafe.safeValue.toUpperCase(),
      nombre: nombreSafe.safeValue.toUpperCase(),
      sexo,
      claveEscuela,
      claveCarrera,
      fechaNacimiento,
      celular: celularDigits,
      correo: emailValidation.valid ? emailValidation.email : '',
      warnings: rowWarnings,
    })
  }

  return { items, globalWarnings }
}

function findTabularTramiteHeaderRow(rows: string[][]): {
  rowIndex: number
  cuentaIdx: number
  nombreIdx: number
  claveUaIdx: number
  nombreUaIdx: number
  claveProgIdx: number
  nombreProgIdx: number
  folioIdx: number
  fechaIdx: number
} | null {
  const limit = Math.min(rows.length, 15)
  for (let r = 0; r < limit; r++) {
    const normalizedHeaders = rows[r].map((c) => normalizeHeaderCell(c))
    const cuentaIdx = normalizedHeaders.findIndex(
      (h) =>
        h === 'NUMERO DE CUENTA' ||
        h === 'NO DE CUENTA' ||
        h === 'NUM CTA' ||
        h === 'NCTA'
    )
    const nombreIdx = normalizedHeaders.findIndex(
      (h) =>
        h === 'NOMBRE' ||
        h === 'NOMBRE DEL ALUMNO' ||
        h === 'NOMBRE ALUM' ||
        h === 'ALUMNO'
    )

    if (cuentaIdx >= 0 && nombreIdx >= 0) {
      return {
        rowIndex: r,
        cuentaIdx,
        nombreIdx,
        claveUaIdx: normalizedHeaders.findIndex(
          (h) => h === 'CLAVE UA' || h === 'CUA' || h === 'ESCUELA'
        ),
        nombreUaIdx: normalizedHeaders.findIndex(
          (h) => h === 'NOMBRE UA' || h === 'UNIDAD ACADEMICA'
        ),
        claveProgIdx: normalizedHeaders.findIndex(
          (h) => h === 'CLAVE PROGRAMA' || h === 'CPE' || h === 'CARRERA'
        ),
        nombreProgIdx: normalizedHeaders.findIndex(
          (h) => h === 'PROGRAMA EDUCATIVO' || h === 'NOMBRE PROGRAMA'
        ),
        folioIdx: normalizedHeaders.findIndex((h) => h === 'FOLIO'),
        fechaIdx: normalizedHeaders.findIndex(
          (h) => h === 'FECHA' || h === 'FECHA REGISTRO'
        ),
      }
    }
  }
  return null
}

function splitCodeAndName(raw: string): { code: string; name: string } {
  const cleaned = cleanExtractedText(raw)
  const match = cleaned.match(/^(\d{1,4})\s*[:.-]?\s*(.+)$/)
  if (match) {
    return { code: String(Number(match[1])), name: match[2].trim() }
  }
  if (/^\d{1,4}$/.test(cleaned)) {
    return { code: String(Number(cleaned)), name: '' }
  }
  return { code: '', name: cleaned }
}

function parseKeyValueTramiteSheet(
  sheet: ExcelSheetMatrix,
  fileName: string
): ExtractedTramiteDraft | null {
  const topLines = sheet.rows
    .slice(0, 12)
    .map((r) => r.map((c) => cleanExtractedText(c)).filter(Boolean).join(' '))
    .join(' ')

  let hasOrigenAndDestino = false
  let hasOrigen = false
  let hasDestino = false

  let numeroCuenta = ''
  let nombreAlumno = ''
  let claveUa = ''
  let nombreUa = ''
  let origenUa = ''
  let destinoUa = ''
  let clavePrograma = ''
  let nombrePrograma = ''
  let origenPrograma = ''
  let destinoPrograma = ''
  let folio = ''
  let fechaRegistro = ''

  for (let r = 0; r < Math.min(sheet.rows.length, 40); r++) {
    const row = sheet.rows[r]
    if (!row || isRowEmpty(row)) continue

    for (let c = 0; c < row.length; c++) {
      const cell = cleanExtractedText(row[c])
      if (!cell) continue

      let labelRaw = cell
      let inlineValue = ''
      const inlineColon = cell.match(/^([^:]{3,40}):\s*(.+)$/)
      if (inlineColon) {
        labelRaw = inlineColon[1]
        inlineValue = inlineColon[2].trim()
      }

      const labelNorm = normalizeHeaderCell(labelRaw)
      const rightValue =
        inlineValue ||
        row
          .slice(c + 1)
          .map((v) => cleanExtractedText(v))
          .find((v) => v.length > 0) ||
        ''

      if (!rightValue) continue

      if (
        labelNorm === 'NUMERO DE CUENTA' ||
        labelNorm === 'NO DE CUENTA' ||
        labelNorm === 'NUM CTA' ||
        labelNorm === 'NCTA'
      ) {
        numeroCuenta = numeroCuenta || rightValue
      } else if (
        labelNorm === 'NOMBRE DEL ALUMNO' ||
        labelNorm === 'NOMBRE ALUM' ||
        labelNorm === 'NOMBRE' ||
        labelNorm === 'ALUMNO'
      ) {
        nombreAlumno = nombreAlumno || rightValue
      } else if (labelNorm === 'CLAVE UA' || labelNorm === 'CUA') {
        claveUa = claveUa || rightValue
      } else if (labelNorm === 'ESCUELA DE DESTINO') {
        hasDestino = true
        destinoUa = destinoUa || rightValue
      } else if (labelNorm === 'ESCUELA DE ORIGEN' || labelNorm === 'ESCUELA') {
        if (labelNorm === 'ESCUELA DE ORIGEN') hasOrigen = true
        origenUa = origenUa || rightValue
      } else if (labelNorm === 'CARRERA DESTINO' || labelNorm === 'CARRERA DE DESTINO') {
        hasDestino = true
        destinoPrograma = destinoPrograma || rightValue
      } else if (labelNorm === 'CARRERA DE ORIGEN') {
        hasOrigen = true
        origenPrograma = origenPrograma || rightValue
      } else if (labelNorm === 'CARRERA' || labelNorm === 'CPE') {
        if (!clavePrograma && !nombrePrograma) {
          const split = splitCodeAndName(rightValue)
          clavePrograma = split.code
          nombrePrograma = split.name
        }
      } else if (
        labelNorm === 'FOLIO' ||
        labelNorm === 'FOLIO DEL RECIBO' ||
        labelNorm === 'FOLIO DE PAGO' ||
        labelNorm === 'FOLIO DE LA HOJA DE PAGO'
      ) {
        if (/\d/.test(rightValue)) {
          folio = folio || rightValue
        }
      } else if (labelNorm === 'FECHA' || labelNorm === 'FECHA DE REGISTRO') {
        fechaRegistro = fechaRegistro || parseDocumentDate(rightValue)
      }
    }
  }

  if (hasOrigen && hasDestino) {
    hasOrigenAndDestino = true
  }

  const uaSource = destinoUa || origenUa
  if (uaSource) {
    const splitUa = splitCodeAndName(uaSource)
    if (!claveUa && splitUa.code.length === 4) {
      claveUa = splitUa.code
    }
    if (!nombreUa && splitUa.name) {
      nombreUa = normalizeForMatch(splitUa.name)
    } else if (!nombreUa && !splitUa.code) {
      nombreUa = normalizeForMatch(uaSource)
    }
  }

  const progSource = destinoPrograma || origenPrograma
  if (progSource) {
    const splitProg = splitCodeAndName(progSource)
    clavePrograma = clavePrograma || splitProg.code
    nombrePrograma = nombrePrograma || normalizeForMatch(splitProg.name)
  }

  if (!claveUa) {
    claveUa = extractUaCodeFromFileName(fileName)
  }

  const cuentaSafe = sanitizeSafeField(numeroCuenta)
  const nombreSafe = sanitizeSafeField(normalizeStudentName(nombreAlumno))
  const folioSafe = sanitizeSafeField(folio.toUpperCase())

  if (!cuentaSafe.safeValue && !nombreSafe.safeValue) {
    return null
  }

  let tipoTramiteHint = detectTipoTramiteHint(
    `${topLines} ${sheet.name}`,
    fileName
  )
  if (tipoTramiteHint === 'DESCONOCIDO' && hasOrigenAndDestino) {
    tipoTramiteHint = 'MIGRACION_CALIFICACIONES'
  }

  const itemWarnings: string[] = []
  if (cuentaSafe.rejected || nombreSafe.rejected || folioSafe.rejected) {
    itemWarnings.push('Se omitieron caracteres no permitidos en una o mas celdas.')
  }
  if (!cuentaSafe.safeValue) {
    itemWarnings.push('Falta el numero de cuenta en esta hoja.')
  }
  if (!nombreSafe.safeValue) {
    itemWarnings.push('Falta el nombre del alumno en esta hoja.')
  }

  return {
    sourceLabel: `Hoja "${sheet.name}"`,
    tipoTramiteHint,
    numeroCuenta: cuentaSafe.safeValue,
    nombreAlumno: nombreSafe.safeValue,
    claveUa,
    nombreUa,
    clavePrograma: normalizeClaveProg(clavePrograma),
    nombrePrograma,
    folio: folioSafe.safeValue,
    fechaRegistro,
    observaciones: '',
    warnings: itemWarnings,
  }
}

/**
 * Extrae borradores de Fichas o Tramites desde las matrices de hojas de un archivo Excel (.xlsx).
 */
export function parseDocumentFromExcelSheets(
  sheets: ExcelSheetMatrix[],
  fileName: string
): DocumentExtractionResult {
  const fichasItems: ExtractedFichaDraft[] = []
  const fichasWarnings: string[] = []

  for (const sheet of sheets) {
    const parsed = parseFichasSheet(sheet)
    if (parsed.items.length > 0) {
      fichasItems.push(...parsed.items)
      fichasWarnings.push(...parsed.globalWarnings)
    }
  }

  if (fichasItems.length > 0) {
    return {
      kind: 'FICHAS',
      format: 'XLSX',
      fileName,
      requiresOcr: false,
      warnings: fichasWarnings,
      items: fichasItems,
    }
  }

  const tramiteItems: ExtractedTramiteDraft[] = []
  const fallbackUaFromName = extractUaCodeFromFileName(fileName)

  for (const sheet of sheets) {
    const header = findTabularTramiteHeaderRow(sheet.rows)
    if (header) {
      const preHeaderText = sheet.rows
        .slice(0, header.rowIndex)
        .map((r) => r.map((c) => cleanExtractedText(c)).filter(Boolean).join(' '))
        .join(' ')
      const hint = detectTipoTramiteHint(
        `${preHeaderText} ${sheet.name}`,
        fileName
      )

      for (let r = header.rowIndex + 1; r < sheet.rows.length; r++) {
        const row = sheet.rows[r]
        if (!row || isRowEmpty(row)) continue

        const rawCuenta = cleanExtractedText(row[header.cuentaIdx] ?? '')
        const rawNombre = cleanExtractedText(row[header.nombreIdx] ?? '')
        if (!rawCuenta && !rawNombre) continue

        const cuentaSafe = sanitizeSafeField(rawCuenta)
        const nombreSafe = sanitizeSafeField(normalizeStudentName(rawNombre))
        const rawUa =
          header.claveUaIdx >= 0
            ? cleanExtractedText(row[header.claveUaIdx] ?? '')
            : ''
        const rawNombreUa =
          header.nombreUaIdx >= 0
            ? normalizeForMatch(row[header.nombreUaIdx] ?? '')
            : ''
        const rawProg =
          header.claveProgIdx >= 0
            ? normalizeClaveProg(row[header.claveProgIdx] ?? '')
            : ''
        const rawNombreProg =
          header.nombreProgIdx >= 0
            ? normalizeForMatch(row[header.nombreProgIdx] ?? '')
            : ''
        const rawFolio =
          header.folioIdx >= 0
            ? cleanExtractedText(row[header.folioIdx] ?? '').toUpperCase()
            : ''
        const folioSafe = sanitizeSafeField(rawFolio)
        const rawFecha =
          header.fechaIdx >= 0
            ? parseDocumentDate(row[header.fechaIdx] ?? '')
            : ''

        const rowWarnings: string[] = []
        if (cuentaSafe.rejected || nombreSafe.rejected || folioSafe.rejected) {
          rowWarnings.push('Se omitieron caracteres no permitidos en una fila.')
        }

        tramiteItems.push({
          sourceLabel: `Hoja "${sheet.name}" · Fila ${r + 1}`,
          tipoTramiteHint: hint,
          numeroCuenta: cuentaSafe.safeValue,
          nombreAlumno: nombreSafe.safeValue,
          claveUa: rawUa || fallbackUaFromName,
          nombreUa: rawNombreUa,
          clavePrograma: rawProg,
          nombrePrograma: rawNombreProg,
          folio: folioSafe.safeValue,
          fechaRegistro: rawFecha,
          observaciones: '',
          warnings: rowWarnings,
        })
      }
      continue
    }

    const kvDraft = parseKeyValueTramiteSheet(sheet, fileName)
    if (kvDraft) {
      tramiteItems.push(kvDraft)
    }
  }

  if (tramiteItems.length === 0) {
    return {
      kind: 'TRAMITES',
      format: 'XLSX',
      fileName,
      requiresOcr: false,
      warnings: [
        'No se encontraron registros reconocibles en las hojas del archivo Excel.',
      ],
      items: [],
    }
  }

  return {
    kind: 'TRAMITES',
    format: 'XLSX',
    fileName,
    requiresOcr: false,
    warnings: [],
    items: tramiteItems,
  }
}

function significantWords(text: string): string[] {
  return normalizeForMatch(text)
    .split(/[^A-Z0-9]+/)
    .filter((word) => word.length >= 4 && !STOP_SIGNIFICANT_WORDS.has(word))
}

function matchUnidadCatalogo(
  claveUa: string,
  nombreUa: string,
  unidades: CatalogMatchOptions['unidades']
): CatalogMatchOptions['unidades'][number] | null {
  const cleanClave = cleanExtractedText(claveUa)
  if (cleanClave) {
    const byClave = unidades.find(
      (u) =>
        cleanExtractedText(u.claveUa) === cleanClave ||
        u.claveUa.replace(/^0+/, '') === cleanClave.replace(/^0+/, '')
    )
    if (byClave) return byClave
  }

  const targetNorm = normalizeForMatch(nombreUa)
  if (!targetNorm) return null

  const exact = unidades.find((u) => normalizeForMatch(u.nombre) === targetNorm)
  if (exact) return exact

  const includesMatches = unidades.filter((u) => {
    const uNorm = normalizeForMatch(u.nombre)
    return uNorm.includes(targetNorm) || targetNorm.includes(uNorm)
  })
  if (includesMatches.length === 1) {
    return includesMatches[0]
  }

  const targetWords = significantWords(targetNorm)
  if (targetWords.length >= 2) {
    let bestUnidad: CatalogMatchOptions['unidades'][number] | null = null
    let bestScore = 0
    let tie = false

    for (const u of unidades) {
      const uWords = new Set(significantWords(u.nombre))
      const overlap = targetWords.filter((w) => uWords.has(w)).length
      if (overlap >= 2) {
        if (overlap > bestScore) {
          bestScore = overlap
          bestUnidad = u
          tie = false
        } else if (overlap === bestScore) {
          tie = true
        }
      }
    }

    if (bestUnidad && !tie) {
      return bestUnidad
    }
  }

  return null
}

function matchProgramaCatalogo(
  unidadId: number,
  clavePrograma: string,
  nombrePrograma: string,
  programas: CatalogMatchOptions['programas']
): CatalogMatchOptions['programas'][number] | null {
  const deUnidad = programas.filter((p) => p.unidadAcademicaId === unidadId)
  if (deUnidad.length === 0) return null

  const cleanClave = normalizeClaveProg(clavePrograma)
  if (cleanClave) {
    const byClave = deUnidad.find(
      (p) => normalizeClaveProg(p.clavePrograma) === cleanClave
    )
    if (byClave) return byClave
  }

  const targetNorm = normalizeForMatch(nombrePrograma)
  if (targetNorm) {
    const exact = deUnidad.find((p) => normalizeForMatch(p.nombre) === targetNorm)
    if (exact) return exact

    const wantsVirtual = targetNorm.includes('VIRTUAL')
    const includesMatches = deUnidad.filter((p) => {
      const pNorm = normalizeForMatch(p.nombre)
      return pNorm.includes(targetNorm) || targetNorm.includes(pNorm)
    })
    if (includesMatches.length === 1) {
      return includesMatches[0]
    }
    if (includesMatches.length > 1) {
      const virtualFiltered = includesMatches.filter(
        (p) => normalizeForMatch(p.nombre).includes('VIRTUAL') === wantsVirtual
      )
      if (virtualFiltered.length === 1) return virtualFiltered[0]
    }

    const targetWords = significantWords(targetNorm)
    if (targetWords.length >= 1) {
      let bestProg: CatalogMatchOptions['programas'][number] | null = null
      let bestScore = 0
      let tie = false

      for (const p of deUnidad) {
        const pNorm = normalizeForMatch(p.nombre)
        const pWords = new Set(significantWords(pNorm))
        let score = targetWords.filter((w) => pWords.has(w)).length
        if (score > 0 && pNorm.includes('VIRTUAL') === wantsVirtual) {
          score += 1
        }
        if (score > bestScore) {
          bestScore = score
          bestProg = p
          tie = false
        } else if (score === bestScore && score > 0) {
          tie = true
        }
      }

      if (bestProg && bestScore >= 2 && !tie) {
        return bestProg
      }
    }
  }

  if (deUnidad.length === 1) {
    return deUnidad[0]
  }

  return null
}

function matchTipoTramiteGeneral(
  hint: TramiteTipoHint,
  tiposTramite: CatalogMatchOptions['tiposTramite']
): CatalogMatchOptions['tiposTramite'][number] | null {
  const generales = tiposTramite.filter((t) => t.modulo === 'TRAMITES_GENERALES')
  if (generales.length === 0 || hint === 'DESCONOCIDO') return null

  const findByTokens = (tokens: string[]) =>
    generales.find((t) => {
      const n = normalizeForMatch(t.nombre)
      return tokens.every((tok) => n.includes(tok))
    }) ?? null

  switch (hint) {
    case 'EXAMENES_ESPECIALES':
      return findByTokens(['EXAMEN', 'ESPECIAL'])
    case 'COMPLEMENTARIAS':
      return findByTokens(['COMPLEMENTARIA'])
    case 'CONVALIDACION':
      return findByTokens(['CONVALIDA'])
    case 'MIGRACION_CALIFICACIONES':
      return findByTokens(['MIGRACION'])
    case 'CORRECCION_CALIFICACION':
      return findByTokens(['CORRECCION'])
    case 'CERTIFICADO':
      return findByTokens(['CERTIFICAD'])
    case 'DICTAMENES_ESPECIALES':
      return findByTokens(['DICTAMEN'])
    case 'ANULAR_FOLIO':
      return findByTokens(['ANULAR', 'FOLIO'])
    default:
      return null
  }
}

/**
 * Empareja los campos extraidos de un tramite contra los catalogos activos de la app.
 */
export function resolveCatalogMatchesForTramite(
  draft: ExtractedTramiteDraft,
  catalogos: CatalogMatchOptions
): CatalogMatchResult {
  const warnings: string[] = []

  const matchedTipo = matchTipoTramiteGeneral(
    draft.tipoTramiteHint,
    catalogos.tiposTramite
  )
  if (!matchedTipo) {
    warnings.push(
      'No se pudo identificar automaticamente el tipo de tramite en el catalogo; seleccionalo manualmente.'
    )
  }

  const matchedUnidad = matchUnidadCatalogo(
    draft.claveUa,
    draft.nombreUa,
    catalogos.unidades
  )
  if (!matchedUnidad) {
    warnings.push(
      draft.claveUa || draft.nombreUa
        ? `No se encontro la Unidad Academica "${draft.claveUa || draft.nombreUa}" en el catalogo.`
        : 'Selecciona la Unidad Academica manualmente.'
    )
  }

  let matchedPrograma: CatalogMatchOptions['programas'][number] | null = null
  if (matchedUnidad) {
    matchedPrograma = matchProgramaCatalogo(
      matchedUnidad.id,
      draft.clavePrograma,
      draft.nombrePrograma,
      catalogos.programas
    )
    if (!matchedPrograma) {
      warnings.push(
        draft.clavePrograma || draft.nombrePrograma
          ? `No se encontro la carrera "${draft.clavePrograma || draft.nombrePrograma}" para la UA ${matchedUnidad.claveUa}.`
          : `Selecciona el Programa Educativo para la UA ${matchedUnidad.claveUa}.`
      )
    }
  }

  return {
    tipoTramiteId: matchedTipo ? matchedTipo.id : null,
    unidadAcademicaId: matchedUnidad ? matchedUnidad.id : null,
    programaId: matchedPrograma ? matchedPrograma.id : null,
    warnings,
  }
}

/**
 * Empareja los campos extraidos de una ficha de Nuevo Ingreso contra los catalogos activos.
 */
export function resolveCatalogMatchesForFicha(
  draft: ExtractedFichaDraft,
  catalogos: CatalogMatchOptions
): CatalogMatchResult {
  const warnings: string[] = []
  const niTipo =
    catalogos.tiposTramite.find((t) => t.modulo === 'NUEVO_INGRESO') ?? null

  if (!niTipo) {
    warnings.push(
      'Tu rol o catalogo actual no tiene habilitado el tramite de Nuevo Ingreso.'
    )
  }

  const matchedUnidad = matchUnidadCatalogo(
    draft.claveEscuela,
    '',
    catalogos.unidades
  )
  if (!matchedUnidad) {
    warnings.push(
      draft.claveEscuela
        ? `No se encontro la escuela con clave "${draft.claveEscuela}" en el catalogo.`
        : 'Selecciona la escuela (ESCUELA) manualmente.'
    )
  }

  let matchedPrograma: CatalogMatchOptions['programas'][number] | null = null
  if (matchedUnidad) {
    matchedPrograma = matchProgramaCatalogo(
      matchedUnidad.id,
      draft.claveCarrera,
      '',
      catalogos.programas
    )
    if (!matchedPrograma) {
      warnings.push(
        draft.claveCarrera
          ? `No se encontro la carrera "${draft.claveCarrera}" para la escuela ${matchedUnidad.claveUa}.`
          : `Selecciona la carrera (CARRERA) para la escuela ${matchedUnidad.claveUa}.`
      )
    }
  }

  return {
    tipoTramiteId: niTipo ? niTipo.id : null,
    unidadAcademicaId: matchedUnidad ? matchedUnidad.id : null,
    programaId: matchedPrograma ? matchedPrograma.id : null,
    warnings,
  }
}
