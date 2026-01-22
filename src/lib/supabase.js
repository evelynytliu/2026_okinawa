import { createClient } from '@supabase/supabase-js';
import { mockSupabase } from './mockSupabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const isDemoMode = String(process.env.NEXT_PUBLIC_DEMO_MODE).toLowerCase() === 'true';

// Create client only if environment variables are available to prevent build errors
// or runtime crashes when not configured.
// heavily prioritize Demo Mode if flag is present.
export const supabase = isDemoMode
    ? mockSupabase
    : (supabaseUrl && supabaseAnonKey)
        ? createClient(supabaseUrl, supabaseAnonKey)
        : null;

if (isDemoMode && typeof window !== 'undefined') {
    console.log("%c [Demo Mode] Using Mock Supabase Client", "color: #2E8B99; font-weight: bold; background: #E6FFFA; padding: 4px; border-radius: 4px;");
}
