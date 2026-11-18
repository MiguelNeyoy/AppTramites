/**
 * Simulacion E2E del caso de uso para Issue #6 (Servicio de Login y Recuperacion).
 *
 * Ejecucion:
 *   TEST_USER_EMAIL="usuario@uas.edu.mx" \
 *   TEST_USER_PASSWORD="..." \
 *   node --env-file=.env tests/simulate-issue-6.mjs
 *
 * Opcional para probar recuperacion de contrasena (sujeto a rate limit de Auth):
 *   TEST_RESET_FLOW=1 node --env-file=.env tests/simulate-issue-6.mjs
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

const PERFIL_SELECT =
  'id, email, nombre, rol, activo, created_at, updated_at'

async function runIssueSimulation() {
  // 1. Prueba negativa de credenciales invalidas (correo no dado de alta o contrasena incorrecta)
  const { error: badCredsError } = await supabase.auth.signInWithPassword({
    email: testEmail.trim().toLowerCase(),
    password: `${testPassword}-invalida-test`,
  })
  assert.ok(badCredsError, 'Supabase Auth debio rechazar credenciales incorrectas')
  console.log('[OK] Rechazo de credenciales invalidas verificado')

  // 2. Happy path: login con correo dado de alta y validacion de perfil activo en public.perfiles
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: testEmail.trim().toLowerCase(),
    password: testPassword,
  })
  assert.ifError(authError)
  assert.ok(authData.user, 'Se esperaba usuario autenticado')
  assert.ok(authData.session, 'Se esperaba sesion activa')
  console.log(`[OK] Sesion iniciada en Supabase Auth: ${authData.user.email}`)

  const { data: perfil, error: perfilError } = await supabase
    .from('perfiles')
    .select(PERFIL_SELECT)
    .eq('id', authData.user.id)
    .single()

  assert.ifError(perfilError)
  assert.ok(perfil, 'El usuario debe existir en public.perfiles')
  assert.equal(perfil.activo, true, 'El perfil autenticado debe tener activo = true')
  console.log(`[OK] Perfil verificado en Postgres: ${perfil.nombre} (${perfil.rol})`)

  // 3. Verificacion negativa RLS: un usuario no ADMIN no debe poder escalar su propio rol
  if (perfil.rol !== 'ADMIN') {
    const { data: updatedRows, error: rlsError } = await supabase
      .from('perfiles')
      .update({ rol: 'ADMIN' })
      .eq('id', authData.user.id)
      .select('id, rol')

    const blockedByRls =
      Boolean(rlsError && rlsError.code === '42501') ||
      (Array.isArray(updatedRows) && updatedRows.length === 0)
    assert.ok(
      blockedByRls,
      'RLS debio impedir que un usuario no ADMIN escale su propio rol'
    )
    console.log('[OK] Bloqueo RLS ante auto-escalamiento de rol verificado')
  }

  // 4. Verificacion de recuperacion de contrasena (opt-in para evitar rate limits en CI)
  if (process.env.TEST_RESET_FLOW === '1') {
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      testEmail.trim().toLowerCase()
    )
    assert.ifError(resetError)
    console.log('[OK] Solicitud de recuperacion de contrasena aceptada por Supabase Auth')
  }

  console.log('[PASS] Simulacion del Issue #6 completada')
}

try {
  await runIssueSimulation()
} finally {
  await supabase.auth.signOut()
}
