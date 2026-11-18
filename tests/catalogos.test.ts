import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  mapPeriodoFromDb,
  mapProgramaFromDb,
  mapTipoTramiteFromDb,
  mapUnidadFromDb,
  validatePeriodoInput,
  validateProgramaInput,
  validateTipoTramiteInput,
  validateUnidadInput,
} from '../src/services/catalogos/catalogosValidation.ts'

describe('catalogosValidation - mapeadores snake_case a camelCase', () => {
  it('mapea filas de unidades, programas, tramites y periodos desde Postgres', () => {
    const ua = mapUnidadFromDb({
      id: 1,
      clave_ua: '8240',
      nombre: 'Preparatoria Mazatlan',
      nivel: 'BACHILLERATO',
      activa: true,
      created_at: '2026-01-01T00:00:00Z',
    })
    assert.deepEqual(ua, {
      id: 1,
      claveUa: '8240',
      nombre: 'Preparatoria Mazatlan',
      nivel: 'BACHILLERATO',
      activa: true,
      createdAt: '2026-01-01T00:00:00Z',
    })

    const prog = mapProgramaFromDb({
      id: 10,
      unidad_academica_id: 1,
      clave_programa: '1',
      nombre: 'Bachillerato General',
      activo: true,
      created_at: '2026-01-01T00:00:00Z',
    })
    assert.equal(prog.unidadAcademicaId, 1)
    assert.equal(prog.clavePrograma, '1')

    const tramite = mapTipoTramiteFromDb({
      id: 2,
      nombre: 'Certificado Total',
      modulo: 'TRAMITES_GENERALES',
      permite_pdf: false,
      activo: true,
      created_at: '2026-01-01T00:00:00Z',
    })
    assert.equal(tramite.permitePdf, false)
    assert.equal(tramite.modulo, 'TRAMITES_GENERALES')

    const periodo = mapPeriodoFromDb({
      id: 3,
      nombre: '2026-2027',
      numero_periodo: 1,
      fecha_inicio: '2026-08-18',
      fecha_fin: '2027-01-31',
      activo: true,
      created_at: '2026-01-01T00:00:00Z',
    })
    assert.equal(periodo.numeroPeriodo, 1)
    assert.equal(periodo.fechaInicio, '2026-08-18')
    assert.equal(periodo.fechaFin, '2027-01-31')
  })
})

describe('catalogosValidation - validadores CRUD de catalogo', () => {
  it('valida y recorta campos de unidad academica', () => {
    const invalid = validateUnidadInput({
      claveUa: '   ',
      nombre: 'Facultad de Informatica',
      nivel: 'LICENCIATURA',
      activa: true,
    })
    assert.equal(invalid.valid, false)
    assert.equal(invalid.field, 'claveUa')

    const valid = validateUnidadInput({
      claveUa: ' 4800 ',
      nombre: ' Facultad de Derecho Mazatlan ',
      nivel: 'LICENCIATURA',
      activa: true,
    })
    assert.equal(valid.valid, true)
    assert.equal(valid.data?.claveUa, '4800')
    assert.equal(valid.data?.nombre, 'Facultad de Derecho Mazatlan')
  })

  it('valida programa educativo vinculado a unidad academica', () => {
    assert.equal(
      validateProgramaInput({
        unidadAcademicaId: 0,
        clavePrograma: '1',
        nombre: 'Derecho',
        activo: true,
      }).valid,
      false
    )

    const valid = validateProgramaInput({
      unidadAcademicaId: 5,
      clavePrograma: ' 02 ',
      nombre: ' Ingenieria en Sistemas ',
      activo: true,
    })
    assert.equal(valid.valid, true)
    assert.equal(valid.data?.clavePrograma, '02')
  })

  it('valida tipo de tramite y modulo operativo', () => {
    assert.equal(
      validateTipoTramiteInput({
        nombre: ' ',
        modulo: 'NUEVO_INGRESO',
        permitePdf: false,
        activo: true,
      }).valid,
      false
    )

    const valid = validateTipoTramiteInput({
      nombre: ' Fichas de Nuevo Ingreso ',
      modulo: 'NUEVO_INGRESO',
      permitePdf: false,
      activo: true,
    })
    assert.equal(valid.valid, true)
    assert.equal(valid.data?.nombre, 'Fichas de Nuevo Ingreso')
  })

  it('valida periodo escolar, formato ISO y rango fecha_fin >= fecha_inicio', () => {
    const badRange = validatePeriodoInput({
      nombre: '2026-2027',
      numeroPeriodo: 1,
      fechaInicio: '2026-09-01',
      fechaFin: '2026-08-01',
      activo: true,
    })
    assert.equal(badRange.valid, false)
    assert.equal(badRange.field, 'fechaFin')

    const badDate = validatePeriodoInput({
      nombre: '2026-2027',
      numeroPeriodo: 1,
      fechaInicio: '2026-02-30',
      fechaFin: '2026-07-01',
      activo: true,
    })
    assert.equal(badDate.valid, false)
    assert.equal(badDate.field, 'fechaInicio')

    const valid = validatePeriodoInput({
      nombre: ' 2026-2027 ',
      numeroPeriodo: 1,
      fechaInicio: '2026-08-18',
      fechaFin: '2027-01-31',
      activo: true,
    })
    assert.equal(valid.valid, true)
    assert.equal(valid.data?.nombre, '2026-2027')
  })
})
