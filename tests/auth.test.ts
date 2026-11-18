import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  containsSqlInjectionPattern,
  normalizeEmail,
  validateEmail,
  validateLoginInput,
  validateNewPassword,
  validatePassword,
  validatePasswordResetInput,
} from '../src/services/login/loginValidation.ts'
import {
  AppServiceError,
  mapSupabaseError,
} from '../src/services/shared/supabaseErrors.ts'

describe('authValidation - correo y contrasena', () => {
  it('normaliza y valida correos institucionales y estandar con @ y dominio', () => {
    const res = validateEmail('  Admin.Escolar@UAS.EDU.MX  ')
    assert.equal(res.valid, true)
    assert.equal(res.email, 'admin.escolar@uas.edu.mx')
    assert.equal(res.error, undefined)

    assert.equal(validateEmail('soporte+urs@uas.edu.mx').valid, true)
    assert.equal(normalizeEmail('  Test@Dominio.Com '), 'test@dominio.com')
  })

  it('rechaza correos en blanco o sin @ y dominio valido', () => {
    assert.equal(validateEmail('').valid, false)
    assert.equal(validateEmail('   ').valid, false)
    assert.equal(validateEmail('usuario').valid, false)
    assert.equal(validateEmail('usuario@').valid, false)
    assert.equal(validateEmail('@uas.edu.mx').valid, false)
    assert.equal(validateEmail('usuario@uas').valid, false)
    assert.equal(validateEmail('usuario@uas.c').valid, false)
    assert.equal(validateEmail('usuario..nombre@uas.edu.mx').valid, false)
    assert.equal(validateEmail('usuario nombre@uas.edu.mx').valid, false)
  })

  it('rechaza patrones de SQL injection en correo', () => {
    const payloads = [
      "admin@uas.edu.mx' OR '1'='1",
      "admin'; DROP TABLE perfiles;--@uas.edu.mx",
      'admin@uas.edu.mx--',
      '" OR 1=1 --@uas.edu.mx',
      'admin@uas.edu.mx/*comment*/',
      'admin@uas.edu.mx UNION SELECT * FROM perfiles',
      'admin(1)@uas.edu.mx',
    ]

    for (const payload of payloads) {
      assert.equal(
        containsSqlInjectionPattern(payload),
        true,
        `Debio detectar patron SQLi en: ${payload}`
      )
      const res = validateEmail(payload)
      assert.equal(res.valid, false, `Debio rechazar correo: ${payload}`)
    }
  })

  it('rechaza contrasenas vacias o solo espacios en blanco', () => {
    assert.equal(validatePassword('').valid, false)
    assert.equal(validatePassword('    ').valid, false)
    assert.equal(validatePassword('\t\n').valid, false)
    assert.equal(validatePassword('ClaveSegura2026!').valid, true)
  })

  it('valida formulario completo de login y recuperacion de contrasena', () => {
    const invalidLogin = validateLoginInput('   ', '   ')
    assert.equal(invalidLogin.valid, false)
    assert.ok(invalidLogin.errors.email)
    assert.ok(invalidLogin.errors.password)

    const validLogin = validateLoginInput('Ismael@uas.edu.mx', 'secreta123')
    assert.equal(validLogin.valid, true)
    assert.equal(validLogin.email, 'ismael@uas.edu.mx')
    assert.deepEqual(validLogin.errors, {})

    assert.equal(validatePasswordResetInput('sin-arroba').valid, false)
    assert.equal(validatePasswordResetInput('usuario@uas.edu.mx').valid, true)
  })

  it('valida nueva contrasena para recuperacion', () => {
    assert.equal(validateNewPassword('1234567', '1234567').valid, false)
    assert.equal(validateNewPassword('ClaveSegura1', 'OtraClave1').valid, false)
    assert.equal(validateNewPassword('ClaveSegura1', 'ClaveSegura1').valid, true)
  })
})

describe('supabaseErrors - mapeo de errores Auth y PostgreSQL', () => {
  it('mapea codigos Postgres y PostgREST esperados', () => {
    assert.equal(mapSupabaseError({ code: '23514' }).code, 'CHECK_VIOLATION')
    assert.equal(mapSupabaseError({ code: '23505' }).code, 'UNIQUE_VIOLATION')
    assert.equal(
      mapSupabaseError({ code: '23503' }).code,
      'FOREIGN_KEY_VIOLATION'
    )
    assert.equal(mapSupabaseError({ code: '42501' }).code, 'RLS_FORBIDDEN')
    assert.equal(mapSupabaseError({ code: '22P02' }).code, 'INVALID_ENUM')
    assert.equal(mapSupabaseError({ code: 'PGRST116' }).code, 'SINGLE_ROW_ERROR')
  })

  it('mapea errores de Supabase Auth sin exponer detalles crudos', () => {
    const invalidCreds = mapSupabaseError({
      message: 'Invalid login credentials',
      code: 'invalid_credentials',
    })
    assert.equal(invalidCreds.code, 'INVALID_CREDENTIALS')

    const rateLimited = mapSupabaseError({
      status: 429,
      code: 'over_email_send_rate_limit',
      message: 'For security purposes, you can only request this after 60 seconds.',
    })
    assert.equal(rateLimited.code, 'RATE_LIMITED')

    const networkErr = mapSupabaseError({ message: 'Failed to fetch' })
    assert.equal(networkErr.code, 'NETWORK_ERROR')

    const passthrough = new AppServiceError('INACTIVE_USER', 'Cuenta inactiva')
    assert.equal(mapSupabaseError(passthrough), passthrough)
  })
})
