/**
 * Plantilla portable de simulacion de caso de uso por Issue (Supabase / PostgreSQL).
 *
 * Ejecucion:
 *   TEST_USER_EMAIL="usuario@dominio" \
 *   TEST_USER_PASSWORD="..." \
 *   node --env-file=.env ruta/a/simulate-issue-<NUMERO>.mjs
 *
 * Adapta los pasos 1-4 a las tablas, roles y criterios de aceptacion del issue.
 * Nunca guardes credenciales reales en este archivo.
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
  // 1. Autenticacion y verificacion de identidad/rol
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  })
  assert.ifError(authError)
  assert.ok(authData.user, 'Se esperaba sesion autenticada')
  console.log(`[OK] Sesion iniciada: ${authData.user.email}`)

  // Verifica perfil/rol segun la tabla del proyecto (ej. perfiles)
  // const { data: perfil, error: perfilError } = await supabase
  //   .from('perfiles')
  //   .select('id, rol, activo')
  //   .eq('id', authData.user.id)
  //   .single()
  // assert.ifError(perfilError)
  // assert.equal(perfil.activo, true)

  // 2. Happy Path: replica las consultas/mutaciones exactas del issue
  // const { data: created, error: createError } = await supabase
  //   .from('<tabla>')
  //   .insert({ ...payloadValido })
  //   .select('id')
  //   .single()
  // assert.ifError(createError)
  // cleanupTasks.push(() => supabase.from('<tabla>').delete().eq('id', created.id))

  // 3. Casos negativos de Postgres (CHECK / UNIQUE / RESTRICT / RLS)
  // const { error: rejectedError } = await supabase
  //   .from('<tabla>')
  //   .insert({ ...payloadInvalido })
  // assert.ok(rejectedError, 'Postgres debio rechazar la operacion invalida')
  // assert.ok(['23514', '23505', '23503', '42501'].includes(rejectedError.code ?? ''))

  console.log('[PASS] Simulacion del caso de uso completada')
}

try {
  await runIssueSimulation()
} finally {
  // 4. Limpieza en orden inverso para respetar llaves foraneas
  for (const cleanup of cleanupTasks.reverse()) {
    const { error } = await cleanup()
    if (error) {
      console.warn('[WARN] Error en limpieza de datos de prueba:', error.message)
    }
  }
  await supabase.auth.signOut()
}
