/**
 * Simulacion E2E del caso de uso para Issue #7 y #14 (Formulario y Tabla de Tramites por Alumno).
 *
 * Ejecucion:
 *   TEST_USER_EMAIL="admin@uas.edu.mx" \
 *   TEST_USER_PASSWORD="..." \
 *   node --env-file=.env tests/simulate-issue-7.mjs
 */

import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'

import {
  mapTramiteFromDb,
  summarizeTramitesByEstado,
} from '../src/services/tramites/tramitesValidation.ts'

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

const TRAMITES_SELECT = `
  id,
  folio,
  numero_cuenta,
  nombre_alumno,
  programa_id,
  tipo_tramite_id,
  periodo_id,
  usuario_id,
  fecha_registro,
  estado,
  observaciones,
  archivo_pdf_url,
  created_at,
  updated_at,
  programas_educativos!inner (
    id,
    clave_programa,
    nombre,
    unidad_academica_id,
    unidades_academicas!inner ( id, clave_ua, nombre, nivel )
  ),
  tipos_tramite!inner ( id, nombre, modulo, permite_pdf )
`

const cleanupTasks = []

async function runIssueSimulation() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: testEmail.trim().toLowerCase(),
    password: testPassword,
  })
  assert.ifError(authError)
  assert.ok(authData.user)

  const [{ data: programas, error: progErr }, { data: tipos, error: tipoErr }, { data: periodos, error: perErr }] =
    await Promise.all([
      supabase.from('programas_educativos').select('id').eq('activo', true).limit(1),
      supabase
        .from('tipos_tramite')
        .select('id, nombre')
        .eq('modulo', 'TRAMITES_GENERALES')
        .eq('activo', true)
        .limit(1),
      supabase
        .from('periodos_escolares')
        .select('id')
        .order('activo', { ascending: false })
        .limit(1),
    ])

  assert.ifError(progErr)
  assert.ifError(tipoErr)
  assert.ifError(perErr)
  assert.ok(programas?.length && tipos?.length && periodos?.length)

  const suffix = String(Date.now()).slice(-6)
  const manualFolio = `SIM-${suffix}`

  // Happy path: insertar tramite por alumno con folio manual y verificar normalizacion + estado
  const { data: created, error: createErr } = await supabase
    .from('tramites_alumnos')
    .insert({
      folio: ` ${manualFolio.toLowerCase()} `,
      numero_cuenta: `2026${suffix}`,
      nombre_alumno: `ALUMNO SIM ${suffix}`,
      programa_id: programas[0].id,
      tipo_tramite_id: tipos[0].id,
      periodo_id: periodos[0].id,
      fecha_registro: new Date().toISOString().slice(0, 10),
      estado: 'PENDIENTE',
      observaciones: 'Simulacion Issue #7 + #14',
    })
    .select(TRAMITES_SELECT)
    .single()

  assert.ifError(createErr)
  cleanupTasks.push(() =>
    supabase.from('tramites_alumnos').delete().eq('id', created.id)
  )

  const mapped = mapTramiteFromDb(created)
  assert.equal(mapped.folio, manualFolio)
  assert.equal(mapped.estado, 'PENDIENTE')
  console.log(`[OK] Tramite creado con folio=${mapped.folio} (${mapped.nombreTramite})`)

  // Negativo UNIQUE (23505): folio duplicado en mismo tramite y periodo
  const { error: dupFolioErr } = await supabase.from('tramites_alumnos').insert({
    folio: manualFolio.toLowerCase(),
    numero_cuenta: `2026${suffix}B`,
    nombre_alumno: `ALUMNO DUP ${suffix}`,
    programa_id: programas[0].id,
    tipo_tramite_id: tipos[0].id,
    periodo_id: periodos[0].id,
    fecha_registro: new Date().toISOString().slice(0, 10),
    estado: 'PENDIENTE',
  })
  assert.equal(dupFolioErr?.code, '23505', 'Postgres debio rechazar folio duplicado con 23505')
  console.log('[OK] Rechazo 23505 por folio duplicado verificado')

  // Happy path sin folio (NULL opcional)
  const { data: sinFolio, error: sinFolioErr } = await supabase
    .from('tramites_alumnos')
    .insert({
      folio: null,
      numero_cuenta: `2026${suffix}C`,
      nombre_alumno: `ALUMNO SIN FOLIO ${suffix}`,
      programa_id: programas[0].id,
      tipo_tramite_id: tipos[0].id,
      periodo_id: periodos[0].id,
      fecha_registro: new Date().toISOString().slice(0, 10),
      estado: 'PENDIENTE',
    })
    .select('id, folio')
    .single()
  assert.ifError(sinFolioErr)
  assert.equal(sinFolio.folio, null)
  cleanupTasks.push(() =>
    supabase.from('tramites_alumnos').delete().eq('id', sinFolio.id)
  )
  console.log('[OK] Alta opcional con folio NULL verificada')

  // Actualizar estado a RESUELTO (accion directa en tabla de TramitesAlumnosView)
  const { data: updated, error: updateErr } = await supabase
    .from('tramites_alumnos')
    .update({ estado: 'RESUELTO' })
    .eq('id', created.id)
    .select(TRAMITES_SELECT)
    .single()

  assert.ifError(updateErr)
  const summary = summarizeTramitesByEstado([mapTramiteFromDb(updated)])
  assert.deepEqual(summary, { total: 1, pendientes: 0, resueltos: 1, conError: 0 })
  console.log('[OK] Actualizacion de estado a RESUELTO y conteos verificados')

  // Negativo CHECK (23514): numero_cuenta vacio
  const { error: checkErr } = await supabase.from('tramites_alumnos').insert({
    numero_cuenta: '   ',
    nombre_alumno: 'INVALIDO',
    programa_id: programas[0].id,
    tipo_tramite_id: tipos[0].id,
    periodo_id: periodos[0].id,
  })
  assert.equal(checkErr?.code, '23514', 'Postgres debio rechazar numero_cuenta vacio con 23514')
  console.log('[OK] Rechazo 23514 verificado en tramites_alumnos')

  console.log('[PASS] Simulacion de Issues #7 y #14 completada')
}

try {
  await runIssueSimulation()
} finally {
  for (const cleanup of cleanupTasks.reverse()) {
    const { error } = await cleanup()
    if (error) {
      console.warn('[WARN] Error en limpieza de datos de prueba:', error.message)
    }
  }
  await supabase.auth.signOut()
}
