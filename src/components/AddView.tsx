import { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';
import type { TxRecord, Account, TxType } from '../types';
import { CATS, CC, CB } from '../lib/constants';
import { sb } from '../lib/supabase';
import { showSync, fmt, today } from '../lib/utils';
import { Card, Btn } from './ui';
import QuickEntry from './QuickEntry';

export default function AddView({ records, setRecords, accounts, userId, onDone }: {
  records: TxRecord[];
  setRecords: (r: TxRecord[]) => void;
  accounts: Account[];
  userId: string;
  onDone?: () => void;
}) {
  const [quickMode, setQuickMode] = useState(true);
  const [type, setType] = useState<TxType>('exp');
  const [date, setDate] = useState(today());
  const [acctId, setAcctId] = useState<string | number>(accounts[0]?.id || 1);
  const [cat, setCat] = useState(CATS.exp[0]);
  const [note, setNote] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('TWD');
  const [acct2Id, setAcct2Id] = useState<string | number>(accounts[1]?.id || accounts[0]?.id || 1);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [FX, setFX] = useState<Record<string, number>>({ TWD: 1, USD: 32, JPY: 0.21, EUR: 35, CNY: 4.4, HKD: 4.1 });
  useEffect(() => {
    fetch('https://open.er-api.com/v6/latest/TWD')
      .then(r => r.json()).then(d => {
        if (d.result === 'success' && d.rates) {
          const inv = (k: string) => d.rates[k] ? +(1 / d.rates[k]).toFixed(4) : null;
          setFX(f => ({ ...f, USD: inv('USD') || f.USD, JPY: inv('JPY') || f.JPY, EUR: inv('EUR') || f.EUR, CNY: inv('CNY') || f.CNY, HKD: inv('HKD') || f.HKD }));
        }
      }).catch(() => {});
  }, []);
  useEffect(() => { setCat(CATS[type][0]); }, [type]);
  const rate = FX[currency] || 1;
  const twd = amount && currency !== 'TWD' ? Math.round(parseFloat(amount) * rate) : null;
  const typeConf = { exp: { label: '支出', color: 'var(--red)', bg: 'var(--red-bg)' }, inc: { label: '收入', color: 'var(--green)', bg: 'var(--green-bg)' }, xfr: { label: '轉帳', color: 'var(--blue)', bg: 'var(--blue-bg)' } };
  async function submit() {
    const a = parseFloat(amount); if (!a || a <= 0) return;
    setSaving(true); showSync('儲存中...');
    const rec: TxRecord = { id: crypto.randomUUID(), date, type, acct_id: acctId as string, acct2_id: type === 'xfr' ? (acct2Id as string) : null, cat, note: note.trim(), payer: '', amount: a, currency, twd: Math.round(a * rate), user_id: userId };
    const { error } = await sb.from('records').upsert(rec);
    if (error) { showSync('儲存失敗', 'err'); }
    else { setRecords([rec, ...records]); showSync('已儲存', 'ok'); setNote(''); setAmount(''); setDone(true); setTimeout(() => { setDone(false); if (onDone) onDone(); }, 1200); }
    setSaving(false);
  }
  if (done) return (<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 1rem', gap: 12 }}><div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--green-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>✓</div><div style={{ fontSize: 18, fontWeight: 600, color: 'var(--green)' }}>已儲存到雲端！</div></div>);
  if (quickMode) return (<QuickEntry records={records} setRecords={setRecords} accounts={accounts} userId={userId} onSwitchFull={() => setQuickMode(false)} />);
  const inp: CSSProperties = { padding: '12px 14px', borderRadius: 'var(--rs)', border: '1px solid var(--border2)', background: 'var(--surface)', color: 'var(--text)', outline: 'none', width: '100%', fontSize: 15 };
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}><div style={{ fontSize: 16, fontWeight: 600 }}>新增記錄</div><button onClick={() => setQuickMode(true)} style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid var(--border2)', background: 'var(--surface2)', fontSize: 12, color: 'var(--text2)', cursor: 'pointer' }}>⚡ 快速記帳</button></div>
      <div style={{ display: 'flex', gap: 6, marginBottom: '1rem' }}>
        {(['exp', 'inc', 'xfr'] as const).map(t => (<button key={t} onClick={() => setType(t)} style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: `1.5px solid ${type === t ? typeConf[t].color : 'var(--border)'}`, background: type === t ? typeConf[t].bg : 'transparent', color: type === t ? typeConf[t].color : 'var(--text2)', fontWeight: type === t ? 600 : 400, fontSize: 14, cursor: 'pointer' }}>{typeConf[t].label}</button>))}
      </div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>金額 {twd && <span style={{ color: 'var(--blue)', fontSize: 12 }}>≈ TWD ${fmt(twd)}</span>}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" inputMode="decimal" style={{ ...inp, fontSize: 26, fontWeight: 600, fontFamily: 'DM Mono,monospace', color: typeConf[type].color, flex: 2 }} />
          <select value={currency} onChange={e => setCurrency(e.target.value)} style={{ ...inp, flex: 1, maxWidth: 90 }}>{Object.keys(FX).map(c => <option key={c}>{c}</option>)}</select>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: type === 'xfr' ? 8 : 10 }}>
        <div><div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>日期</div><input type="date" value={date} onChange={e => setDate(e.target.value)} style={inp} /></div>
        <div><div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>{type === 'xfr' ? '轉出帳戶' : '帳戶'}</div><select value={acctId} onChange={e => setAcctId(e.target.value)} style={inp}>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
      </div>
      {type === 'xfr' && <div style={{ marginBottom: 10 }}><div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>轉入帳戶</div><select value={acct2Id} onChange={e => setAcct2Id(e.target.value)} style={inp}>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>}
      {type !== 'xfr' && <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>分類</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {CATS[type].map(c => (<button key={c} onClick={() => setCat(c)} style={{ padding: '8px 12px', borderRadius: 20, border: `1.5px solid ${cat === c ? CC[c] || 'var(--text)' : 'var(--border)'}`, background: cat === c ? CB[c] || 'var(--surface2)' : 'transparent', color: cat === c ? CC[c] || 'var(--text)' : 'var(--text2)', fontSize: 13, fontWeight: cat === c ? 600 : 400, cursor: 'pointer' }}>{c}</button>))}
        </div>
      </div>}
      <div style={{ marginBottom: '1.25rem' }}><div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>備註（選填）</div><input value={note} onChange={e => setNote(e.target.value)} placeholder="例如：麥當勞午餐" style={inp} /></div>
      <Btn onClick={submit} style={{ opacity: saving ? 0.6 : 1 }}>{saving ? '儲存中...' : '新增並同步'}</Btn>
    </Card>
  );
}
