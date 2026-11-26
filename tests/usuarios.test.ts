import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { mapSupabaseError } from '../src/services/shared/supabaseErrors.ts'
import {
  checkAdminIntegrityGuard,
  checkDeleteUsuarioGuard,
  validateCreateUsuarioInput,
  validateUpdateUsuarioInput,
} from '../src/services/usuarios/usuariosValidation.ts'

describe('usuariosValidation - alta y edicion de perfiles', () => {
  it('valida alta estandar y normaliza unidad_academica_id a null cuando no es UNIDAD_ACADEMICA', () => {
    const res = validateCreateUsuarioInput({
      nombre: '  Iris Licenciatura  ',
      email: '  Iris.Lic@UAS.EDU.MX ',
      rol: 'LICENCIATURA',
      unidad_academica_id: 99,
      activo: true,
      passwordTemporal: 'ClaveSegura2026!',
    })

    assert.equal(res.valid, true)
    if (res.valid) {
      assert.equal(res.data.nombre, 'Iris Licenciatura')
      assert.equal(res.data.email, 'iris.lic@uas.edu.mx')
      assert.equal(res.data.unidadAcademicaId, null)
    }
  })

  it('exige unidad_academica_id valida cuando el rol es UNIDAD_ACADEMICA', () => {
    const missingUnit = validateCreateUsuarioInput({
      nombre: 'Diana Informatica',
      email: 'diana.info@uas.edu.mx',
      rol: 'UNIDAD_ACADEMICA',
      unidad_academica_id: null,
      activo: true,
      passwordTemporal: 'ClaveSegura2026!',
    })

    assert.equal(missingUnit.valid, false)
    if (!missingUnit.valid) {
      assert.equal(missingUnit.field, 'unidad_academica_id')
    }

    const validUnit = validateCreateUsuarioInput({
      nombre: 'Diana Informatica',
      email: 'diana.info@uas.edu.mx',
      rol: 'UNIDAD_ACADEMICA',
      unidad_academica_id: 1,
      activo: true,
      passwordTemporal: 'ClaveSegura2026!',
    })

    assert.equal(validUnit.valid, true)
    if (validUnit.valid) {
      assert.equal(validUnit.data.unidadAcademicaId, 1)
    }
  })

  it('rechaza nombres vacios, SQLi y contrasenas menores a 8 caracteres en alta', () => {
    const emptyName = validateCreateUsuarioInput({
      nombre: '   ',
      email: 'test@uas.edu.mx',
      rol: 'BACHILLERATO',
      activo: true,
      passwordTemporal: 'ClaveSegura2026!',
    })
    assert.equal(emptyName.valid, false)

    const sqliName = validateCreateUsuarioInput({
      nombre: "Admin'; DROP TABLE perfiles;--",
      email: 'test@uas.edu.mx',
      rol: 'BACHILLERATO',
      activo: true,
      passwordTemporal: 'ClaveSegura2026!',
    })
    assert.equal(sqliName.valid, false)

    const shortPwd = validateCreateUsuarioInput({
      nombre: 'Usuario Prueba',
      email: 'test@uas.edu.mx',
      rol: 'BACHILLERATO',
      activo: true,
      passwordTemporal: '1234567',
    })
    assert.equal(shortPwd.valid, false)
  })

  it('valida actualizacion sin requerir contrasena temporal', () => {
    const res = validateUpdateUsuarioInput({
      id: '00000000-0000-0000-0000-000000000001',
      nombre: 'Diana Mazatlan',
      email: 'diana@uas.edu.mx',
      rol: 'UNIDAD_ACADEMICA',
      unidad_academica_id: 1,
      activo: false,
    })

    assert.equal(res.valid, true)
    if (res.valid) {
      assert.equal(res.data.activo, false)
      assert.equal(res.data.unidadAcademicaId, 1)
    }
  })
})

describe('usuariosValidation - guardas de integridad administrativa', () => {
  const adminUser = {
    id: 'admin-1',
    rol: 'ADMIN' as const,
    activo: true,
  }

  it('impide auto-desactivacion, auto-degradacion y dejar 0 admins activos', () => {
    assert.ok(
      checkAdminIntegrityGuard({
        targetUser: adminUser,
        nextRol: 'ADMIN',
        nextActivo: false,
        activeAdminsCount: 2,
        currentUserId: 'admin-1',
      })
    )

    assert.ok(
      checkAdminIntegrityGuard({
        targetUser: adminUser,
        nextRol: 'LICENCIATURA',
        nextActivo: true,
        activeAdminsCount: 2,
        currentUserId: 'admin-1',
      })
    )

    assert.ok(
      checkAdminIntegrityGuard({
        targetUser: adminUser,
        nextRol: 'ADMIN',
        nextActivo: false,
        activeAdminsCount: 1,
        currentUserId: 'other-admin',
      })
    )

    assert.equal(
      checkAdminIntegrityGuard({
        targetUser: adminUser,
        nextRol: 'ADMIN',
        nextActivo: false,
        activeAdminsCount: 2,
        currentUserId: 'other-admin',
      }),
      null
    )
  })

  it('impide auto-eliminacion y eliminacion del ultimo admin activo', () => {
    assert.ok(
      checkDeleteUsuarioGuard({
        targetUser: adminUser,
        activeAdminsCount: 2,
        currentUserId: 'admin-1',
      })
    )

    assert.ok(
      checkDeleteUsuarioGuard({
        targetUser: adminUser,
        activeAdminsCount: 1,
        currentUserId: 'other-admin',
      })
    )

    assert.equal(
      checkDeleteUsuarioGuard({
        targetUser: { id: 'usr-2', rol: 'LICENCIATURA', activo: true },
        activeAdminsCount: 1,
        currentUserId: 'admin-1',
      }),
      null
    )
  })
})

describe('supabaseErrors - mapeo adicional para usuarios Auth', () => {
  it('mapea user_already_exists y P0002 correctamente', () => {
    assert.equal(
      mapSupabaseError({
        code: 'user_already_exists',
        message: 'User already registered',
      }).code,
      'UNIQUE_VIOLATION'
    )
    assert.equal(mapSupabaseError({ code: 'P0002' }).code, 'SINGLE_ROW_ERROR')
  })
})
