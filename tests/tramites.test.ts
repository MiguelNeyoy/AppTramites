import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  formatFolioBadge,
  mapTramiteFromDb,
  normalizeFolio,
  summarizeTramitesByEstado,
  validateTramiteAlumnoInput,
  type TramiteJoinedDbRow,
} from '../src/services/tramites/tramitesValidation.ts'

describe('tramitesValidation - validacion y mapeo de tramites por alumno', () => {
  it('valida y normaliza campos de un tramite individual por alumno', () => {
    const res = validateTramiteAlumnoInput({
      folio: '  urs-2026-01 ',
      numeroCuenta: ' 20261234 ',
      nombreAlumno: '  Juan Perez Lopez ',
      programaId: 1,
      tipoTramiteId: 2,
      periodoId: 1,
      fechaRegistro: '2026-11-19',
      estado: 'PENDIENTE',
      observaciones: '  Entrega pendiente  ',
      archivoPdfUrl: '',
    })

    assert.equal(res.valid, true)
    if (res.valid) {
      assert.equal(res.data.folio, 'URS-2026-01')
      assert.equal(res.data.numeroCuenta, '20261234')
      assert.equal(res.data.nombreAlumno, 'JUAN PEREZ LOPEZ')
      assert.equal(res.data.observaciones, 'Entrega pendiente')
      assert.equal(res.data.archivoPdfUrl, null)
    }

    assert.equal(normalizeFolio('   '), null)
    assert.equal(formatFolioBadge(null), 'Sin folio')
    assert.equal(formatFolioBadge('0042'), '0042')
  })

  it('rechaza folio con espacios o SQLi, numeroCuenta vacio y fecha invalida', () => {
    const base = {
      folio: '0042',
      numeroCuenta: '20261234',
      nombreAlumno: 'JUAN PEREZ',
      programaId: 1,
      tipoTramiteId: 1,
      periodoId: 1,
      fechaRegistro: '2026-11-19',
      estado: 'PENDIENTE' as const,
    }

    assert.equal(validateTramiteAlumnoInput({ ...base, folio: '' }).valid, true)
    assert.equal(validateTramiteAlumnoInput({ ...base, folio: 'URS 01' }).valid, false)
    assert.equal(
      validateTramiteAlumnoInput({ ...base, folio: "001'; DROP TABLE--" }).valid,
      false
    )
    assert.equal(validateTramiteAlumnoInput({ ...base, numeroCuenta: '   ' }).valid, false)
    assert.equal(
      validateTramiteAlumnoInput({
        ...base,
        numeroCuenta: "2026' OR '1'='1",
      }).valid,
      false
    )
    assert.equal(
      validateTramiteAlumnoInput({
        ...base,
        nombreAlumno: 'Juan; DROP TABLE tramites_alumnos;--',
      }).valid,
      false
    )
    assert.equal(
      validateTramiteAlumnoInput({ ...base, fechaRegistro: '19/11/2026' }).valid,
      false
    )
  })

  it('mapea filas unidas de Postgres y resume conteos por estado', () => {
    const row: TramiteJoinedDbRow = {
      id: 'tr-uuid-1',
      folio: '0042',
      numero_cuenta: '20224819',
      nombre_alumno: 'DANIELA SANCHEZ',
      programa_id: 1,
      tipo_tramite_id: 5,
      periodo_id: 1,
      usuario_id: 'usr-1',
      fecha_registro: '2026-11-19',
      estado: 'RESUELTO',
      observaciones: null,
      archivo_pdf_url: 'oficio.pdf',
      created_at: '2026-11-19T12:00:00Z',
      updated_at: '2026-11-19T12:00:00Z',
      programas_educativos: {
        id: 1,
        clave_programa: '1',
        nombre: 'LICENCIATURA EN INFORMÁTICA',
        unidad_academica_id: 1,
        unidades_academicas: {
          id: 1,
          clave_ua: '4800',
          nombre: 'FAC. DE INFORMÁTICA MAZATLÁN',
          nivel: 'LICENCIATURA',
        },
      },
      tipos_tramite: {
        id: 5,
        nombre: 'Complementarias',
        modulo: 'TRAMITES_GENERALES',
        permite_pdf: true,
      },
    }

    const mapped = mapTramiteFromDb(row)
    assert.equal(mapped.folio, '0042')
    assert.equal(mapped.claveUa, '4800')
    assert.equal(mapped.permitePdf, true)

    const summary = summarizeTramitesByEstado([
      { estado: 'PENDIENTE' },
      { estado: 'RESUELTO' },
      { estado: 'RESUELTO' },
      { estado: 'CON_ERROR' },
    ])
    assert.deepEqual(summary, {
      total: 4,
      pendientes: 1,
      resueltos: 2,
      conError: 1,
    })
  })
})
