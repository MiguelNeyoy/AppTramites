/**
 * Simulacion E2E del caso de uso para Issue #13 (Modulo de Nuevo Ingreso + ExcelJS).
 *
 * Ejecucion:
 *   TEST_USER_EMAIL="admin@uas.edu.mx" \
 *   TEST_USER_PASSWORD="..." \
 *   node --env-file=.env tests/simulate-issue-13.mjs
 */

import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'
import ExcelJS from 'exceljs'

import {
  NUEVO_INGRESO_EXCEL_HEADERS,
  NUEVO_INGRESO_SHEET_NAME,
  buildFichasXlsxBuffer,
} from '../src/services/fichas/fichasExcel.ts'
import { mapFichaFromDb } from '../src/services/fichas/fichasValidation.ts'

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

const signUpClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storageKey: 'sim-issue-13-signup',
    storage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    },
  },
})

const FICHAS_SELECT = `
  id,
  curp,
  a_paterno,
  a_materno,
  nombre,
  sexo,
  unidad_academica_id,
  programa_id,
  fecha_nacimiento,
  celular,
  correo,
  estatus_ficha,
  periodo_id,
  usuario_id,
  fecha_registro,
  created_at,
  updated_at,
  unidades_academicas!inner ( id, clave_ua, nombre, nivel ),
  programas_educativos!fichas_nuevo_ingreso_programa_id_fkey!inner ( id, clave_programa, nombre )
`

const cleanupTasks = []
let tempNuevoIngresoId = null
let tempLicenciaturaId = null

async function runIssueSimulation() {
  // 1. Autenticacion inicial
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: testEmail.trim().toLowerCase(),
    password: testPassword,
  })
  assert.ifError(authError)
  assert.ok(authData.user)

  const { data: perfil, error: perfilErr } = await supabase
    .from('perfiles')
    .select('id, email, nombre, rol, activo')
    .eq('id', authData.user.id)
    .single()
  assert.ifError(perfilErr)
  assert.equal(perfil.activo, true)
  console.log(`[OK] Sesion principal iniciada: ${perfil.email} (${perfil.rol})`)

  // 2. Consultar catalogos reales para ambos niveles (transversalidad)
  const [{ data: unidades, error: uaErr }, { data: programas, error: progErr }, { data: periodos, error: perErr }] =
    await Promise.all([
      supabase.from('unidades_academicas').select('id, clave_ua, nombre, nivel').eq('activa', true),
      supabase.from('programas_educativos').select('id, unidad_academica_id, clave_programa, nombre').eq('activo', true),
      supabase.from('periodos_escolares').select('id, nombre, activo').order('activo', { ascending: false }).limit(1),
    ])
  assert.ifError(uaErr)
  assert.ifError(progErr)
  assert.ifError(perErr)

  const uaMap = new Map(unidades.map((u) => [u.id, u]))
  const progLic = programas.find(
    (p) => uaMap.get(p.unidad_academica_id)?.nivel === 'LICENCIATURA'
  )
  const progPrepa = programas.find(
    (p) => uaMap.get(p.unidad_academica_id)?.nivel === 'BACHILLERATO'
  )
  const uaLic = progLic ? uaMap.get(progLic.unidad_academica_id) : undefined
  const uaPrepa = progPrepa ? uaMap.get(progPrepa.unidad_academica_id) : undefined
  assert.ok(uaLic && uaPrepa && progLic && progPrepa, 'Se requieren unidades y programas en ambos niveles')
  const periodoId = periodos[0].id

  // 3. Crear usuario temporal NUEVO_INGRESO (si somos ADMIN) para probar exactamente el rol de Ismael
  let niClient = supabase
  if (perfil.rol === 'ADMIN') {
    const suffix = Date.now()
    const niEmail = `sim13.ni.${suffix}@uas.edu.mx`
    const niPass = `SimNI13_${suffix}!`
    const { data: niSignUp, error: niErr } = await signUpClient.auth.signUp({
      email: niEmail,
      password: niPass,
      options: { data: { nombre: 'Ismael Sim 13', rol: 'NUEVO_INGRESO' } },
    })
    assert.ifError(niErr)
    tempNuevoIngresoId = niSignUp.user.id
    cleanupTasks.push(() =>
      supabase.rpc('admin_delete_usuario', { p_user_id: tempNuevoIngresoId })
    )

    niClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { error: niLoginErr } = await niClient.auth.signInWithPassword({
      email: niEmail,
      password: niPass,
    })
    assert.ifError(niLoginErr)
    console.log('[OK] Sesion temporal NUEVO_INGRESO autenticada')
  }

  // 4. Happy path transversal: NUEVO_INGRESO registra ficha en Licenciatura y Bachillerato
  const ts = String(Date.now()).slice(-2)
  const curpLic = `SIML071102HSLLRN${ts}`
  const curpPrepa = `SIMB080515MSLLRN${ts}`

  const { data: createdLic, error: createLicErr } = await niClient
    .from('fichas_nuevo_ingreso')
    .insert({
      curp: curpLic,
      a_paterno: 'LLANOS',
      a_materno: 'GARCIA',
      nombre: 'LEONARDO GAEL',
      sexo: 1,
      unidad_academica_id: uaLic.id,
      programa_id: progLic.id,
      fecha_nacimiento: '2007-11-02',
      celular: '6691234806',
      correo: 'sim13.lic@uas.edu.mx',
      estatus_ficha: 'SIN_PROCESO',
      periodo_id: periodoId,
    })
    .select(FICHAS_SELECT)
    .single()
  assert.ifError(createLicErr)
  cleanupTasks.push(() =>
    supabase.from('fichas_nuevo_ingreso').delete().eq('id', createdLic.id)
  )

  const { data: createdPrepa, error: createPrepaErr } = await niClient
    .from('fichas_nuevo_ingreso')
    .insert({
      curp: curpPrepa,
      a_paterno: 'MARTINEZ',
      a_materno: 'RODRIGUEZ',
      nombre: 'MARIA',
      sexo: 2,
      unidad_academica_id: uaPrepa.id,
      programa_id: progPrepa.id,
      fecha_nacimiento: '2008-05-15',
      celular: '6699876543',
      correo: 'sim13.prepa@uas.edu.mx',
      estatus_ficha: 'SIN_PAGO',
      periodo_id: periodoId,
    })
    .select(FICHAS_SELECT)
    .single()
  assert.ifError(createPrepaErr)
  cleanupTasks.push(() =>
    supabase.from('fichas_nuevo_ingreso').delete().eq('id', createdPrepa.id)
  )
  console.log('[OK] Fichas transversales creadas en Licenciatura y Bachillerato')

  // Actualizar estatus_ficha
  const { data: updatedLic, error: updateErr } = await niClient
    .from('fichas_nuevo_ingreso')
    .update({ estatus_ficha: 'FICHA_VENCIDA' })
    .eq('id', createdLic.id)
    .select(FICHAS_SELECT)
    .single()
  assert.ifError(updateErr)
  assert.equal(updatedLic.estatus_ficha, 'FICHA_VENCIDA')
  console.log('[OK] Actualizacion de estatus_ficha verificada')

  // 5. Generar y validar exportacion real ExcelJS con los registros de BD
  const mappedRows = [mapFichaFromDb(updatedLic), mapFichaFromDb(createdPrepa)]
  const xlsxBuffer = await buildFichasXlsxBuffer(mappedRows, {
    cicloLabel: '2026-2027',
  })
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(xlsxBuffer)
  const ws = wb.getWorksheet(NUEVO_INGRESO_SHEET_NAME)
  assert.ok(ws)
  const headers = ws.getRow(4).values
  assert.deepEqual(headers.slice(1, 11), [...NUEVO_INGRESO_EXCEL_HEADERS])
  assert.equal(ws.getCell('A5').value, curpLic)
  assert.equal(ws.getCell('H5').value, '2007/11/02')
  console.log('[OK] Exportacion ExcelJS oficial verificada desde filas de Supabase')

  // 6. Pruebas negativas de integridad en Postgres
  const { error: dupErr } = await niClient.from('fichas_nuevo_ingreso').insert({
    curp: curpLic,
    a_paterno: 'DUP',
    a_materno: 'DUP',
    nombre: 'DUPLICADO',
    sexo: 1,
    unidad_academica_id: uaLic.id,
    programa_id: progLic.id,
    fecha_nacimiento: '2007-11-02',
    celular: '6691234806',
    correo: 'dup@uas.edu.mx',
    estatus_ficha: 'SIN_PROCESO',
    periodo_id: periodoId,
  })
  assert.equal(dupErr?.code, '23505', 'Debio rechazar CURP duplicada en el mismo periodo (23505)')

  const { error: mismatchErr } = await niClient.from('fichas_nuevo_ingreso').insert({
    curp: `SIMM071102HSLLRN${ts}`,
    a_paterno: 'MISMATCH',
    a_materno: 'UA',
    nombre: 'PRUEBA',
    sexo: 1,
    unidad_academica_id: uaLic.id,
    programa_id: progPrepa.id,
    fecha_nacimiento: '2007-11-02',
    celular: '6691234806',
    correo: 'mismatch@uas.edu.mx',
    estatus_ficha: 'SIN_PROCESO',
    periodo_id: periodoId,
  })
  assert.equal(mismatchErr?.code, '23503', 'Debio rechazar programa ajeno a la escuela (23503)')
  console.log('[OK] Rechazos 23505 y 23503 verificados en Postgres')

  // 7. Prueba negativa RLS: rol LICENCIATURA no puede escribir en fichas_nuevo_ingreso (42501)
  if (perfil.rol === 'ADMIN') {
    const suffix = Date.now()
    const licEmail = `sim13.lic.${suffix}@uas.edu.mx`
    const licPass = `SimLic13_${suffix}!`
    const { data: licSignUp, error: licSignErr } = await signUpClient.auth.signUp({
      email: licEmail,
      password: licPass,
      options: { data: { nombre: 'Iris Sim 13', rol: 'LICENCIATURA' } },
    })
    assert.ifError(licSignErr)
    tempLicenciaturaId = licSignUp.user.id
    cleanupTasks.push(() =>
      supabase.rpc('admin_delete_usuario', { p_user_id: tempLicenciaturaId })
    )

    const licClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { error: licLoginErr } = await licClient.auth.signInWithPassword({
      email: licEmail,
      password: licPass,
    })
    assert.ifError(licLoginErr)

    const { error: rlsInsertErr } = await licClient.from('fichas_nuevo_ingreso').insert({
      curp: `SIMR071102HSLLRN${ts}`,
      a_paterno: 'BLOCK',
      a_materno: 'RLS',
      nombre: 'PRUEBA',
      sexo: 1,
      unidad_academica_id: uaLic.id,
      programa_id: progLic.id,
      fecha_nacimiento: '2007-11-02',
      celular: '6691234806',
      correo: 'block@uas.edu.mx',
      estatus_ficha: 'SIN_PROCESO',
      periodo_id: periodoId,
    })
    assert.equal(rlsInsertErr?.code, '42501', 'RLS debio bloquear LICENCIATURA en fichas_nuevo_ingreso')
    await licClient.auth.signOut()
    console.log('[OK] Bloqueo RLS 42501 verificado para LICENCIATURA')
  }

  if (niClient !== supabase) {
    await niClient.auth.signOut()
  }

  console.log('[PASS] Simulacion del Issue #13 completada')
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
