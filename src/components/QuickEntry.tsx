import { useState } from 'react';
import type { TxRecord, Account } from '../types';
import { CATS, CC, CB } from '../lib/constants';
import { sb } from '../lib/supabase';
import { showSync, today } from '../lib/utils';

export default function QuickEntry({ records, setRecords, accounts, userId, onSwitchFull }: {
  records: TxRecord[];
  setRecords: (r: TxRecord[]) => void;
  accounts: Account[];
  userId: string;
  onSwitchFull: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'exp' | 'inc'>('exp');
  const [saving, setSaving] = useState(false);
  const [savedCat, setSavedCat] = useState<string | null>(null);
  const [pressed, setPressed] = useState<string | null>(null);
  const cashAcct = accounts.find(a => a.name === '現金') || accounts[0];
  const typeConf = { exp: { label: '支出', color: 'var(--red)', bg: 'var(--red-bg)' }, inc: { label: '收入', color: 'var(--green)', bg: 'var(--green-bg)' } };
  const hasAmt = parseFloat(amount) > 0;
  const amtColor = type === 'exp' ? 'var(--red)' : 'var(--green)';
  function pressKey(k: string) {
    setAmount(prev => {
      if (k === '⌫') return prev.slice(0, -1);
      if (k === '.' && prev.includes('.')) return prev;
      if (k === '.' && prev === '') return '0.';
      if (prev === '0' && k !== '.') return k;
      if (prev.length >= 10) return prev;
      return prev + k;
    });
  }
  async function selectCat(cat: string) {
    const a = parseFloat(amount);
    if (!a || a <= 0 || saving) return;
    setSaving(true); setSavedCat(cat);
    const rec: TxRecord = { id: crypto.randomUUID(), date: today(), type, acct_id: cashAcct?.id || null, acct2_id: null, cat, note: '', payer: '', amount: a, currency: 'TWD', twd: Math.round(a), user_id: userId };
    const { error } = await sb.from('records').upsert(rec);
    if (!error) { setRecords([rec, ...records]); showSync('已儲存', 'ok'); setTimeout(() => { setSaving(false); setSavedCat(null); setAmount(''); }, 900); }
    else { showSync('儲存失敗', 'err'); setSaving(false); setSavedCat(null); }
  }
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 'var(--r)', border: '1px solid var(--border)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>⚡ 快速記帳</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {(['exp', 'inc'] as const).map(t => (<button key={t} onClick={() => setType(t)} style={{ padding: '5px 11px', borderRadius: 20, border: `1.5px solid ${type === t ? typeConf[t].color : 'var(--border)'}`, background: type === t ? typeConf[t].bg : 'transparent', color: type === t ? typeConf[t].color : 'var(--text2)', fontWeight: type === t ? 600 : 400, fontSize: 13, cursor: 'pointer' }}>{typeConf[t].label}</button>))}
          <button onClick={onSwitchFull} style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid var(--border2)', background: 'transparent', fontSize: 12, color: 'var(--text3)', cursor: 'pointer' }}>完整模式</button>
        </div>
      </div>
      <div style={{ padding: '20px 20px 10px', textAlign: 'right' }}>
        <div style={{ fontSize: 56, fontWeight: 700, fontFamily: 'DM Mono,monospace', color: hasAmt ? amtColor : 'var(--text3)', letterSpacing: '-2px', lineHeight: 1 }}>{amount || '0'}</div>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 5 }}>{cashAcct?.name || '現金'} · {today()}</div>
      </div>
      <div style={{ padding: '0 12px 10px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>{hasAmt ? '選分類即儲存' : '輸入金額後選分類'}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {CATS[type].map(c => (<button key={c} onClick={() => selectCat(c)} disabled={!hasAmt || saving} style={{ padding: '7px 12px', borderRadius: 20, border: `1.5px solid ${savedCat === c ? CC[c] || 'var(--green)' : 'var(--border)'}`, background: savedCat === c ? (CB[c] || 'var(--green-bg)') : (hasAmt ? 'var(--surface)' : 'var(--surface2)'), color: savedCat === c ? (CC[c] || 'var(--green)') : (hasAmt ? 'var(--text)' : 'var(--text3)'), fontSize: 13, fontWeight: savedCat === c ? 700 : 500, cursor: hasAmt && !saving ? 'pointer' : 'default', transition: 'all .15s' }}>{savedCat === c ? '✓ ' + c : c}</button>))}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, background: 'var(--border)' }}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '.'].map(k => (<button key={k} onClick={() => pressKey(k)} onPointerDown={() => setPressed(k)} onPointerUp={() => setPressed(null)} onPointerLeave={() => setPressed(null)} style={{ padding: '19px 0', fontSize: k === '⌫' ? 22 : 26, fontWeight: 500, border: 'none', background: pressed === k ? 'var(--surface2)' : 'var(--surface)', color: k === '⌫' ? 'var(--amber)' : 'var(--text)', cursor: 'pointer', fontFamily: k === '⌫' ? 'inherit' : 'DM Mono,monospace', userSelect: 'none' }}>{k}</button>))}
      </div>
    </div>
  );
}
