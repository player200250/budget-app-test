import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { TxRecord, Account } from '../types';
import { ACCT_ICONS } from '../lib/constants';
import { sb } from '../lib/supabase';
import { showSync, fmt } from '../lib/utils';
import { Card, SLabel } from './ui';

export default function AccountsView({ accounts, setAccounts, records, userId }: {
  accounts: Account[];
  setAccounts: (a: Account[]) => void;
  records: TxRecord[];
  userId: string;
}) {
  const [name, setName] = useState(''); const [type, setType] = useState('現金'); const [init, setInit] = useState('');
  const inp: CSSProperties = { padding: '12px 14px', borderRadius: 'var(--rs)', border: '1px solid var(--border2)', background: 'var(--surface)', color: 'var(--text)', outline: 'none', width: '100%', fontSize: 15 };
  async function add() {
    if (!name.trim()) return;
    const acct: Account = { id: crypto.randomUUID(), user_id: userId, name: name.trim(), type, init: parseFloat(init) || 0 };
    await sb.from('accounts').upsert(acct);
    setAccounts([...accounts, acct]); setName(''); setInit(''); showSync('已儲存', 'ok');
  }
  async function del(id: string) {
    await sb.from('accounts').delete().eq('id', id).eq('user_id', userId);
    setAccounts(accounts.filter(x => x.id !== id));
  }
  return (<div>
    <Card>
      <SLabel>新增帳戶</SLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, marginBottom: 8 }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="帳戶名稱" style={inp} />
        <select value={type} onChange={e => setType(e.target.value)} style={inp}>{Object.keys(ACCT_ICONS).map(t => <option key={t}>{t}</option>)}</select>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
        <input type="number" value={init} onChange={e => setInit(e.target.value)} placeholder="初始餘額" style={inp} />
        <button onClick={add} style={{ padding: '12px 20px', borderRadius: 'var(--r)', border: 'none', background: 'var(--text)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>新增</button>
      </div>
    </Card>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10 }}>
      {accounts.map(a => {
        let b = Number(a.init) || 0; records.forEach(r => { if (r.type === 'inc' && r.acct_id === a.id) b += Number(r.twd); if (r.type === 'exp' && r.acct_id === a.id) b -= Number(r.twd); if (r.type === 'xfr' && r.acct_id === a.id) b -= Number(r.twd); if (r.type === 'xfr' && r.acct2_id === a.id) b += Number(r.twd); });
        return (<div key={a.id} style={{ background: 'var(--surface)', borderRadius: 'var(--r)', border: '1px solid var(--border)', padding: '1rem' }}>
          <div style={{ fontSize: 22, marginBottom: 8 }}>{ACCT_ICONS[a.type] || '💰'}</div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 1 }}>{a.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>{a.type}</div>
          <div style={{ fontSize: 18, fontWeight: 600, fontFamily: 'DM Mono,monospace', color: b >= 0 ? 'var(--green)' : 'var(--red)' }}>${fmt(b)}</div>
          <button onClick={() => del(a.id)} style={{ background: 'none', border: 'none', fontSize: 11, color: 'var(--text3)', padding: '6px 0 0', cursor: 'pointer' }}>刪除</button>
        </div>);
      })}
    </div>
  </div>);
}
