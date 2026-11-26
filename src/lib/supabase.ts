import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseUrl =
  rawSupabaseUrl === 'auto' && typeof window !== 'undefined'
    ? window.location.origin
    : rawSupabaseUrl
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en el archivo .env'
  )
}

export const supabase = createClient<Database>(
  supabaseUrl ?? '',
  supabaseAnonKey ?? ''
)
