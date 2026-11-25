import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildActasMatrix,
  computeChecklistStats,
  filterVisibleActaRows,
  getActaColumnsForPeriodo,
  getInitialEtapaActiva,
  resolveAutoAdvanceEtapa,
  validateAssignResponsableInput,
  validateUpsertActaInput,
} from '../src/services/actas/actasValidation.ts'
import type {
  PeriodoEscolarCatalogo,
  ProgramaEducativoCatalogo,
  UnidadAcademicaCatalogo,
} from '../src/services/catalogos/catalogosValidation.ts'

const UNIDADES_SAMPLE: UnidadAcademicaCatalogo[] = [
  {
    id: 1,
    claveUa: '4800',
    nombre: 'FAC. DE INFORMÁTICA MAZATLÁN',
    nivel: 'LICENCIATURA',
    activa: true,
  },
  {
    id: 5,
    claveUa: '3100',
    nombre: 'Preparatoria Emiliano Zapata',
    nivel: 'BACHILLERATO',
    activa: true,
  },
]

const PROGRAMAS_SAMPLE: ProgramaEducativoCatalogo[] = [
  {
    id: 101,
    unidadAcademicaId: 1,
    clavePrograma: '1',
    nombre: 'LICENCIATURA EN INFORMÁTICA',
    activo: true,
  },
  {
    id: 501,
    unidadAcademicaId: 5,
    clavePrograma: '1',
    nombre: 'BACHILLERATO GENERAL',
    activo: true,
  },
]

const PERIODO_1: PeriodoEscolarCatalogo = {
  id: 1,
  nombre: '2026-2027 Periodo 1 (Ago-Ene)',
  numeroPeriodo: 1,
  fechaInicio: '2026-08-01',
  fechaFin: '2027-01-31',
  activo: true,
}

const PERIODO_2: PeriodoEscolarCatalogo = {
  id: 2,
  nombre: '2026-2027 Periodo 2 (Feb-Jul)',
  numeroPeriodo: 2,
  fechaInicio: '2027-02-01',
  fechaFin: '2027-07-31',
  activo: false,
}

describe('actasValidation - periodos, etapas progresivas y rastro visual', () => {
  it('devuelve 3 columnas para Periodo 1 y 5 columnas para Periodo 2', () => {
    const colsP1 = getActaColumnsForPeriodo(1)
    assert.deepEqual(
      colsP1.map((c) => c.key),
      ['ORDINARIA', 'EXTRAORDINARIA', 'REGULARIZACION']
    )

    const colsP2 = getActaColumnsForPeriodo(2)
    assert.deepEqual(
      colsP2.map((c) => c.key),
      [
        'ORDINARIA',
        'EXTRAORDINARIA',
        'REGULARIZACION',
        'PROMOCION_GRADO',
        'CIERRE_CICLO',
      ]
    )
  })

  it('mantiene matrices independientes por periodo y Periodo 2 arranca en blanco', () => {
    const matrixP1 = buildActasMatrix({
      unidades: UNIDADES_SAMPLE,
      programas: PROGRAMAS_SAMPLE,
      periodo: PERIODO_1,
      checklistRows: [
        {
          id: 'c1',
          periodo_id: 1,
          programa_id: 101,
          tipo_acta: 'ORDINARIA',
          estado: 'GENERADA',
          responsable_id: 'a0000000-0000-0000-0000-000000000001',
          actualizado_por: 'a0000000-0000-0000-0000-000000000001',
          updated_at: '2026-10-01T10:00:00Z',
        },
      ],
    })

    const matrixP2 = buildActasMatrix({
      unidades: UNIDADES_SAMPLE,
      programas: PROGRAMAS_SAMPLE,
      periodo: PERIODO_2,
      checklistRows: [],
    })

    assert.equal(matrixP1[0].claveUa, '3100')
    assert.equal(matrixP1[1].claveUa, '4800')
    assert.equal(matrixP1[1].estados.ORDINARIA, 'GENERADA')
    assert.equal(matrixP1[1].periodoLabel, 'Periodo 1')

    assert.equal(matrixP2.length, 2)
    assert.equal(matrixP2[0].periodoLabel, 'Periodo 2')
    assert.equal(matrixP2[1].estados.ORDINARIA, 'PENDIENTE')
    assert.equal(matrixP2[1].estados.PROMOCION_GRADO, 'PENDIENTE')
    assert.equal(matrixP2[1].estados.CIERRE_CICLO, 'PENDIENTE')
  })

  it('avanza automaticamente de etapa al 100% y salta a TODAS al cerrar el periodo', () => {
    const colsP1 = getActaColumnsForPeriodo(1)
    const prevRows = buildActasMatrix({
      unidades: UNIDADES_SAMPLE,
      programas: PROGRAMAS_SAMPLE,
      periodo: PERIODO_1,
      checklistRows: [
        {
          id: 'c1',
          periodo_id: 1,
          programa_id: 501,
          tipo_acta: 'ORDINARIA',
          estado: 'GENERADA',
          responsable_id: null,
          actualizado_por: null,
          updated_at: '2026-10-01T10:00:00Z',
        },
      ],
    })

    assert.equal(getInitialEtapaActiva(prevRows, colsP1), 'ORDINARIA')

    const afterOrd = prevRows.map((row) =>
      row.programaId === 101
        ? { ...row, estados: { ...row.estados, ORDINARIA: 'GENERADA' as const } }
        : row
    )

    const step1 = resolveAutoAdvanceEtapa({
      prevRows,
      nextRows: afterOrd,
      currentEtapa: 'ORDINARIA',
      activeColumns: colsP1,
    })
    assert.equal(step1.nextEtapa, 'EXTRAORDINARIA')
    assert.equal(step1.advancedFrom?.key, 'ORDINARIA')
    assert.equal(
      step1.advancedTo !== 'TODAS' && step1.advancedTo?.key,
      'EXTRAORDINARIA'
    )

    const afterExt = afterOrd.map((row) => ({
      ...row,
      estados: { ...row.estados, EXTRAORDINARIA: 'GENERADA' as const },
    }))
    const afterReg = afterExt.map((row) => ({
      ...row,
      estados: { ...row.estados, REGULARIZACION: 'GENERADA' as const },
    }))

    const finalStep = resolveAutoAdvanceEtapa({
      prevRows: afterExt,
      nextRows: afterReg,
      currentEtapa: 'REGULARIZACION',
      activeColumns: colsP1,
    })
    assert.equal(finalStep.nextEtapa, 'TODAS')
    assert.equal(finalStep.advancedTo, 'TODAS')
    assert.equal(getInitialEtapaActiva(afterReg, colsP1), 'TODAS')
  })

  it('conserva rastro visual automatico cuando etapa o periodo estan al 100%', () => {
    const colsP1 = getActaColumnsForPeriodo(1)
    const partialRows = buildActasMatrix({
      unidades: UNIDADES_SAMPLE,
      programas: PROGRAMAS_SAMPLE,
      periodo: PERIODO_1,
      checklistRows: [
        {
          id: 'c1',
          periodo_id: 1,
          programa_id: 501,
          tipo_acta: 'ORDINARIA',
          estado: 'GENERADA',
          responsable_id: null,
          actualizado_por: null,
          updated_at: '2026-10-01T10:00:00Z',
        },
      ],
    })

    const visibleWhilePending = filterVisibleActaRows({
      rows: partialRows,
      activeColumns: colsP1,
      etapaActiva: 'ORDINARIA',
      unidadFilter: 'TODAS',
      searchQuery: '',
      limpiezaAutomatica: true,
      mostrarCompletadas: false,
      responsablesMap: new Map(),
    })
    assert.equal(visibleWhilePending.length, 1)
    assert.equal(visibleWhilePending[0].programaId, 101)

    const completedOrdRows = partialRows.map((row) => ({
      ...row,
      estados: { ...row.estados, ORDINARIA: 'GENERADA' as const },
    }))
    const visibleStageCompleted = filterVisibleActaRows({
      rows: completedOrdRows,
      activeColumns: colsP1,
      etapaActiva: 'ORDINARIA',
      unidadFilter: 'TODAS',
      searchQuery: '',
      limpiezaAutomatica: true,
      mostrarCompletadas: false,
      responsablesMap: new Map(),
    })
    assert.equal(visibleStageCompleted.length, 2)

    const completedAllRows = completedOrdRows.map((row) => ({
      ...row,
      estados: {
        ...row.estados,
        EXTRAORDINARIA: 'GENERADA' as const,
        REGULARIZACION: 'GENERADA' as const,
      },
    }))
    const stats = computeChecklistStats(completedAllRows, colsP1)
    assert.equal(stats.isAllCompleted, true)

    const visiblePeriodCompleted = filterVisibleActaRows({
      rows: completedAllRows,
      activeColumns: colsP1,
      etapaActiva: 'TODAS',
      unidadFilter: 'TODAS',
      searchQuery: '',
      limpiezaAutomatica: true,
      mostrarCompletadas: false,
      responsablesMap: new Map(),
    })
    assert.equal(visiblePeriodCompleted.length, 2)
  })

  it('valida restricciones de Periodo 1 y asignacion de responsable', () => {
    const invalidP1 = validateUpsertActaInput({
      periodoId: 1,
      numeroPeriodo: 1,
      programaId: 101,
      tipoActa: 'PROMOCION_GRADO',
      estado: 'GENERADA',
    })
    assert.equal(invalidP1.valid, false)

    const invalidCierreP1 = validateUpsertActaInput({
      periodoId: 1,
      numeroPeriodo: 1,
      programaId: 101,
      tipoActa: 'CIERRE_CICLO',
      estado: 'GENERADA',
    })
    assert.equal(invalidCierreP1.valid, false)

    const validP2 = validateUpsertActaInput({
      periodoId: 2,
      numeroPeriodo: 2,
      programaId: 101,
      tipoActa: 'CIERRE_CICLO',
      estado: 'GENERADA',
      responsableId: 'a0000000-0000-0000-0000-000000000001',
    })
    assert.equal(validP2.valid, true)

    const validResp = validateAssignResponsableInput({
      periodoId: 1,
      programaId: 101,
      responsableId: null,
    })
    assert.equal(validResp.valid, true)
  })
})
