import ExcelJS from 'exceljs'

import {
  formatFechaExcel,
  type FichaNuevoIngresoRecord,
} from './fichasValidation.ts'

export const NUEVO_INGRESO_SHEET_NAME = 'NUEVO INGRESO'

export const NUEVO_INGRESO_EXCEL_HEADERS = [
  'CURP',
  'A_Paterno',
  'A_Materno',
  'NOMBRE',
  'SEXO',
  'ESCUELA',
  'CARRERA',
  'FECHA NAC',
  'CELULAR',
  'CORREO',
] as const

const COLUMN_WIDTHS = [24, 20, 20, 24, 14, 18, 16, 16, 16, 30] as const

export interface FichasExcelExportOptions {
  cicloLabel?: string
  fileName?: string
}

/**
 * Construye el libro ExcelJS con el formato oficial de CLAVE UA - NUEVO INGRESO 2026.xlsx.
 */
export function buildFichasWorkbook(
  fichas: FichaNuevoIngresoRecord[],
  options?: FichasExcelExportOptions
): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'TramitesUAS'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet(NUEVO_INGRESO_SHEET_NAME)
  const ciclo = options?.cicloLabel?.trim() || '2026-2027'

  // Fila 1: Titulo oficial
  sheet.getCell('A1').value =
    `SIN PROCESO, SIN PAGO (FICHA VENCIDA) O FICHA CANCELADA   ${ciclo}`
  sheet.getCell('A1').font = { bold: true, size: 11 }

  // Filas 2-3: Notas y catalogos de formato exactos del Excel institucional
  sheet.getCell('A2').value =
    'Nota: Respetar el nombre de los campos y no modificarlos'
  sheet.getCell('A2').font = { italic: true, size: 10 }

  sheet.getCell('E2').value = '1- Masculino'
  sheet.getCell('E3').value = '2.-Femenino'
  sheet.getCell('F2').value = 'Clave de 4 Dígitos'
  sheet.getCell('G2').value = 'Clave de 1 a 2 Dígitos'
  sheet.getCell('H2').value = 'AAAA/MM/DD'

  sheet.mergeCells('F2:F3')
  sheet.mergeCells('G2:G3')
  sheet.mergeCells('H2:H3')

  for (const ref of ['E2', 'E3', 'F2', 'G2', 'H2']) {
    const cell = sheet.getCell(ref)
    cell.font = { size: 9, bold: true }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
  }

  // Fila 4: Encabezados oficiales exactos (sin modificar nombres)
  const headerRow = sheet.getRow(4)
  headerRow.values = [...NUEVO_INGRESO_EXCEL_HEADERS]
  headerRow.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } }
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
  headerRow.height = 22

  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1A2742' },
    }
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    }
  })

  // Filas 5+: Registros nominales de aspirantes
  for (const ficha of fichas) {
    const row = sheet.addRow([
      ficha.curp,
      ficha.aPaterno,
      ficha.aMaterno,
      ficha.nombre,
      ficha.sexo,
      ficha.claveEscuela,
      ficha.claveCarrera,
      formatFechaExcel(ficha.fechaNacimiento),
      ficha.celular,
      ficha.correo,
    ])

    row.alignment = { vertical: 'middle' }
    for (const colIdx of [5, 6, 7, 8, 9]) {
      row.getCell(colIdx).alignment = {
        vertical: 'middle',
        horizontal: 'center',
      }
    }
  }

  COLUMN_WIDTHS.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width
  })

  return workbook
}

/**
 * Genera el buffer binario .xlsx en memoria (usable tanto en navegador como en Node tests).
 */
export async function buildFichasXlsxBuffer(
  fichas: FichaNuevoIngresoRecord[],
  options?: FichasExcelExportOptions
): Promise<ArrayBuffer> {
  const workbook = buildFichasWorkbook(fichas, options)
  return workbook.xlsx.writeBuffer()
}

/**
 * Descarga el archivo .xlsx oficial en el navegador del usuario.
 */
export async function downloadFichasXlsx(
  fichas: FichaNuevoIngresoRecord[],
  options?: FichasExcelExportOptions
): Promise<string> {
  const buffer = await buildFichasXlsxBuffer(fichas, options)
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const today = new Date().toISOString().slice(0, 10)
  const fileName =
    options?.fileName?.trim() || `CLAVE_UA_NUEVO_INGRESO_${today}.xlsx`

  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)

  return fileName
}
