"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSupabaseClient = createSupabaseClient;
const supabase_js_1 = require("@supabase/supabase-js");
function createSupabaseClient(url, anonKey, options) {
    if (!url || !anonKey) {
        console.warn('[QuickBoard Supabase] URL or Anon Key is missing. Check environment variables.');
    }
    return (0, supabase_js_1.createClient)(url, anonKey, options);
}
