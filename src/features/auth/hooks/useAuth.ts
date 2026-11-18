import * as React from 'react'

import {
  fetchPerfilByUserId,
  getCurrentAuthSession,
  logout,
  subscribeToAuthChanges,
  type AuthSessionResult,
} from '@/services/login'

export interface UseAuthReturn {
  sessionData: AuthSessionResult | null
  isLoadingSession: boolean
  isPasswordRecovery: boolean
  setSessionData: React.Dispatch<React.SetStateAction<AuthSessionResult | null>>
  clearPasswordRecovery: () => void
  signOut: () => Promise<void>
}

export function useAuth(): UseAuthReturn {
  const [sessionData, setSessionData] = React.useState<AuthSessionResult | null>(
    null
  )
  const [isLoadingSession, setIsLoadingSession] = React.useState(true)
  const [isPasswordRecovery, setIsPasswordRecovery] = React.useState(false)

  React.useEffect(() => {
    let active = true

    const bootstrapSession = async () => {
      try {
        const current = await getCurrentAuthSession()
        if (active) {
          setSessionData(current)
        }
      } catch {
        if (active) {
          setSessionData(null)
        }
      } finally {
        if (active) {
          setIsLoadingSession(false)
        }
      }
    }

    void bootstrapSession()

    const unsubscribe = subscribeToAuthChanges((event, session) => {
      if (!active) {
        return
      }

      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true)
        return
      }

      if (event === 'SIGNED_OUT' || !session?.user) {
        setSessionData(null)
        setIsPasswordRecovery(false)
        return
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        void (async () => {
          try {
            const perfil = await fetchPerfilByUserId(session.user.id)
            if (active) {
              setSessionData({
                user: session.user,
                session,
                perfil,
              })
            }
          } catch {
            if (active) {
              setSessionData(null)
            }
          }
        })()
      }
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const clearPasswordRecovery = React.useCallback(() => {
    setIsPasswordRecovery(false)
  }, [])

  const signOut = React.useCallback(async () => {
    await logout()
    setSessionData(null)
    setIsPasswordRecovery(false)
  }, [])

  return {
    sessionData,
    isLoadingSession,
    isPasswordRecovery,
    setSessionData,
    clearPasswordRecovery,
    signOut,
  }
}
