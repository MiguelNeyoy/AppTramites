/**
 * Simulacion E2E del caso de uso para Issue #8 (Catalogos Institucionales).
 *
 * Ejecucion:
 *   TEST_USER_EMAIL="admin@uas.edu.mx" \
 *   TEST_USER_PASSWORD="..." \
 *   node --env-file=.env tests/simulate-issue-8.mjs
 */

import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'

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

async function runIssueSimulation() {
  // 1. Autenticacion y verificacion de perfil activo
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: testEmail.trim().toLowerCase(),
    password: testPassword,
  })
  assert.ifError(authError)
  assert.ok(authData.user, 'Se esperaba sesion autenticada')
  console.log(`[OK] Sesion iniciada: ${authData.user.email}`)

  const { data: perfil, error: perfilError } = await supabase
    .from('perfiles')
    .select('id, rol, activo')
    .eq('id', authData.user.id)
    .single()
  assert.ifError(perfilError)
  assert.equal(perfil.activo, true)
  console.log(`[OK] Perfil activo verificado con rol: ${perfil.rol}`)

  // 2. Consulta global de los 4 catalogos (unidades, programas, tipos_tramite, periodos)
  const [unidadesRes, programasRes, tramitesRes, periodosRes] = await Promise.all([
    supabase
      .from('unidades_academicas')
      .select('id, clave_ua, nombre, nivel, activa, created_at')
      .order('clave_ua', { ascending: true }),
    supabase
      .from('programas_educativos')
      .select('id, unidad_academica_id, clave_programa, nombre, activo, created_at')
      .order('clave_programa', { ascending: true }),
    supabase
      .from('tipos_tramite')
      .select('id, nombre, modulo, permite_pdf, activo, created_at')
      .order('id', { ascending: true }),
    supabase
      .from('periodos_escolares')
      .select('id, nombre, numero_periodo, fecha_inicio, fecha_fin, activo, created_at')
      .order('fecha_inicio', { ascending: false }),
  ])

  assert.ifError(unidadesRes.error)
  assert.ifError(programasRes.error)
  assert.ifError(tramitesRes.error)
  assert.ifError(periodosRes.error)
  console.log(
    `[OK] Catalogo consultado: ${unidadesRes.data.length} unidades, ${programasRes.data.length} programas, ${tramitesRes.data.length} tramites, ${periodosRes.data.length} periodos`
  )

  const suffix = String(Date.now()).slice(-6)

  // 3. Si es ADMIN, prueba happy path CRUD + pruebas negativas de integridad Postgres
  if (perfil.rol === 'ADMIN') {
    const { data: createdUa, error: uaCreateErr } = await supabase
      .from('unidades_academicas')
      .insert({
        clave_ua: `T${suffix}`,
        nombre: `Unidad Prueba ${suffix}`,
        nivel: 'BACHILLERATO',
        activa: true,
      })
      .select('id, clave_ua, nombre, nivel, activa')
      .single()
    assert.ifError(uaCreateErr)
    cleanupTasks.push(() =>
      supabase.from('unidades_academicas').delete().eq('id', createdUa.id)
    )

    const { data: updatedUa, error: uaUpdateErr } = await supabase
      .from('unidades_academicas')
      .update({ activa: false, nombre: `Unidad Editada ${suffix}` })
      .eq('id', createdUa.id)
      .select('id, nombre, activa')
      .single()
    assert.ifError(uaUpdateErr)
    assert.equal(updatedUa.activa, false)

    const { data: createdProg, error: progCreateErr } = await supabase
      .from('programas_educativos')
      .insert({
        unidad_academica_id: createdUa.id,
        clave_programa: `P${suffix}`,
        nombre: `Programa Prueba ${suffix}`,
        activo: true,
      })
      .select('id, unidad_academica_id, clave_programa, nombre')
      .single()
    assert.ifError(progCreateErr)
    cleanupTasks.push(() =>
      supabase.from('programas_educativos').delete().eq('id', createdProg.id)
    )

    const { data: createdTramite, error: tramiteCreateErr } = await supabase
      .from('tipos_tramite')
      .insert({
        nombre: `Tramite Prueba ${suffix}`,
        modulo: 'TRAMITES_GENERALES',
        permite_pdf: false,
        activo: true,
      })
      .select('id, nombre, modulo')
      .single()
    assert.ifError(tramiteCreateErr)
    cleanupTasks.push(() =>
      supabase.from('tipos_tramite').delete().eq('id', createdTramite.id)
    )

    const { data: createdPeriodo, error: periodoCreateErr } = await supabase
      .from('periodos_escolares')
      .insert({
        nombre: `Prueba-${suffix}`,
        numero_periodo: 1,
        fecha_inicio: '2026-08-01',
        fecha_fin: '2026-12-15',
        activo: false,
      })
      .select('id, nombre')
      .single()
    assert.ifError(periodoCreateErr)
    cleanupTasks.push(() =>
      supabase.from('periodos_escolares').delete().eq('id', createdPeriodo.id)
    )

    console.log('[OK] Happy path CRUD (crear, editar, consultar) en los 4 catalogos verificado')

    // Pruebas negativas Postgres: FK inexistente (23503) y fecha_fin < fecha_inicio (23514)
    const { error: fkErr } = await supabase.from('programas_educativos').insert({
      unidad_academica_id: 99999999,
      clave_programa: `FK${suffix}`,
      nombre: 'Programa Huerfano',
      activo: true,
    })
    assert.ok(fkErr, 'Postgres debio rechazar FK inexistente')
    assert.equal(fkErr.code, '23503')

    const { error: checkErr } = await supabase.from('periodos_escolares').insert({
      nombre: `BadDate-${suffix}`,
      numero_periodo: 1,
      fecha_inicio: '2026-12-01',
      fecha_fin: '2026-08-01',
      activo: false,
    })
    assert.ok(checkErr, 'Postgres debio rechazar fecha_fin < fecha_inicio')
    assert.ok(['23514', '23505'].includes(checkErr.code ?? ''))
    console.log('[OK] Pruebas negativas Postgres (23503 / 23514) verificadas')
  } else {
    // 4. Si el rol NO es ADMIN, verificar bloqueo RLS en escritura de catalogo
    const { error: rlsErr } = await supabase.from('unidades_academicas').insert({
      clave_ua: `X${suffix}`,
      nombre: `Bloqueada RLS ${suffix}`,
      nivel: 'BACHILLERATO',
      activa: true,
    })
    assert.ok(rlsErr, 'RLS debio rechazar insercion en catalogo para rol no ADMIN')
    assert.equal(rlsErr.code, '42501')
    console.log('[OK] Bloqueo RLS (42501) para usuario no ADMIN verificado')
  }

  console.log('[PASS] Simulacion del Issue #8 completada')
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
