const MAX_EMAIL_LENGTH = 254
const MAX_PASSWORD_LENGTH = 128
const MIN_RECOVERY_PASSWORD_LENGTH = 8

// Patron estricto de correo: exige parte local segura, @ y dominio con TLD alfabetico >= 2 caracteres.
// Excluye deliberadamente comillas, punto y coma, espacios y caracteres usados en inyeccion SQL.
const STRICT_EMAIL_REGEX =
  /^[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}$/i

// Detecta caracteres y secuencias tipicas de SQL injection antes de enviar datos al API.
const SQL_INJECTION_CHAR_REGEX = /['";\\<>()\0]/
const SQL_COMMENT_REGEX = /(--|\/\*|\*\/)/
const SQL_KEYWORD_INJECTION_REGEX =
  /\b(union\s+select|select\s+.+\s+from|insert\s+into|delete\s+from|drop\s+table|update\s+\w+\s+set|or\s+1\s*=\s*1|and\s+1\s*=\s*1|sleep\s*\(|pg_sleep\s*\()\b/i

export interface EmailValidationResult {
  valid: boolean
  email: string
  error?: string
}

export interface PasswordValidationResult {
  valid: boolean
  error?: string
}

export interface LoginValidationResult {
  valid: boolean
  email: string
  errors: {
    email?: string
    password?: string
  }
}

export function normalizeEmail(rawEmail: string): string {
  return rawEmail.trim().toLowerCase()
}

export function containsSqlInjectionPattern(value: string): boolean {
  if (!value) {
    return false
  }
  return (
    SQL_INJECTION_CHAR_REGEX.test(value) ||
    SQL_COMMENT_REGEX.test(value) ||
    SQL_KEYWORD_INJECTION_REGEX.test(value)
  )
}

export function validateEmail(rawEmail: string): EmailValidationResult {
  if (typeof rawEmail !== 'string' || rawEmail.trim().length === 0) {
    return {
      valid: false,
      email: '',
      error: 'El correo electrónico no puede estar vacío.',
    }
  }

  const normalized = normalizeEmail(rawEmail)

  if (normalized.length > MAX_EMAIL_LENGTH) {
    return {
      valid: false,
      email: normalized,
      error: 'El correo electrónico excede la longitud máxima permitida.',
    }
  }

  if (/\s/.test(normalized)) {
    return {
      valid: false,
      email: normalized,
      error: 'El correo electrónico no debe contener espacios.',
    }
  }

  if (containsSqlInjectionPattern(normalized)) {
    return {
      valid: false,
      email: normalized,
      error: 'El correo contiene caracteres o secuencias no permitidas.',
    }
  }

  if (!normalized.includes('@')) {
    return {
      valid: false,
      email: normalized,
      error: 'El correo electrónico debe incluir el símbolo @ y un dominio válido.',
    }
  }

  const parts = normalized.split('@')
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return {
      valid: false,
      email: normalized,
      error: 'Ingresa un correo electrónico válido con formato usuario@dominio.',
    }
  }

  const [localPart, domainPart] = parts

  if (
    localPart.startsWith('.') ||
    localPart.endsWith('.') ||
    localPart.includes('..') ||
    domainPart.startsWith('.') ||
    domainPart.endsWith('.') ||
    domainPart.includes('..')
  ) {
    return {
      valid: false,
      email: normalized,
      error: 'El formato del correo electrónico no es válido.',
    }
  }

  if (!domainPart.includes('.') || !STRICT_EMAIL_REGEX.test(normalized)) {
    return {
      valid: false,
      email: normalized,
      error: 'Ingresa un dominio válido (por ejemplo, usuario@uas.edu.mx).',
    }
  }

  return {
    valid: true,
    email: normalized,
  }
}

export function validatePassword(password: string): PasswordValidationResult {
  if (typeof password !== 'string' || password.trim().length === 0) {
    return {
      valid: false,
      error: 'La contraseña no puede estar vacía.',
    }
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    return {
      valid: false,
      error: 'La contraseña excede la longitud máxima permitida.',
    }
  }

  return { valid: true }
}

export function validateNewPassword(
  password: string,
  confirmPassword?: string
): PasswordValidationResult {
  const baseCheck = validatePassword(password)
  if (!baseCheck.valid) {
    return baseCheck
  }

  if (password.length < MIN_RECOVERY_PASSWORD_LENGTH) {
    return {
      valid: false,
      error: `La nueva contraseña debe tener al menos ${MIN_RECOVERY_PASSWORD_LENGTH} caracteres.`,
    }
  }

  if (confirmPassword !== undefined && password !== confirmPassword) {
    return {
      valid: false,
      error: 'Las contraseñas no coinciden.',
    }
  }

  return { valid: true }
}

export function validateLoginInput(
  email: string,
  password: string
): LoginValidationResult {
  const emailCheck = validateEmail(email)
  const passwordCheck = validatePassword(password)

  const errors: LoginValidationResult['errors'] = {}
  if (!emailCheck.valid && emailCheck.error) {
    errors.email = emailCheck.error
  }
  if (!passwordCheck.valid && passwordCheck.error) {
    errors.password = passwordCheck.error
  }

  return {
    valid: emailCheck.valid && passwordCheck.valid,
    email: emailCheck.email,
    errors,
  }
}

export function validatePasswordResetInput(email: string): EmailValidationResult {
  return validateEmail(email)
}
