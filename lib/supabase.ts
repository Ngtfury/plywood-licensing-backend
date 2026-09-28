import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('[Licensing API] Warning: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables are missing.');
}

// Server-side Supabase client with admin service role to bypass RLS on licensing tables
export const db = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
