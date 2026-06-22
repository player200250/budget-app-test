import { createClient } from '@supabase/supabase-js';

// publishable key 可公開；資料安全依賴 Supabase 後端的 RLS 政策（見 supabase/rls_policies.sql）
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://umvewlzzwoouuhslaivt.supabase.co';
const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_KEY || 'sb_publishable_h6kSR9NpWQggK_5wL_dnyA_DV1-KjNy';

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
