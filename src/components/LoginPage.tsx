import { useState } from 'react';
import { sb } from '../lib/supabase';
import { showSync } from '../lib/utils';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  async function signInWithGoogle() {
    setLoading(true);
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.href },
    });
    if (error) { showSync('登入失敗：' + error.message, 'err'); setLoading(false); }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem', background: 'var(--bg)' }}>
      <div style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, marginBottom: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>💰</div>
      <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.5px', marginBottom: 8 }}>我的帳本</div>
      <div style={{ fontSize: 14, color: 'var(--text3)', marginBottom: '2.5rem', textAlign: 'center', lineHeight: 1.6 }}>個人記帳 · 雲端同步 · AI 分析<br />登入後資料只屬於你</div>
      <button onClick={signInWithGoogle} disabled={loading} style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '14px 24px',
        borderRadius: 'var(--r)', border: '1px solid var(--border2)',
        background: 'var(--surface)', cursor: 'pointer', fontSize: 15, fontWeight: 500,
        width: '100%', maxWidth: 320, justifyContent: 'center',
        opacity: loading ? 0.6 : 1,
      }}>
        <svg width="20" height="20" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </svg>
        {loading ? '登入中...' : '使用 Google 帳號登入'}
      </button>
      <div style={{ marginTop: '1.5rem', fontSize: 12, color: 'var(--text3)', textAlign: 'center', lineHeight: 1.6 }}>
        登入後資料儲存於 Supabase 雲端<br />電腦與手機自動同步
      </div>
    </div>
  );
}
