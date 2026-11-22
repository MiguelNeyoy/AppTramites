import ExcelJS from 'exceljs'

import { AppServiceError } from '../shared'
import {
  cleanExtractedText,
  parseDocumentFromExcelSheets,
  parseTramiteFromPdfPages,
  type DocumentExtractionResult,
  type ExcelSheetMatrix,
} from './documentParsers.ts'

const MAX_PDF_PAGES = 5
const MAX_EXCEL_ROWS_PER_SHEET = 300
const MAX_EXCEL_COLS_PER_SHEET = 16
const MAX_FILE_SIZE_BYTES = 120 * 1024 * 1024

function formatUtcDate(date: Date): string {
  if (Number.isNaN(date.getTime())) return ''
  const year = String(date.getUTCFullYear()).padStart(4, '0')
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Normaliza cualquier tipo de celda ExcelJS a texto plano seguro.
 */
export function formatExcelCellValue(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) {
    return ''
  }

  if (value instanceof Date) {
    return formatUtcDate(value)
  }

  if (typeof value === 'object') {
    if ('result' in value && value.result !== undefined) {
      return formatExcelCellValue(value.result as ExcelJS.CellValue)
    }
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join('').trim()
    }
    if ('text' in value && typeof value.text === 'string') {
      return value.text.trim()
    }
    if ('error' in value) {
      return ''
    }
    return ''
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim()
  }

  return ''
}

/**
 * Extrae matrices de texto por hoja desde un ArrayBuffer .xlsx acotando filas con formato vacio.
 */
export async function extractExcelMatricesFromBuffer(
  buffer: ArrayBuffer
): Promise<ExcelSheetMatrix[]> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  const matrices: ExcelSheetMatrix[] = []

  for (const worksheet of workbook.worksheets) {
    const rowLimit = Math.min(worksheet.rowCount, MAX_EXCEL_ROWS_PER_SHEET)
    const rows: string[][] = []

    for (let r = 1; r <= rowLimit; r++) {
      const row = worksheet.getRow(r)
      const colLimit = Math.min(
        Math.max(row.cellCount, MAX_EXCEL_COLS_PER_SHEET),
        MAX_EXCEL_COLS_PER_SHEET
      )
      const cells: string[] = []
      for (let c = 1; c <= colLimit; c++) {
        cells.push(formatExcelCellValue(row.getCell(c).value))
      }
      rows.push(cells)
    }

    matrices.push({
      name: worksheet.name,
      rows,
    })
  }

  return matrices
}

/**
 * Extrae el texto de las primeras paginas de un PDF usando pdfjs-dist en el navegador.
 */
export async function extractPdfPagesFromBuffer(
  buffer: ArrayBuffer
): Promise<string[]> {
  const [pdfjsLib, workerUrlMod] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ])
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrlMod.default

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    verbosity: pdfjsLib.VerbosityLevel.ERRORS,
  })

  try {
    const pdfDoc = await loadingTask.promise
    const pageLimit = Math.min(pdfDoc.numPages, MAX_PDF_PAGES)
    const pages: string[] = []

    for (let pageNumber = 1; pageNumber <= pageLimit; pageNumber++) {
      const page = await pdfDoc.getPage(pageNumber)
      const textContent = await page.getTextContent()
      const joined = textContent.items
        .map((item) =>
          'str' in item && typeof item.str === 'string' ? item.str : ''
        )
        .join(' ')
      pages.push(cleanExtractedText(joined))
    }

    return pages
  } finally {
    await loadingTask.destroy()
  }
}

/**
 * Lee un archivo .pdf o .xlsx en el navegador y extrae datos estructurados para prellenar el formulario.
 */
export async function extractDocumentFromFile(
  file: File
): Promise<DocumentExtractionResult> {
  if (!file) {
    throw new AppServiceError(
      'VALIDATION_ERROR',
      'Selecciona un archivo PDF o Excel (.xlsx) para leer.'
    )
  }

  if (file.size <= 0) {
    throw new AppServiceError(
      'VALIDATION_ERROR',
      'El archivo seleccionado esta vacio.'
    )
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new AppServiceError(
      'VALIDATION_ERROR',
      'El archivo supera el tamano maximo permitido (120 MB).'
    )
  }

  const lowerName = file.name.toLowerCase()
  const isPdf = lowerName.endsWith('.pdf') || file.type === 'application/pdf'
  const isXlsx =
    lowerName.endsWith('.xlsx') ||
    file.type ===
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

  if (!isPdf && !isXlsx) {
    throw new AppServiceError(
      'VALIDATION_ERROR',
      'Formato no compatible. Selecciona un documento .pdf o .xlsx.'
    )
  }

  try {
    const buffer = await file.arrayBuffer()
    if (isPdf) {
      const pages = await extractPdfPagesFromBuffer(buffer)
      return parseTramiteFromPdfPages(pages, file.name)
    }

    const sheets = await extractExcelMatricesFromBuffer(buffer)
    return parseDocumentFromExcelSheets(sheets, file.name)
  } catch (error) {
    if (error instanceof AppServiceError) {
      throw error
    }
    throw new AppServiceError(
      'UNKNOWN_ERROR',
      `No se pudo leer el archivo "${file.name}". Verifica que no este danado ni protegido con contrasena.`
    )
  }
}
