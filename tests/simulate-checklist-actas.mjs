/**
 * Simulacion E2E del Checklist de Actas por periodos, etapas y RLS en Supabase local.
 *
 * Ejecucion:
 *   node --env-file=.env tests/simulate-checklist-actas.mjs
 */

import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
const rawEnvEmail = process.env.TEST_USER_EMAIL
const simEmail =
  process.env.SIM_USER_EMAIL ||
  (rawEnvEmail && rawEnvEmail.includes('@') ? rawEnvEmail : 'admin@uas.edu.mx')
const simPassword = process.env.SIM_USER_PASSWORD || process.env.TEST_USER_PASSWORD

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en el entorno o .env')
  process.exit(1)
}

if (!simEmail || !simPassword) {
  console.error('Faltan credenciales de prueba para autenticar la simulacion')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const createdChecklistIds = []

async function runChecklistSimulation() {
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: simEmail.trim().toLowerCase(),
    password: simPassword,
  })
  assert.ifError(authErr)
  assert.ok(authData.user, 'Se esperaba usuario autenticado')

  const { data: perfil, error: perfilErr } = await supabase
    .from('perfiles')
    .select('id, nombre, rol, activo')
    .eq('id', authData.user.id)
    .single()
  assert.ifError(perfilErr)
  assert.equal(perfil.activo, true)
  console.log(`[OK] Autenticado como ${perfil.nombre} (${perfil.rol})`)

  const { data: responsables, error: respErr } = await supabase.rpc(
    'list_responsables_actas'
  )
  assert.ifError(respErr)
  assert.ok(Array.isArray(responsables) && responsables.length > 0, 'Se esperaba al menos un responsable')
  console.log(`[OK] RPC list_responsables_actas devolvio ${responsables.length} responsable(s)`)

  const [{ data: periodos, error: perErr }, { data: programas, error: progErr }] =
    await Promise.all([
      supabase
        .from('periodos_escolares')
        .select('id, nombre, numero_periodo')
        .order('numero_periodo', { ascending: true }),
      supabase
        .from('programas_educativos')
        .select('id, clave_programa, nombre')
        .eq('activo', true)
        .limit(1),
    ])

  assert.ifError(perErr)
  assert.ifError(progErr)
  assert.ok(programas && programas.length > 0, 'Se requiere al menos un programa educativo activo')

  const periodo1 = periodos.find((p) => p.numero_periodo === 1)
  const periodo2 = periodos.find((p) => p.numero_periodo === 2)
  assert.ok(periodo1 && periodo2, 'Se requieren Periodo 1 y Periodo 2 en periodos_escolares')

  const targetPrograma = programas[0]

  // 1. Happy path en Periodo 1: ORDINARIA = GENERADA y verificacion de aislamiento contra Periodo 2
  const { data: p1Saved, error: p1Err } = await supabase
    .from('checklists_actas')
    .upsert(
      {
        periodo_id: periodo1.id,
        programa_id: targetPrograma.id,
        tipo_acta: 'ORDINARIA',
        estado: 'GENERADA',
      },
      { onConflict: 'periodo_id,programa_id,tipo_acta' }
    )
    .select('id, periodo_id, programa_id, tipo_acta, estado, responsable_id, actualizado_por')
    .single()

  assert.ifError(p1Err)
  assert.ok(p1Saved?.id)
  createdChecklistIds.push(p1Saved.id)
  assert.equal(p1Saved.actualizado_por, authData.user.id)
  assert.equal(p1Saved.responsable_id, authData.user.id)
  console.log(`[OK] Periodo 1 ORDINARIA guardada con responsable_id automatico (${p1Saved.id})`)

  const { data: p2Check, error: p2CheckErr } = await supabase
    .from('checklists_actas')
    .select('id')
    .eq('periodo_id', periodo2.id)
    .eq('programa_id', targetPrograma.id)
  assert.ifError(p2CheckErr)
  assert.equal(p2Check.length, 0, 'Periodo 2 debe mantenerse en blanco e independiente')
  console.log('[OK] Periodo 2 verificado en blanco al guardar Periodo 1')

  // 2. Prueba negativa Postgres (23514): bloquear PROMOCION_GRADO en Periodo 1
  const { error: p1BlockedErr } = await supabase
    .from('checklists_actas')
    .insert({
      periodo_id: periodo1.id,
      programa_id: targetPrograma.id,
      tipo_acta: 'PROMOCION_GRADO',
      estado: 'GENERADA',
    })
  assert.ok(p1BlockedErr, 'Postgres debio rechazar PROMOCION_GRADO en Periodo 1')
  assert.equal(p1BlockedErr.code, '23514')
  console.log('[OK] Trigger Postgres bloqueo PROMOCION_GRADO en Periodo 1 con codigo 23514')

  // 3. Happy path en Periodo 2: PROMOCION_GRADO y CIERRE_CICLO permitidos
  for (const tipoActa of ['PROMOCION_GRADO', 'CIERRE_CICLO']) {
    const { data: p2Saved, error: p2Err } = await supabase
      .from('checklists_actas')
      .upsert(
        {
          periodo_id: periodo2.id,
          programa_id: targetPrograma.id,
          tipo_acta: tipoActa,
          estado: 'GENERADA',
        },
        { onConflict: 'periodo_id,programa_id,tipo_acta' }
      )
      .select('id, tipo_acta, estado')
      .single()

    assert.ifError(p2Err)
    assert.ok(p2Saved?.id)
    createdChecklistIds.push(p2Saved.id)
    assert.equal(p2Saved.estado, 'GENERADA')
  }
  console.log('[OK] Periodo 2 guardo PROMOCION_GRADO y CIERRE_CICLO correctamente')
}

try {
  await runChecklistSimulation()
  console.log('[PASS] Simulacion Checklist de Actas completada con exito.')
} finally {
  if (createdChecklistIds.length > 0) {
    const { error: cleanupErr } = await supabase
      .from('checklists_actas')
      .delete()
      .in('id', createdChecklistIds)
    if (cleanupErr) {
      console.error('[WARN] No se pudieron limpiar registros de prueba:', cleanupErr.message)
    } else {
      console.log(`[CLEANUP] ${createdChecklistIds.length} registro(s) de prueba eliminados.`)
    }
  }
}
