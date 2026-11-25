export type ServiceErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_NOT_CONFIRMED'
  | 'USER_NOT_FOUND'
  | 'INACTIVE_USER'
  | 'PROFILE_NOT_FOUND'
  | 'RATE_LIMITED'
  | 'WEAK_PASSWORD'
  | 'SAME_PASSWORD'
  | 'CHECK_VIOLATION'
  | 'UNIQUE_VIOLATION'
  | 'FOREIGN_KEY_VIOLATION'
  | 'RLS_FORBIDDEN'
  | 'INVALID_ENUM'
  | 'SINGLE_ROW_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR'

export class AppServiceError extends Error {
  readonly code: ServiceErrorCode
  readonly field?: string
  readonly rawCode?: string

  constructor(
    code: ServiceErrorCode,
    message: string,
    options?: { field?: string; rawCode?: string }
  ) {
    super(message)
    this.name = 'AppServiceError'
    this.code = code
    this.field = options?.field
    this.rawCode = options?.rawCode
  }
}

interface SupabaseLikeError {
  code?: string
  status?: number
  message?: string
  details?: string
}

const POSTGRES_ERROR_MAP: Record<
  string,
  { code: ServiceErrorCode; message: string }
> = {
  '23514': {
    code: 'CHECK_VIOLATION',
    message: 'Los datos no cumplen con las reglas de validación de la base de datos.',
  },
  '23505': {
    code: 'UNIQUE_VIOLATION',
    message: 'Ya existe un registro con los mismos datos únicos.',
  },
  '23503': {
    code: 'FOREIGN_KEY_VIOLATION',
    message: 'La operación referencia un registro inexistente o protegido por historial.',
  },
  '42501': {
    code: 'RLS_FORBIDDEN',
    message: 'No cuentas con permisos suficientes para realizar esta operación.',
  },
  '22P02': {
    code: 'INVALID_ENUM',
    message: 'Uno de los valores enviados no tiene un formato o categoría válida.',
  },
  PGRST116: {
    code: 'SINGLE_ROW_ERROR',
    message: 'No se encontró el registro solicitado o existen múltiples coincidencias.',
  },
  P0002: {
    code: 'SINGLE_ROW_ERROR',
    message: 'No se encontró el registro solicitado en la base de datos.',
  },
}

export function mapSupabaseError(error: unknown): AppServiceError {
  if (error instanceof AppServiceError) {
    return error
  }

  const err = (error ?? {}) as SupabaseLikeError
  const rawCode = typeof err.code === 'string' ? err.code : undefined
  const message = typeof err.message === 'string' ? err.message : ''
  const details = typeof err.details === 'string' ? err.details : ''
  const lowerMessage = message.toLowerCase()
  const lowerDetails = details.toLowerCase()

  if (
    rawCode === '23514' &&
    lowerMessage.includes('periodo 1')
  ) {
    return new AppServiceError(
      'CHECK_VIOLATION',
      'El Periodo 1 solo admite actas Ordinaria, Extraordinaria y Regularización.',
      { rawCode, field: 'tipoActa' }
    )
  }

  if (
    rawCode === '23505' &&
    (lowerMessage.includes('folio') || lowerDetails.includes('folio'))
  ) {
    return new AppServiceError(
      'UNIQUE_VIOLATION',
      'Ese folio ya está registrado para este trámite y periodo escolar.',
      { rawCode, field: 'folio' }
    )
  }

  if (rawCode && rawCode in POSTGRES_ERROR_MAP) {
    const mapped = POSTGRES_ERROR_MAP[rawCode]
    return new AppServiceError(mapped.code, mapped.message, { rawCode })
  }

  if (
    rawCode === 'invalid_credentials' ||
    lowerMessage.includes('invalid login credentials') ||
    lowerMessage.includes('invalid_credentials')
  ) {
    return new AppServiceError(
      'INVALID_CREDENTIALS',
      'Correo o contraseña incorrectos. Verifica tus credenciales institucionales.',
      { rawCode }
    )
  }

  if (
    rawCode === 'email_not_confirmed' ||
    lowerMessage.includes('email not confirmed')
  ) {
    return new AppServiceError(
      'EMAIL_NOT_CONFIRMED',
      'El correo electrónico aún no ha sido confirmado. Revisa tu bandeja institucional.',
      { rawCode }
    )
  }

  if (
    rawCode === 'user_already_exists' ||
    rawCode === 'email_exists' ||
    lowerMessage.includes('already been registered') ||
    lowerMessage.includes('already registered')
  ) {
    return new AppServiceError(
      'UNIQUE_VIOLATION',
      'Ya existe una cuenta registrada con ese correo electrónico.',
      { rawCode, field: 'email' }
    )
  }

  if (
    rawCode === 'user_not_found' ||
    lowerMessage.includes('user not found')
  ) {
    return new AppServiceError(
      'USER_NOT_FOUND',
      'No existe una cuenta registrada con ese correo electrónico.',
      { rawCode }
    )
  }

  if (
    rawCode === 'over_email_send_rate_limit' ||
    rawCode === 'over_request_rate_limit' ||
    err.status === 429 ||
    lowerMessage.includes('rate limit') ||
    lowerMessage.includes('security purposes')
  ) {
    return new AppServiceError(
      'RATE_LIMITED',
      'Demasiados intentos en poco tiempo. Espera unos minutos antes de volver a intentarlo.',
      { rawCode }
    )
  }

  if (
    rawCode === 'weak_password' ||
    lowerMessage.includes('password should be at least')
  ) {
    return new AppServiceError(
      'WEAK_PASSWORD',
      'La contraseña no cumple con los requisitos mínimos de seguridad.',
      { rawCode, field: 'password' }
    )
  }

  if (
    rawCode === 'same_password' ||
    lowerMessage.includes('new password should be different')
  ) {
    return new AppServiceError(
      'SAME_PASSWORD',
      'La nueva contraseña debe ser distinta a la contraseña actual.',
      { rawCode, field: 'password' }
    )
  }

  if (
    lowerMessage.includes('failed to fetch') ||
    lowerMessage.includes('networkerror') ||
    lowerMessage.includes('fetch failed') ||
    lowerMessage.includes('network request failed')
  ) {
    return new AppServiceError(
      'NETWORK_ERROR',
      'No se pudo conectar con el servidor de autenticación. Verifica tu conexión de red.',
      { rawCode }
    )
  }

  return new AppServiceError(
    'UNKNOWN_ERROR',
    'Ocurrió un error inesperado al comunicarse con el servicio de autenticación.',
    { rawCode }
  )
}
