/**
 * Simulacion E2E del caso de uso para Issue #15 (Lectura client-side de documentos).
 *
 * Ejecucion:
 *   TEST_USER_EMAIL="admin@uas.edu.mx" \
 *   TEST_USER_PASSWORD="..." \
 *   node --experimental-strip-types --env-file=.env tests/simulate-issue-15.mjs
 */

import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'
import ExcelJS from 'exceljs'

import {
  parseDocumentFromExcelSheets,
  resolveCatalogMatchesForTramite,
} from '../src/services/documentos/documentParsers.ts'
import { validateTramiteAlumnoInput } from '../src/services/tramites/tramitesValidation.ts'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
const testEmail = process.env.TEST_USER_EMAIL
const testPassword = process.env.TEST_USER_PASSWORD

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en el entorno o .env')
  process.exit(1)
}

if (!testEmail || !testPassword) {
  console.error('Faltan TEST_USER_EMAIL o TEST_USER_PASSWORD para autenticar la simulacion')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const cleanupTasks = []

async function runSimulation() {
  // 1. Autenticacion y consulta de catalogos reales
  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email: testEmail.trim().toLowerCase(),
      password: testPassword,
    })
  assert.ifError(authError)
  assert.ok(authData.user, 'Se esperaba usuario autenticado')

  const [
    { data: unidadesDb, error: uaErr },
    { data: programasDb, error: progErr },
    { data: tiposDb, error: tipoErr },
    { data: periodosDb, error: perErr },
  ] = await Promise.all([
    supabase
      .from('unidades_academicas')
      .select('id, clave_ua, nombre, nivel')
      .eq('activa', true),
    supabase
      .from('programas_educativos')
      .select('id, unidad_academica_id, clave_programa, nombre')
      .eq('activo', true),
    supabase
      .from('tipos_tramite')
      .select('id, nombre, modulo, permite_pdf')
      .eq('activo', true),
    supabase
      .from('periodos_escolares')
      .select('id, nombre, activo')
      .order('activo', { ascending: false })
      .limit(1),
  ])

  assert.ifError(uaErr)
  assert.ifError(progErr)
  assert.ifError(tipoErr)
  assert.ifError(perErr)
  assert.ok(
    unidadesDb?.length > 0 &&
      programasDb?.length > 0 &&
      tiposDb?.length > 0 &&
      periodosDb?.length > 0,
    'Se requieren catalogos y periodo escolar activos en Supabase'
  )

  const unidades = unidadesDb.map((u) => ({
    id: u.id,
    claveUa: u.clave_ua,
    nombre: u.nombre,
    nivel: u.nivel,
  }))
  const programas = programasDb.map((p) => ({
    id: p.id,
    unidadAcademicaId: p.unidad_academica_id,
    clavePrograma: p.clave_programa,
    nombre: p.nombre,
  }))
  const tiposTramite = tiposDb.map((t) => ({
    id: t.id,
    nombre: t.nombre,
    modulo: t.modulo,
    permitePdf: t.permite_pdf,
  }))

  const compTipo = tiposTramite.find(
    (t) => t.modulo === 'TRAMITES_GENERALES' && /complementaria/i.test(t.nombre)
  )
  assert.ok(compTipo, 'Debe existir el tipo de tramite Complementarias en tipos_tramite')

  const targetProg = programas[0]
  const targetUa = unidades.find((u) => u.id === targetProg.unidadAcademicaId)
  assert.ok(targetUa, 'Programa de prueba debe pertenecer a una UA activa')

  // 2. Generar archivo Excel en memoria simulando formato Complementarias
  const uniqueSuffix = String(Date.now()).slice(-6)
  const cuentaPrueba = `2026${uniqueSuffix}`
  const alumnoPrueba = `SIMULACION DOCUMENTO ${uniqueSuffix}`

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('COMPLEMENTARIAS')
  ws.addRow([targetUa.nombre])
  ws.addRow(['SOLICITUD DE ACTAS COMPLEMENTARIAS'])
  ws.addRow(['CLAVE UA:', targetUa.claveUa])
  ws.addRow(['CARRERA:', targetProg.clavePrograma])
  ws.addRow(['NUM CTA.', cuentaPrueba])
  ws.addRow(['NOMBRE ALUM.', alumnoPrueba])

  const arrayBuffer = await wb.xlsx.writeBuffer()
  const reloadedWb = new ExcelJS.Workbook()
  await reloadedWb.xlsx.load(arrayBuffer)
  const sheets = reloadedWb.worksheets.map((sheet) => {
    const rows = []
    for (let r = 1; r <= Math.min(sheet.rowCount, 50); r++) {
      const row = sheet.getRow(r)
      const cells = []
      for (let c = 1; c <= 10; c++) {
        const val = row.getCell(c).value
        cells.push(val === null || val === undefined ? '' : String(val).trim())
      }
      rows.push(cells)
    }
    return { name: sheet.name, rows }
  })

  // 3. Parsear y emparejar contra catalogos vivos
  const extraction = parseDocumentFromExcelSheets(sheets, 'COMPLEMENTARIAS.xlsx')
  assert.equal(extraction.kind, 'TRAMITES')
  assert.equal(extraction.items.length, 1)

  const draft = extraction.items[0]
  const match = resolveCatalogMatchesForTramite(draft, {
    unidades,
    programas,
    tiposTramite,
  })
  assert.equal(match.tipoTramiteId, compTipo.id)
  assert.equal(match.unidadAcademicaId, targetUa.id)
  assert.equal(match.programaId, targetProg.id)

  const todayIso = new Date().toISOString().slice(0, 10)
  const validation = validateTramiteAlumnoInput({
    folio: draft.folio || null,
    numeroCuenta: draft.numeroCuenta,
    nombreAlumno: draft.nombreAlumno,
    programaId: match.programaId,
    tipoTramiteId: match.tipoTramiteId,
    periodoId: periodosDb[0].id,
    fechaRegistro: draft.fechaRegistro || todayIso,
    estado: 'PENDIENTE',
    observaciones: 'Registro generado desde simulacion Issue #15',
    archivoPdfUrl: null,
  })
  assert.equal(validation.valid, true)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  console.log(
    `[OK] Excel extraido y validado: cuenta=${validation.data.numeroCuenta}, ua=${targetUa.claveUa}, prog=${targetProg.clavePrograma}`
  )

  // 4. Guardar tras revision simulada en PostgreSQL y limpiar al finalizar
  const { data: created, error: insertErr } = await supabase
    .from('tramites_alumnos')
    .insert({
      numero_cuenta: validation.data.numeroCuenta,
      nombre_alumno: validation.data.nombreAlumno,
      programa_id: validation.data.programaId,
      tipo_tramite_id: validation.data.tipoTramiteId,
      periodo_id: validation.data.periodoId,
      fecha_registro: validation.data.fechaRegistro,
      estado: validation.data.estado,
      observaciones: validation.data.observaciones,
      usuario_id: authData.user.id,
    })
    .select('id, numero_cuenta, nombre_alumno, estado')
    .single()

  assert.ifError(insertErr)
  assert.equal(created.numero_cuenta, cuentaPrueba)
  assert.equal(created.estado, 'PENDIENTE')
  cleanupTasks.push(() =>
    supabase.from('tramites_alumnos').delete().eq('id', created.id)
  )
  console.log(`[OK] Registro persistido tras revision humana: id=${created.id}`)

  // 5. Prueba negativa CHECK Postgres (23514): numero_cuenta vacio rechazado
  const { error: checkErr } = await supabase.from('tramites_alumnos').insert({
    numero_cuenta: '   ',
    nombre_alumno: 'PRUEBA INVALIDA',
    programa_id: targetProg.id,
    tipo_tramite_id: compTipo.id,
    periodo_id: periodosDb[0].id,
    usuario_id: authData.user.id,
  })
  assert.equal(
    checkErr?.code,
    '23514',
    'Postgres debio rechazar numero_cuenta en blanco con CHECK 23514'
  )
  console.log('[OK] Prueba negativa CHECK 23514 verificada en tramites_alumnos')
  console.log('[PASS] Simulacion del Issue #15 completada')
}

try {
  await runSimulation()
} finally {
  for (const cleanup of cleanupTasks.reverse()) {
    const { error } = await cleanup()
    if (error) {
      console.warn('[WARN] Error limpiando registro de prueba:', error.message)
    }
  }
  await supabase.auth.signOut()
}
