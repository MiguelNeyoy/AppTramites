/**
 * Simulacion E2E del caso de uso para Issue #10 (Logica de Administracion de Usuarios).
 *
 * Ejecucion:
 *   TEST_USER_EMAIL="admin@uas.edu.mx" \
 *   TEST_USER_PASSWORD="..." \
 *   node --env-file=.env tests/simulate-issue-10.mjs
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

const adminClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const signUpClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storageKey: 'sim-issue-10-signup',
    storage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    },
  },
})

let createdTempUserId = null

async function runIssueSimulation() {
  // 1. Autenticacion del administrador y lectura del padron
  const { data: authData, error: authError } = await adminClient.auth.signInWithPassword({
    email: testEmail.trim().toLowerCase(),
    password: testPassword,
  })
  assert.ifError(authError)
  assert.ok(authData.user, 'Se esperaba sesion autenticada')

  const { data: adminPerfil, error: adminPerfilErr } = await adminClient
    .from('perfiles')
    .select('id, email, nombre, rol, unidad_academica_id, activo')
    .eq('id', authData.user.id)
    .single()
  assert.ifError(adminPerfilErr)
  assert.equal(adminPerfil.rol, 'ADMIN', 'La simulacion requiere una cuenta ADMIN')
  assert.equal(adminPerfil.activo, true)
  console.log(`[OK] Administrador autenticado: ${adminPerfil.email}`)

  const { data: allPerfiles, error: listErr } = await adminClient
    .from('perfiles')
    .select('id, email, nombre, rol, unidad_academica_id, activo')
  assert.ifError(listErr)
  assert.ok(allPerfiles.length >= 1)
  console.log(`[OK] Padron consultado: ${allPerfiles.length} perfiles`)

  const { data: uaInfo, error: uaErr } = await adminClient
    .from('unidades_academicas')
    .select('id, clave_ua, nombre')
    .eq('clave_ua', '4800')
    .single()
  assert.ifError(uaErr)

  // 2. Happy path: alta de cuenta UNIDAD_ACADEMICA (4800) sin pisar sesion del ADMIN
  const suffix = Date.now()
  const tempEmail = `sim10.diana.${suffix}@uas.edu.mx`
  const tempPassword = `SimPass10_${suffix}!`

  const { data: signUpRes, error: signUpErr } = await signUpClient.auth.signUp({
    email: tempEmail,
    password: tempPassword,
    options: {
      data: {
        nombre: `Diana Prueba ${suffix}`,
        rol: 'UNIDAD_ACADEMICA',
        unidad_academica_id: uaInfo.id,
      },
    },
  })
  assert.ifError(signUpErr)
  assert.ok(signUpRes.user?.id, 'Debio crearse usuario en Supabase Auth')
  createdTempUserId = signUpRes.user.id

  // Verificar que la sesion del administrador sigue intacta
  const { data: stillAdmin } = await adminClient.auth.getUser()
  assert.equal(stillAdmin.user?.id, authData.user.id)

  const { data: createdPerfil, error: createdPerfilErr } = await adminClient
    .from('perfiles')
    .select('id, email, nombre, rol, unidad_academica_id, activo')
    .eq('id', createdTempUserId)
    .single()
  assert.ifError(createdPerfilErr)
  assert.equal(createdPerfil.rol, 'UNIDAD_ACADEMICA')
  assert.equal(createdPerfil.unidad_academica_id, uaInfo.id)
  console.log(`[OK] Usuario creado con rol=${createdPerfil.rol} y ua=${uaInfo.clave_ua}`)

  // 3. Happy path: edicion via RPC admin_update_usuario (nombre, email y estado inactivo)
  const updatedEmail = `sim10.diana.edit.${suffix}@uas.edu.mx`
  const { data: updatedPerfil, error: updateErr } = await adminClient.rpc(
    'admin_update_usuario',
    {
      p_user_id: createdTempUserId,
      p_nombre: `Diana Editada ${suffix}`,
      p_email: updatedEmail,
      p_rol: 'UNIDAD_ACADEMICA',
      p_activo: false,
      p_unidad_academica_id: uaInfo.id,
    }
  )
  assert.ifError(updateErr)
  assert.equal(updatedPerfil.email, updatedEmail)
  assert.equal(updatedPerfil.activo, false)
  console.log('[OK] Edicion y desactivacion via admin_update_usuario verificadas')

  // Reactivar para probar que el usuario no-ADMIN queda bloqueado al invocar la RPC
  const { error: reactivateErr } = await adminClient.rpc('admin_update_usuario', {
    p_user_id: createdTempUserId,
    p_nombre: `Diana Editada ${suffix}`,
    p_email: updatedEmail,
    p_rol: 'UNIDAD_ACADEMICA',
    p_activo: true,
    p_unidad_academica_id: uaInfo.id,
  })
  assert.ifError(reactivateErr)

  // 4. Caso negativo de seguridad (RLS / RPC 42501): un usuario no-ADMIN no puede editar ni eliminar
  const nonAdminClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { error: tempLoginErr } = await nonAdminClient.auth.signInWithPassword({
    email: updatedEmail,
    password: tempPassword,
  })
  assert.ifError(tempLoginErr)

  const { error: forbiddenUpdateErr } = await nonAdminClient.rpc('admin_update_usuario', {
    p_user_id: authData.user.id,
    p_nombre: 'Hack',
    p_email: adminPerfil.email,
    p_rol: 'ADMIN',
    p_activo: true,
  })
  assert.equal(forbiddenUpdateErr?.code, '42501', 'Debio bloquear RPC administrativa a no-ADMIN')

  const { error: forbiddenDeleteErr } = await nonAdminClient.rpc('admin_delete_usuario', {
    p_user_id: authData.user.id,
  })
  assert.equal(forbiddenDeleteErr?.code, '42501', 'Debio bloquear borrado a no-ADMIN')
  await nonAdminClient.auth.signOut()
  console.log('[OK] Bloqueo 42501 verificado para usuario no-ADMIN')

  // 5. Caso negativo de integridad (23514): ADMIN no puede auto-desactivarse
  const { error: selfDeactivateErr } = await adminClient.rpc('admin_update_usuario', {
    p_user_id: authData.user.id,
    p_nombre: adminPerfil.nombre,
    p_email: adminPerfil.email,
    p_rol: 'ADMIN',
    p_activo: false,
  })
  assert.equal(selfDeactivateErr?.code, '23514', 'Debio impedir auto-desactivacion de ADMIN')
  console.log('[OK] Rechazo 23514 ante auto-desactivacion de ADMIN verificado')

  console.log('[PASS] Simulacion del Issue #10 completada')
}

try {
  await runIssueSimulation()
} finally {
  if (createdTempUserId) {
    const { error: deleteErr } = await adminClient.rpc('admin_delete_usuario', {
      p_user_id: createdTempUserId,
    })
    if (deleteErr) {
      console.warn('[WARN] Error eliminando usuario temporal:', deleteErr.message)
    } else {
      console.log('[OK] Usuario temporal eliminado via admin_delete_usuario en limpieza')
    }
  }
  await adminClient.auth.signOut()
}
