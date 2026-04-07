import { createClient } from '@supabase/supabase-js';

let client;

export function getSupabase() {
    if (!client) {
        const url = process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    }
    return client;
}
