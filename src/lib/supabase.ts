import { type SupabaseClient, createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * 서버를 안 붙였으면 undefined 다. 앱은 그대로 기기 안에서만 돈다.
 * 붙이는 건 .env 에 두 줄 넣는 것뿐이고, 없다고 해서 아무것도 깨지지 않는다.
 */
export const supabase: SupabaseClient | undefined =
  url && key
    ? createClient(url, key, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
      })
    : undefined;

export const PHOTO_BUCKET = "jelly-photos";
export const syncEnabled = Boolean(supabase);
