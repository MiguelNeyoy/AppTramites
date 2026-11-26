import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import ExcelJS from 'exceljs'

import {
  NUEVO_INGRESO_EXCEL_HEADERS,
  NUEVO_INGRESO_SHEET_NAME,
  buildFichasXlsxBuffer,
} from '../src/services/fichas/fichasExcel.ts'
import {
  formatFechaExcel,
  mapFichaFromDb,
  validateFichaInput,
  type FichaJoinedDbRow,
  type FichaNuevoIngresoRecord,
} from '../src/services/fichas/fichasValidation.ts'

describe('fichasValidation - validacion y mapeo de Nuevo Ingreso', () => {
  it('valida y normaliza los 10 campos nominales del Excel oficial', () => {
    const res = validateFichaInput({
      curp: '  lagl071102hsllrna8 ',
      aPaterno: ' llanos ',
      aMaterno: ' garcia ',
      nombre: ' leonardo gael ',
      sexo: 1,
      unidadAcademicaId: 1,
      programaId: 2,
      fechaNacimiento: '2007-11-02',
      celular: '669-123-4806',
      correo: ' Leo03sd@GMAIL.com ',
      estatusFicha: 'SIN_PAGO',
      periodoId: 1,
    })

    assert.equal(res.valid, true)
    if (res.valid) {
      assert.equal(res.data.curp, 'LAGL071102HSLLRNA8')
      assert.equal(res.data.aPaterno, 'LLANOS')
      assert.equal(res.data.aMaterno, 'GARCIA')
      assert.equal(res.data.nombre, 'LEONARDO GAEL')
      assert.equal(res.data.celular, '6691234806')
      assert.equal(res.data.correo, 'leo03sd@gmail.com')
    }
  })

  it('rechaza CURP invalida, sexo fuera de {1,2}, celular corto y correo con SQLi', () => {
    const base = {
      curp: 'LAGL071102HSLLRNA8',
      aPaterno: 'LLANOS',
      aMaterno: 'GARCIA',
      nombre: 'LEONARDO',
      sexo: 1 as const,
      unidadAcademicaId: 1,
      programaId: 1,
      fechaNacimiento: '2007-11-02',
      celular: '6691234806',
      correo: 'leo03sd@gmail.com',
      estatusFicha: 'SIN_PROCESO' as const,
      periodoId: 1,
    }

    assert.equal(validateFichaInput({ ...base, curp: 'INVALIDA' }).valid, false)
    assert.equal(
      validateFichaInput({ ...base, sexo: 3 as unknown as 1 | 2 }).valid,
      false
    )
    assert.equal(validateFichaInput({ ...base, celular: '669123' }).valid, false)
    assert.equal(
      validateFichaInput({ ...base, correo: "a@uas.edu.mx' OR '1'='1" }).valid,
      false
    )
  })

  it('mapea filas unidas de Postgres y formatea FECHA NAC a AAAA/MM/DD', () => {
    const dbRow: FichaJoinedDbRow = {
      id: 'ficha-uuid-1',
      curp: 'LAGL071102HSLLRNA8',
      a_paterno: 'LLANOS',
      a_materno: 'GARCIA',
      nombre: 'LEONARDO GAEL',
      sexo: 1,
      unidad_academica_id: 1,
      programa_id: 2,
      fecha_nacimiento: '2007-11-02',
      celular: '6691234806',
      correo: 'leo03sd@gmail.com',
      estatus_ficha: 'SIN_PAGO',
      periodo_id: 1,
      usuario_id: 'usr-1',
      fecha_registro: '2026-11-19',
      created_at: '2026-11-19T10:00:00Z',
      updated_at: '2026-11-19T10:00:00Z',
      unidades_academicas: {
        id: 1,
        clave_ua: '4800',
        nombre: 'FAC. DE INFORMÁTICA MAZATLÁN',
        nivel: 'LICENCIATURA',
      },
      programas_educativos: {
        id: 2,
        clave_programa: '5',
        nombre: 'LICENCIATURA EN INFORMÁTICA',
      },
    }

    const mapped = mapFichaFromDb(dbRow)
    assert.equal(mapped.claveEscuela, '4800')
    assert.equal(mapped.claveCarrera, '5')
    assert.equal(mapped.nivel, 'LICENCIATURA')
    assert.equal(formatFechaExcel(mapped.fechaNacimiento), '2007/11/02')
  })
})

describe('fichasExcel - exportacion oficial ExcelJS', () => {
  it('genera libro .xlsx con hoja NUEVO INGRESO y encabezados exactos', async () => {
    const sample: FichaNuevoIngresoRecord[] = [
      {
        id: 'ficha-1',
        curp: 'LAGL071102HSLLRNA8',
        aPaterno: 'LLANOS',
        aMaterno: 'GARCIA',
        nombre: 'LEONARDO GAEL',
        sexo: 1,
        unidadAcademicaId: 1,
        claveEscuela: '4800',
        nombreEscuela: 'FAC. DE INFORMÁTICA MAZATLÁN',
        nivel: 'LICENCIATURA',
        programaId: 2,
        claveCarrera: '5',
        nombreCarrera: 'LICENCIATURA EN INFORMÁTICA',
        fechaNacimiento: '2007-11-02',
        celular: '6691234806',
        correo: 'leo03sd@gmail.com',
        estatusFicha: 'SIN_PAGO',
        periodoId: 1,
        fechaRegistro: '2026-11-19',
      },
    ]

    const buffer = await buildFichasXlsxBuffer(sample, { cicloLabel: '2026-2027' })
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)

    const sheet = workbook.getWorksheet(NUEVO_INGRESO_SHEET_NAME)
    assert.ok(sheet, 'Debe existir la hoja NUEVO INGRESO')

    const headers = sheet.getRow(4).values as (string | undefined)[]
    assert.deepEqual(headers.slice(1, 11), [...NUEVO_INGRESO_EXCEL_HEADERS])

    const dataRow = sheet.getRow(5).values as (string | number | undefined)[]
    assert.deepEqual(dataRow.slice(1, 11), [
      'LAGL071102HSLLRNA8',
      'LLANOS',
      'GARCIA',
      'LEONARDO GAEL',
      1,
      '4800',
      '5',
      '2007/11/02',
      '6691234806',
      'leo03sd@gmail.com',
    ])
  })
})
