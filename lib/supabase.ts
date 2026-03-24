import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('[Supabase Debug] URL:', supabaseUrl ? 'Found' : 'MISSING', '| KEY:', supabaseAnonKey ? 'Found' : 'MISSING')

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] Missing environment variables. Using placeholders to prevent crash. Please restart your dev server.')
}

// Create a singleton client or a dummy one if vars are missing to avoid crash
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-project.supabase.co', 
  supabaseAnonKey || 'placeholder-key'
)
