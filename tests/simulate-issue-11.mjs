/**
 * Simulacion E2E del caso de uso para Issue #11 (Migracion DB, RLS y tipos).
 *
 * Ejecucion:
 *   TEST_USER_EMAIL="admin@uas.edu.mx" \
 *   TEST_USER_PASSWORD="..." \
 *   node --env-file=.env tests/simulate-issue-11.mjs
 *
 * Opcional para probar tambien sesion acotada de Diana (UNIDAD_ACADEMICA clave 4800):
 *   TEST_DIANA_EMAIL="diana.informatica@uas.edu.mx" \
 *   TEST_DIANA_PASSWORD="..." \
 *   node --env-file=.env tests/simulate-issue-11.mjs
 */

import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
const testEmail = process.env.TEST_USER_EMAIL
const testPassword = process.env.TEST_USER_PASSWORD
const dianaEmail = process.env.TEST_DIANA_EMAIL
const dianaPassword = process.env.TEST_DIANA_PASSWORD

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
  // 1. Autenticacion y verificacion del nuevo campo unidad_academica_id en perfiles
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: testEmail.trim().toLowerCase(),
    password: testPassword,
  })
  assert.ifError(authError)
  assert.ok(authData.user, 'Se esperaba usuario autenticado')

  const { data: perfil, error: perfilError } = await supabase
    .from('perfiles')
    .select('id, email, nombre, rol, unidad_academica_id, activo')
    .eq('id', authData.user.id)
    .single()
  assert.ifError(perfilError)
  assert.equal(perfil.activo, true)
  console.log(`[OK] Perfil verificado: ${perfil.nombre} (${perfil.rol}, ua=${perfil.unidad_academica_id})`)

  // 2. Consultar catalogos base para construir payloads reales
  const [{ data: programas, error: progErr }, { data: tramites, error: tramErr }, { data: periodos, error: perErr }] =
    await Promise.all([
      supabase
        .from('programas_educativos')
        .select('id, unidad_academica_id, clave_programa, nombre')
        .limit(5),
      supabase
        .from('tipos_tramite')
        .select('id, nombre, modulo')
        .eq('modulo', 'TRAMITES_GENERALES')
        .limit(1),
      supabase
        .from('periodos_escolares')
        .select('id, nombre')
        .order('activo', { ascending: false })
        .limit(1),
    ])

  assert.ifError(progErr)
  assert.ifError(tramErr)
  assert.ifError(perErr)
  assert.ok(programas?.length > 0 && tramites?.length > 0 && periodos?.length > 0, 'Catalogos base requeridos')

  const targetPrograma = programas[0]
  const targetTramite = tramites[0]
  const targetPeriodo = periodos[0]
  const uniqueSuffix = String(Date.now()).slice(-6)

  // 3. Happy path en tramites_alumnos: folio manual unico por tramite/periodo y estado default
  if (perfil.rol !== 'NUEVO_INGRESO') {
    const manualFolio = `SIM11-${uniqueSuffix}`
    const { data: createdTramite, error: createTramiteErr } = await supabase
      .from('tramites_alumnos')
      .insert({
        folio: manualFolio,
        numero_cuenta: `2026${uniqueSuffix}`,
        nombre_alumno: `Alumno Simulacion ${uniqueSuffix}`,
        programa_id: targetPrograma.id,
        tipo_tramite_id: targetTramite.id,
        periodo_id: targetPeriodo.id,
        usuario_id: authData.user.id,
      })
      .select('id, folio, estado, fecha_registro')
      .single()

    assert.ifError(createTramiteErr)
    assert.equal(createdTramite.folio, manualFolio)
    assert.equal(createdTramite.estado, 'PENDIENTE')
    cleanupTasks.push(() =>
      supabase.from('tramites_alumnos').delete().eq('id', createdTramite.id)
    )
    console.log(`[OK] tramites_alumnos creado con folio=${createdTramite.folio} y estado=${createdTramite.estado}`)

    // Negativo CHECK: numero_cuenta en blanco (23514)
    const { error: blankAccountErr } = await supabase.from('tramites_alumnos').insert({
      numero_cuenta: '   ',
      nombre_alumno: 'Alumno Invalido',
      programa_id: targetPrograma.id,
      tipo_tramite_id: targetTramite.id,
      periodo_id: targetPeriodo.id,
      usuario_id: authData.user.id,
    })
    assert.equal(blankAccountErr?.code, '23514', 'Postgres debio rechazar numero_cuenta vacio con 23514')
    console.log('[OK] Rechazo 23514 verificado en tramites_alumnos')
  }

  // 4. Happy path + negativos en fichas_nuevo_ingreso (ADMIN / NUEVO_INGRESO)
  if (perfil.rol === 'ADMIN' || perfil.rol === 'NUEVO_INGRESO') {
    const testCurp = `TEST071102HSLLRN${uniqueSuffix.slice(0, 2)}`
    const { data: createdFicha, error: createFichaErr } = await supabase
      .from('fichas_nuevo_ingreso')
      .insert({
        curp: testCurp,
        a_paterno: 'LLANOS',
        a_materno: 'GARCIA',
        nombre: 'ASPIRANTE PRUEBA',
        sexo: 1,
        unidad_academica_id: targetPrograma.unidad_academica_id,
        programa_id: targetPrograma.id,
        fecha_nacimiento: '2007-11-02',
        celular: '6691234806',
        correo: 'aspirante.prueba@uas.edu.mx',
        estatus_ficha: 'SIN_PAGO',
        periodo_id: targetPeriodo.id,
        usuario_id: authData.user.id,
      })
      .select('id, curp, estatus_ficha')
      .single()

    assert.ifError(createFichaErr)
    cleanupTasks.push(() =>
      supabase.from('fichas_nuevo_ingreso').delete().eq('id', createdFicha.id)
    )
    console.log(`[OK] fichas_nuevo_ingreso creada para CURP=${createdFicha.curp}`)

    // Negativo CHECK: sexo invalido (23514)
    const { error: invalidSexErr } = await supabase.from('fichas_nuevo_ingreso').insert({
      curp: `TSEX071102HSLLRN${uniqueSuffix.slice(0, 2)}`,
      a_paterno: 'TEST',
      a_materno: 'TEST',
      nombre: 'INVALIDO',
      sexo: 3,
      unidad_academica_id: targetPrograma.unidad_academica_id,
      programa_id: targetPrograma.id,
      fecha_nacimiento: '2007-11-02',
      celular: '6691234806',
      correo: 'invalido@uas.edu.mx',
      periodo_id: targetPeriodo.id,
      usuario_id: authData.user.id,
    })
    assert.equal(invalidSexErr?.code, '23514', 'Postgres debio rechazar sexo = 3 con 23514')
    console.log('[OK] Rechazo 23514 verificado en fichas_nuevo_ingreso')
  }

  // 5. Prueba opcional de Diana (rol UNIDAD_ACADEMICA)
  if (dianaEmail && dianaPassword) {
    const dianaClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: dianaAuth, error: dianaAuthErr } = await dianaClient.auth.signInWithPassword({
      email: dianaEmail.trim().toLowerCase(),
      password: dianaPassword,
    })
    assert.ifError(dianaAuthErr)

    const { data: dianaPerfil, error: dianaPerfilErr } = await dianaClient
      .from('perfiles')
      .select('id, rol, unidad_academica_id')
      .eq('id', dianaAuth.user.id)
      .single()
    assert.ifError(dianaPerfilErr)
    assert.equal(dianaPerfil.rol, 'UNIDAD_ACADEMICA')
    assert.ok(dianaPerfil.unidad_academica_id, 'Diana debe tener unidad_academica_id asignada')

    const { data: unidadesVisibles, error: uaErr } = await dianaClient
      .from('unidades_academicas')
      .select('id, clave_ua')
    assert.ifError(uaErr)
    assert.equal(unidadesVisibles.length, 1, 'Diana solo debe visualizar 1 unidad academica')
    await dianaClient.auth.signOut()
    console.log(`[OK] Aislamiento RLS de Diana verificado (${unidadesVisibles[0].clave_ua})`)
  }

  console.log('[PASS] Simulacion del Issue #11 completada')
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
