import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'
import ExcelJS from 'exceljs'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'

import {
  cleanExtractedText,
  detectTipoTramiteHint,
  normalizeHomoglyphs,
  parseDocumentDate,
  parseDocumentFromExcelSheets,
  parseTramiteFromPdfPages,
  resolveCatalogMatchesForFicha,
  resolveCatalogMatchesForTramite,
  type CatalogMatchOptions,
  type ExcelSheetMatrix,
} from '../src/services/documentos/documentParsers.ts'

const SMB_BASE_DIR =
  '\\\\192.168.1.73\\Personal\\AppTramites\\InfoDeRequerimientos'

const SAMPLE_CATALOGOS: CatalogMatchOptions = {
  unidades: [
    {
      id: 1,
      claveUa: '8240',
      nombre: 'Preparatoria Mazatlán',
      nivel: 'BACHILLERATO',
    },
    {
      id: 6,
      claveUa: '4800',
      nombre: 'Facultad de Informática Mazatlán',
      nivel: 'LICENCIATURA',
    },
  ],
  programas: [
    {
      id: 101,
      unidadAcademicaId: 1,
      clavePrograma: '1',
      nombre: 'Bachillerato General Escolarizado',
    },
    {
      id: 601,
      unidadAcademicaId: 6,
      clavePrograma: '1',
      nombre: 'Licenciatura en Informática',
    },
    {
      id: 602,
      unidadAcademicaId: 6,
      clavePrograma: '4',
      nombre: 'Ing. en Sistemas de Información',
    },
    {
      id: 603,
      unidadAcademicaId: 6,
      clavePrograma: '5',
      nombre: 'Licenciatura en Informática (Virtual)',
    },
  ],
  tiposTramite: [
    { id: 1, nombre: 'Exámenes especiales', modulo: 'TRAMITES_GENERALES', permitePdf: false },
    { id: 3, nombre: 'Convalidación', modulo: 'TRAMITES_GENERALES', permitePdf: false },
    { id: 5, nombre: 'Complementarias', modulo: 'TRAMITES_GENERALES', permitePdf: true },
    { id: 8, nombre: 'Migración de calificaciones', modulo: 'TRAMITES_GENERALES', permitePdf: false },
    { id: 9, nombre: 'Fichas de nuevo ingreso', modulo: 'NUEVO_INGRESO', permitePdf: false },
  ],
}

function formatCellForTest(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }
  if (typeof value === 'object') {
    if ('result' in value && value.result !== undefined) {
      return formatCellForTest(value.result as ExcelJS.CellValue)
    }
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join('').trim()
    }
    if ('text' in value && typeof value.text === 'string') {
      return value.text.trim()
    }
    return ''
  }
  return String(value).trim()
}

async function readXlsxMatrices(filePath: string): Promise<ExcelSheetMatrix[]> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(filePath)
  const sheets: ExcelSheetMatrix[] = []

  for (const ws of wb.worksheets) {
    const rowLimit = Math.min(ws.rowCount, 300)
    const rows: string[][] = []
    for (let r = 1; r <= rowLimit; r++) {
      const row = ws.getRow(r)
      const colLimit = Math.min(Math.max(row.cellCount, 16), 16)
      const cells: string[] = []
      for (let c = 1; c <= colLimit; c++) {
        cells.push(formatCellForTest(row.getCell(c).value))
      }
      rows.push(cells)
    }
    sheets.push({ name: ws.name, rows })
  }

  return sheets
}

async function readPdfPages(filePath: string): Promise<string[]> {
  const buf = fs.readFileSync(filePath)
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buf),
    verbosity: pdfjsLib.VerbosityLevel.ERRORS,
  })
  try {
    const doc = await loadingTask.promise
    const pages: string[] = []
    for (let p = 1; p <= Math.min(doc.numPages, 5); p++) {
      const page = await doc.getPage(p)
      const textContent = await page.getTextContent()
      const text = textContent.items
        .map((item) =>
          'str' in item && typeof item.str === 'string' ? item.str : ''
        )
        .join(' ')
      pages.push(cleanExtractedText(text))
    }
    return pages
  } finally {
    await loadingTask.destroy()
  }
}

describe('documentParsers - normalizacion de fechas, homoglyphs y deteccion de tramite', () => {
  it('convierte fechas ISO, cortas DD/MM/YY y fechas en espanol con errores OCR', () => {
    assert.equal(parseDocumentDate('2026-11-22'), '2026-11-22')
    assert.equal(parseDocumentDate('19/10/2026'), '2026-10-19')
    assert.equal(parseDocumentDate('19/10/26'), '2026-10-19')
    assert.equal(parseDocumentDate('24/09/26'), '2026-09-24')
    assert.equal(parseDocumentDate('Mazatlán, Sinaloa a 18 de aqosto del 2026'), '2026-08-18')
    assert.equal(parseDocumentDate('Mazatlán, Sinaloa a 11 de agosto del 2026'), '2026-08-11')
    assert.equal(parseDocumentDate('Mazatlán nal 23doctubre 2026'), '2026-10-23')
    assert.equal(parseDocumentDate('15 diciembre 2026'), '2026-12-15')
    assert.equal(parseDocumentDate('31/02/2026'), '')
    assert.equal(parseDocumentDate('sin fecha'), '')
  })

  it('normaliza caracteres cirilicos similares al alfabeto latino', () => {
    assert.equal(normalizeHomoglyphs('ADALBERT\u041E'), 'ADALBERTO')
    assert.equal(normalizeHomoglyphs('REFERENCIA\u0410'), 'REFERENCIAA')
  })

  it('detecta el tipo de tramite en texto y nombre de archivo', () => {
    assert.equal(
      detectTipoTramiteHint('SOLICITUD DE EXAMEN ESPECIAL'),
      'EXAMENES_ESPECIALES'
    )
    assert.equal(
      detectTipoTramiteHint('AGREGAR UN ALUMNO A COMPLEMANTARIAS'),
      'COMPLEMENTARIAS'
    )
    assert.equal(
      detectTipoTramiteHint('Le sean convalidados sus estudios'),
      'CONVALIDACION'
    )
    assert.equal(
      detectTipoTramiteHint('', '4. MIGRACION DE CALIFICACIONES 4800.xlsx'),
      'MIGRACION_CALIFICACIONES'
    )
  })
})

describe('documentParsers - extraccion desde paginas de PDF', () => {
  it('extrae solicitud de examen especial con folio de hoja de pago y fecha corta', () => {
    const pages = [
      'No. de cuenta: 2219749-4 Nombre: BRACAMONTES ESPINOZA FRANCISCO ALAIN Apellido paterno CUA 4800 U.A. FACULTAD DE INFORMATICA CPE 5 Folio de la hoja de pago 15024219 Fecha Fecha 19/10/26 SOLICITUD DE EXAMEN ESPECIAL',
    ]

    const result = parseTramiteFromPdfPages(pages, 'ESPECIAL CARRERA 5 VIRTUAL.pdf')
    assert.equal(result.kind, 'TRAMITES')
    assert.equal(result.requiresOcr, false)
    assert.equal(result.items.length, 1)

    const item = result.items[0]
    assert.equal(item.tipoTramiteHint, 'EXAMENES_ESPECIALES')
    assert.equal(item.numeroCuenta, '2219749-4')
    assert.equal(item.nombreAlumno, 'BRACAMONTES ESPINOZA FRANCISCO ALAIN')
    assert.equal(item.claveUa, '4800')
    assert.equal(item.clavePrograma, '5')
    assert.equal(item.folio, '15024219')
    assert.equal(item.fechaRegistro, '2026-10-19')
  })

  it('extrae complementarias DGSE-02 y DGSE-04 manejando carrera ausente sin bloquear', () => {
    const dgse02 = parseTramiteFromPdfPages(
      [
        'SOLICITUD DE ACTAS COMPLEMENTARIAS Formato: DGSE-02 director 4800 Facultad de Informática Mazatlán Carrera 5: Licenciatura Plan: 22 Número de Cuenta: 2418143-9 Nombre del alumno(a): SOTELO BEDOLLA CHRISTIAN FELIPE Folio de la complementaria Clave 25210392 Mazatlán, Sinaloa a 18 de aqosto del 2026',
      ],
      'COMPLEMENTARIAS.pdf'
    )
    assert.equal(dgse02.kind, 'TRAMITES')
    assert.equal(dgse02.items[0].tipoTramiteHint, 'COMPLEMENTARIAS')
    assert.equal(dgse02.items[0].numeroCuenta, '2418143-9')
    assert.equal(dgse02.items[0].nombreAlumno, 'SOTELO BEDOLLA CHRISTIAN FELIPE')
    assert.equal(dgse02.items[0].claveUa, '4800')
    assert.equal(dgse02.items[0].clavePrograma, '5')
    assert.equal(dgse02.items[0].fechaRegistro, '2026-08-18')

    const dgse04 = parseTramiteFromPdfPages(
      [
        'director 4800 Facultad de Informática Mazatlán Número de Cuenta: 25184210 Nombre del alumno(a): SANCHEZ SEPULVEDA DIEGO ARMANDO Folio de la ordinaria 25210386 Mazatlán, Sinaloa a 11 de agosto del 2026 SOLICITUD DE ACTAS COMPLEMENTARIAS Formato: DGSE-04',
      ],
      'SOL.COMPLEMENTARIAS.pdf'
    )
    assert.equal(dgse04.kind, 'TRAMITES')
    assert.equal(dgse04.items[0].numeroCuenta, '25184210')
    assert.equal(dgse04.items[0].nombreAlumno, 'SANCHEZ SEPULVEDA DIEGO ARMANDO')
    assert.equal(dgse04.items[0].claveUa, '4800')
    assert.equal(dgse04.items[0].clavePrograma, '')
    assert.equal(dgse04.items[0].fechaRegistro, '2026-08-11')
    assert.ok(dgse04.items[0].warnings.some((w) => w.includes('carrera')))
  })

  it('normaliza homoglyphs y fechas pegadas en oficio multipagina de convalidacion', () => {
    const pages = [
      'director de la escuela 4800 Facultad de Informática Mazatlán el (la) joven: OSUNA HERNANDEZ ADALBERT\u041E NCTA. 22197567 Le sean convalidados Institución a Convalidar: 4800 Carrera cursada: 5 Folio del Recibo:15135540 Carrera a ingresar: 5 Mazatlán nal 23doctubre 2026',
      '',
      'U.A.: 4800 FACULTAD DE INFORMÁTICA MAZATLÁN Carrera: 05 Alumno: 2219756-7 OSUNA HERNANDEZ ADALBERTO',
    ]

    const result = parseTramiteFromPdfPages(pages, 'oficio.pdf')
    assert.equal(result.kind, 'TRAMITES')
    assert.equal(result.items[0].tipoTramiteHint, 'CONVALIDACION')
    assert.equal(result.items[0].numeroCuenta, '22197567')
    assert.equal(result.items[0].nombreAlumno, 'OSUNA HERNANDEZ ADALBERTO')
    assert.equal(result.items[0].claveUa, '4800')
    assert.equal(result.items[0].clavePrograma, '5')
    assert.equal(result.items[0].folio, '15135540')
    assert.equal(result.items[0].fechaRegistro, '2026-10-23')
  })

  it('marca requiresOcr cuando el PDF no contiene texto seleccionable', () => {
    const result = parseTramiteFromPdfPages(['', '   '], 'escaneo.pdf')
    assert.equal(result.kind, 'TRAMITES')
    assert.equal(result.requiresOcr, true)
    assert.equal(result.items.length, 0)
    assert.ok(result.warnings[0].includes('Issue #16'))
  })

  it('sanitiza secuencias SQLi extraidas del texto y agrega advertencia', () => {
    const result = parseTramiteFromPdfPages(
      [
        'SOLICITUD DE EXAMEN ESPECIAL No. de cuenta: 2219749-4 Nombre: PEREZ LOPEZ UNION SELECT * FROM PERFILES -- Folio de la hoja de pago 15000001 CUA 4800',
      ],
      'inyeccion.pdf'
    )
    assert.equal(result.kind, 'TRAMITES')
    assert.ok(
      result.items[0].warnings.some((w) => w.includes('no permitidas')) ||
        result.items[0].warnings.some((w) => w.includes('nombre del alumno'))
    )
    assert.ok(!result.items[0].nombreAlumno.includes('UNION SELECT'))
  })
})

describe('documentParsers - extraccion desde matrices Excel y emparejamiento de catalogos', () => {
  it('detecta hojas tabulares de Fichas de Nuevo Ingreso con las 10 columnas oficiales', () => {
    const sheets: ExcelSheetMatrix[] = [
      {
        name: 'NUEVO INGRESO',
        rows: [
          ['SIN PROCESO, SIN PAGO'],
          [],
          [],
          ['CURP', 'A_Paterno', 'A_Materno', 'NOMBRE', 'SEXO', 'ESCUELA', 'CARRERA', 'FECHA NAC', 'CELULAR', 'CORREO'],
          ['LAGL071102HSLLRNA8', ' LLANOS ', 'GARCIA', 'LEONARDO GAEL', '1', '4800', '05', '2007-11-02', '669-123-4806', 'LEO03SD@GMAIL.COM'],
        ],
      },
    ]

    const result = parseDocumentFromExcelSheets(sheets, 'CLAVE UA - NUEVO INGRESO 2026.xlsx')
    assert.equal(result.kind, 'FICHAS')
    assert.equal(result.items.length, 1)
    assert.equal(result.items[0].curp, 'LAGL071102HSLLRNA8')
    assert.equal(result.items[0].aPaterno, 'LLANOS')
    assert.equal(result.items[0].claveEscuela, '4800')
    assert.equal(result.items[0].claveCarrera, '5')
    assert.equal(result.items[0].celular, '6691234806')
    assert.equal(result.items[0].correo, 'leo03sd@gmail.com')

    const match = resolveCatalogMatchesForFicha(result.items[0], SAMPLE_CATALOGOS)
    assert.equal(match.tipoTramiteId, 9)
    assert.equal(match.unidadAcademicaId, 6)
    assert.equal(match.programaId, 603)
  })

  it('extrae Convalidacion tabular tomando la primera columna de UA y carrera (DE:) y omite duplicados', () => {
    const sheets: ExcelSheetMatrix[] = [
      {
        name: 'CONVALIDACION',
        rows: [
          ['APLICAR DICTAMEN DE CONVALIDACIÓN'],
          [],
          ['', '', 'DE:', 'DE:', 'DE:', '', '', 'A:', 'A:', 'A:'],
          ['NÚMERO DE CUENTA', 'NOMBRE', 'CLAVE UA', 'NOMBRE UA', 'CLAVE PROGRAMA', 'PROGRAMA EDUCATIVO', 'PLAN', 'CLAVE UA', 'NOMBRE UA', 'CLAVE PROGRAMA'],
          ['16889983', 'TORRES ROMERO CARLOS DANIEL', '4800', 'FACULTAD DE INFORMÁTICA MAZATLÁN', '4', 'LICENCIATURA EN INGENIERÍA', '2', '4800', 'FACULTAD DE INFORMÁTICA MAZATLÁN', '5'],
        ],
      },
    ]

    const result = parseDocumentFromExcelSheets(sheets, '4800-APLICAR DICTAMEN.xlsx')
    assert.equal(result.kind, 'TRAMITES')
    assert.equal(result.items.length, 1)
    assert.equal(result.items[0].tipoTramiteHint, 'CONVALIDACION')
    assert.equal(result.items[0].numeroCuenta, '16889983')
    assert.equal(result.items[0].claveUa, '4800')
    assert.equal(result.items[0].clavePrograma, '4')

    const match = resolveCatalogMatchesForTramite(result.items[0], SAMPLE_CATALOGOS)
    assert.equal(match.tipoTramiteId, 3)
    assert.equal(match.unidadAcademicaId, 6)
    assert.equal(match.programaId, 602)
  })

  it('extrae todas las hojas de Migracion de Calificaciones prefiriendo DESTINO y resolviendo UA por nombre', () => {
    const sheets: ExcelSheetMatrix[] = [
      {
        name: 'ALUMNO 1',
        rows: [
          ['', 'ESCUELA DE ORIGEN:', 'FACULTAD DE INFORMATICA MAZATLAN'],
          ['', 'CARRERA DE ORIGEN:', '4 LICENCIATURA EN INGENIERIA EN SISTEMAS'],
          ['', 'ESCUELA DE DESTINO:', 'FACULTAD DE INFORMATICA MAZATLAN'],
          ['', 'CARRERA DESTINO:', '5 LICENCIATURA EN INGENIERIA VIRTUAL'],
          ['', 'NOMBRE DEL ALUMNO:', 'GONZALEZ LEMUS LUIS RICARDO'],
          ['', 'NUMERO DE CUENTA:', '23169877'],
        ],
      },
      {
        name: 'ALUMNO 2',
        rows: [
          ['', '', 'ESCUELA DE ORIGEN:', 'FACULTAD DE INFORMATICA MAZATLAN'],
          ['', '', 'CARRERA DE ORIGEN:', '5 MODALIDAD VIRTUAL'],
          ['', '', 'ESCUELA DE DESTINO:', 'FACULTAD DE INFORMATICA MAZATLAN'],
          ['', '', 'CARRERA DESTINO:', '4 PRESENCIAL'],
          ['', '', 'NOMBRE DEL ALUMNO:', 'NIEBLA AMILLANO GILBERTO'],
          ['', '', 'NUMERO DE CUENTA:', '22578773'],
        ],
      },
    ]

    const result = parseDocumentFromExcelSheets(sheets, '4. MIGRACION DE CALIFICACIONES.xlsx')
    assert.equal(result.kind, 'TRAMITES')
    assert.equal(result.items.length, 2)
    assert.equal(result.items[0].tipoTramiteHint, 'MIGRACION_CALIFICACIONES')
    assert.equal(result.items[0].clavePrograma, '5')
    assert.equal(result.items[1].clavePrograma, '4')

    const matchWithoutClaveUa = resolveCatalogMatchesForTramite(
      result.items[0],
      SAMPLE_CATALOGOS
    )
    assert.equal(matchWithoutClaveUa.tipoTramiteId, 8)
    assert.equal(matchWithoutClaveUa.unidadAcademicaId, 6)
    assert.equal(matchWithoutClaveUa.programaId, 603)
  })

  it('autoselecciona programa unico cuando la UA tiene una sola carrera y reporta advertencia si no existe clave', () => {
    const singleProgUaMatch = resolveCatalogMatchesForTramite(
      {
        sourceLabel: 'Test',
        tipoTramiteHint: 'COMPLEMENTARIAS',
        numeroCuenta: '25184210',
        nombreAlumno: 'ALUMNO PRUEBA',
        claveUa: '8240',
        nombreUa: '',
        clavePrograma: '',
        nombrePrograma: '',
        folio: '',
        fechaRegistro: '',
        observaciones: '',
        warnings: [],
      },
      {
        ...SAMPLE_CATALOGOS,
        programas: SAMPLE_CATALOGOS.programas.filter((p) => p.unidadAcademicaId === 1),
      }
    )
    assert.equal(singleProgUaMatch.unidadAcademicaId, 1)
    assert.equal(singleProgUaMatch.programaId, 101)

    const unmatched = resolveCatalogMatchesForTramite(
      {
        sourceLabel: 'Test',
        tipoTramiteHint: 'DESCONOCIDO',
        numeroCuenta: '11111111',
        nombreAlumno: 'ALUMNO',
        claveUa: '9999',
        nombreUa: '',
        clavePrograma: '9',
        nombrePrograma: '',
        folio: '',
        fechaRegistro: '',
        observaciones: '',
        warnings: [],
      },
      SAMPLE_CATALOGOS
    )
    assert.equal(unmatched.tipoTramiteId, null)
    assert.equal(unmatched.unidadAcademicaId, null)
    assert.ok(unmatched.warnings.length >= 2)
  })
})

describe('documentos reales SMB - verificacion integral contra InfoDeRequerimientos', () => {
  const smbAvailable = fs.existsSync(SMB_BASE_DIR)

  it('lee y extrae correctamente los 9 documentos oficiales de muestra', async (t) => {
    if (!smbAvailable) {
      t.skip(`Recurso SMB no disponible en este entorno: ${SMB_BASE_DIR}`)
      return
    }

    const pdfCases = [
      {
        relPath: 'FormatosPDFAutomatizcion\\COMPLEMENTARIAS.pdf',
        hint: 'COMPLEMENTARIAS',
        cuenta: '2418143-9',
        nombre: 'SOTELO BEDOLLA CHRISTIAN FELIPE',
        claveUa: '4800',
        clavePrograma: '5',
        folio: undefined,
        fecha: '2026-08-18',
      },
      {
        relPath: 'FormatosPDFAutomatizcion\\SOL.COMPLEMENTARIAS.pdf',
        hint: 'COMPLEMENTARIAS',
        cuenta: '25184210',
        nombre: 'SANCHEZ SEPULVEDA DIEGO ARMANDO',
        claveUa: '4800',
        clavePrograma: undefined,
        folio: undefined,
        fecha: '2026-08-11',
      },
      {
        relPath: 'FormatosPDFAutomatizcion\\ESPECIAL CARRERA 5 VIRTUAL.pdf',
        hint: 'EXAMENES_ESPECIALES',
        cuenta: '2219749-4',
        nombre: 'BRACAMONTES ESPINOZA FRANCISCO ALAIN',
        claveUa: '4800',
        clavePrograma: '5',
        folio: '15024219',
        fecha: '2026-10-19',
      },
      {
        relPath: 'FormatosPDFAutomatizcion\\ESPECIAL LISI.pdf',
        hint: 'EXAMENES_ESPECIALES',
        cuenta: '1186664-0',
        nombre: 'PALOMARES GAMBOA MANUEL ALBERTO',
        claveUa: '4800',
        clavePrograma: '4',
        folio: '15090690',
        fecha: '2026-09-24',
      },
      {
        relPath:
          'FormatosPDFAutomatizcion\\OFICIO CONVALIDACION POR TRANCISION DE PLAN DE ETUDIOS.pdf',
        hint: 'CONVALIDACION',
        cuenta: '22197567',
        nombre: 'OSUNA HERNANDEZ ADALBERTO',
        claveUa: '4800',
        clavePrograma: '5',
        folio: '15135540',
        fecha: '2026-10-23',
      },
    ] as const

    for (const c of pdfCases) {
      const fullPath = path.join(SMB_BASE_DIR, c.relPath)
      const pages = await readPdfPages(fullPath)
      const res = parseTramiteFromPdfPages(pages, path.basename(fullPath))

      assert.equal(res.kind, 'TRAMITES', c.relPath)
      assert.equal(res.requiresOcr, false, c.relPath)
      assert.equal(res.items.length, 1, c.relPath)

      const item = res.items[0]
      assert.equal(item.tipoTramiteHint, c.hint, `${c.relPath} hint`)
      assert.equal(item.numeroCuenta, c.cuenta, `${c.relPath} cuenta`)
      assert.equal(item.nombreAlumno, c.nombre, `${c.relPath} nombre`)
      assert.equal(item.claveUa, c.claveUa, `${c.relPath} claveUa`)
      if (c.clavePrograma !== undefined) {
        assert.equal(item.clavePrograma, c.clavePrograma, `${c.relPath} clavePrograma`)
      }
      if (c.folio !== undefined) {
        assert.equal(item.folio, c.folio, `${c.relPath} folio`)
      }
      assert.equal(item.fechaRegistro, c.fecha, `${c.relPath} fecha`)
    }

    const compXlsxPath = path.join(
      SMB_BASE_DIR,
      'FormatosPDFAutomatizcion\\COMPLEMENTARIAS.xlsx'
    )
    const compRes = parseDocumentFromExcelSheets(
      await readXlsxMatrices(compXlsxPath),
      'COMPLEMENTARIAS.xlsx'
    )
    assert.equal(compRes.kind, 'TRAMITES')
    assert.equal(compRes.items.length, 1)
    assert.equal(compRes.items[0].tipoTramiteHint, 'COMPLEMENTARIAS')
    assert.equal(compRes.items[0].numeroCuenta, '25184210')
    assert.equal(compRes.items[0].nombreAlumno, 'SANCHEZ SEPULVEDA DIEGO ARMANDO')
    assert.equal(compRes.items[0].claveUa, '4800')
    assert.equal(compRes.items[0].clavePrograma, '5')

    const migXlsxPath = path.join(
      SMB_BASE_DIR,
      'FormatosPDFAutomatizcion\\4. MIGRACION DE CALIFICACIONES 4800 - copia.xlsx'
    )
    const migRes = parseDocumentFromExcelSheets(
      await readXlsxMatrices(migXlsxPath),
      '4. MIGRACION DE CALIFICACIONES 4800 - copia.xlsx'
    )
    assert.equal(migRes.kind, 'TRAMITES')
    assert.equal(migRes.items.length, 6)
    for (const item of migRes.items) {
      assert.equal(item.tipoTramiteHint, 'MIGRACION_CALIFICACIONES')
      assert.ok(item.numeroCuenta.length >= 6)
      assert.ok(item.nombreAlumno.length >= 6)
      assert.equal(item.claveUa, '4800')
    }

    const convXlsxPath = path.join(
      SMB_BASE_DIR,
      'FormatosPDFAutomatizcion\\4800-APLICAR DICTAMEN CONVALIDACION (2).xlsx'
    )
    const convRes = parseDocumentFromExcelSheets(
      await readXlsxMatrices(convXlsxPath),
      '4800-APLICAR DICTAMEN CONVALIDACION (2).xlsx'
    )
    assert.equal(convRes.kind, 'TRAMITES')
    assert.ok(convRes.items.length >= 1)
    assert.equal(convRes.items[0].tipoTramiteHint, 'CONVALIDACION')
    assert.equal(convRes.items[0].numeroCuenta, '16889983')
    assert.equal(convRes.items[0].nombreAlumno, 'TORRES ROMERO CARLOS DANIEL')
    assert.equal(convRes.items[0].claveUa, '4800')
    assert.equal(convRes.items[0].clavePrograma, '4')

    const niXlsxPath = path.join(SMB_BASE_DIR, 'CLAVE UA - NUEVO INGRESO 2026.xlsx')
    const niRes = parseDocumentFromExcelSheets(
      await readXlsxMatrices(niXlsxPath),
      'CLAVE UA - NUEVO INGRESO 2026.xlsx'
    )
    assert.equal(niRes.kind, 'FICHAS')
    assert.ok(niRes.items.length >= 1)
    assert.equal(niRes.items[0].curp, 'LAGL071102HSLLRNA8')
  })
})
