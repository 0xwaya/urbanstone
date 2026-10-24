import { createClient } from '@supabase/supabase-js';

let browserClient;

export function getSupabaseBrowserClient() {
    if (typeof window === 'undefined') {
        throw new Error('Supabase browser auth is only available in the browser.');
    }
    if (browserClient) return browserClient;

    const url = String(process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
    const anonKey = String(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
    if (!url || !anonKey) {
        throw new Error('Google sign-in is not configured.');
    }

    browserClient = createClient(url, anonKey, {
        auth: {
            autoRefreshToken: true,
            detectSessionInUrl: true,
            flowType: 'pkce',
            persistSession: true,
        },
    });
    return browserClient;
}
