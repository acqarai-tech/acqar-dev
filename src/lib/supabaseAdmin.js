import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY,
  {
    auth: {
      storageKey: "sb-admin-auth",   // separate localStorage bucket from the public site
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
);
