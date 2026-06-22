import { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';
import type { TxRecord, Account, FixedItem, Freq } from '../types';
import { CATS, CC, CB } from '../lib/constants';
import { sb } from '../lib/supabase';
import { showSync, fmt, today } from '../lib/utils';
import { Card, Badge, SLabel, Btn } from './ui';

export default function FixedView({ fixedItems, setFixedItems, records, setRecords, accounts, userId }: {
  fixedItems: FixedItem[];
  setFixedItems: (f: FixedItem[]) => void;
  records: TxRecord[];
  setRecords: (r: TxRecord[]) => void;
  accounts: Account[];
  userId: string;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'exp' | 'inc'>('exp');
  const [cat, setCat] = useState(CATS.exp[0]);
  const [amount, setAmount] = useState('');
  const [freq, setFreq] = useState<Freq>('monthly');
  const [nextDate, setNextDate] = useState(today());
  const [saving, setSaving] = useState(false);
  const inp: CSSProperties = { padding: '12px 14px', borderRadius: 'var(--rs)', border: '1px solid var(--border2)', background: 'var(--surface)', color: 'var(--text)', outline: 'none', width: '100%', fontSize: 15 };
  useEffect(() => { setCat(CATS[type][0]); }, [type]);
  const freqMap: Record<Freq, string> = { monthly: '每月', weekly: '每週', yearly: '每年' };
  const typeConf = { exp: { label: '支出', color: 'var(--red)', bg: 'var(--red-bg)' }, inc: { label: '收入', color: 'var(--green)', bg: 'var(--green-bg)' } };
  async function add() {
    if (!name.trim() || !amount) return;
    setSaving(true);
    const item: FixedItem = { id: crypto.randomUUID(), user_id: userId, name: name.trim(), type, cat, amount: parseFloat(amount), currency: 'TWD', freq, next_date: nextDate };
    const { error } = await sb.from('fixed_items').upsert(item);
    if (!error) { setFixedItems([...fixedItems, item]); setName(''); setAmount(''); showSync('已儲存', 'ok'); }
    else showSync('儲存失敗', 'err');
    setSaving(false);
  }
  async function del(id: string) {
    await sb.from('fixed_items').delete().eq('id', id).eq('user_id', userId);
    setFixedItems(fixedItems.filter(x => x.id !== id));
    showSync('已刪除', 'ok');
  }
  async function apply(item: FixedItem) {
    const acctId = accounts[0]?.id;
    if (!acctId) { showSync('請先建立帳戶', 'err'); return; }
    showSync('套用中...');
    const rec: TxRecord = { id: crypto.randomUUID(), date: today(), type: item.type, acct_id: acctId, acct2_id: null, cat: item.cat, note: item.name + '（固定）', payer: '', amount: Number(item.amount), currency: item.currency || 'TWD', twd: Number(item.amount), user_id: userId };
    const { error } = await sb.from('records').upsert(rec);
    if (error) { showSync('套用失敗：' + error.message, 'err'); return; }
    setRecords([rec, ...records]);
    const nd = new Date(item.next_date);
    if (item.freq === 'monthly') nd.setMonth(nd.getMonth() + 1);
    else if (item.freq === 'weekly') nd.setDate(nd.getDate() + 7);
    else nd.setFullYear(nd.getFullYear() + 1);
    const newNext = nd.toISOString().slice(0, 10);
    await sb.from('fixed_items').update({ next_date: newNext }).eq('id', item.id);
    setFixedItems(fixedItems.map(x => x.id === item.id ? { ...x, next_date: newNext } : x));
    showSync('已套用至記錄', 'ok');
  }
  const overdue = fixedItems.filter(x => x.next_date <= today());
  return (<div>
    <Card>
      <SLabel>新增固定收支</SLabel>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {(['exp', 'inc'] as const).map(t => (<button key={t} onClick={() => setType(t)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: `1.5px solid ${type === t ? typeConf[t].color : 'var(--border)'}`, background: type === t ? typeConf[t].bg : 'transparent', color: type === t ? typeConf[t].color : 'var(--text2)', fontWeight: type === t ? 600 : 400, fontSize: 14, cursor: 'pointer' }}>{typeConf[t].label}</button>))}
      </div>
      <div style={{ marginBottom: 8 }}><input value={name} onChange={e => setName(e.target.value)} placeholder="項目名稱（如：房租、薪水）" style={inp} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="金額（TWD）" style={inp} />
        <select value={freq} onChange={e => setFreq(e.target.value as Freq)} style={inp}>{Object.entries(freqMap).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      </div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>分類</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {CATS[type].map(c => (<button key={c} onClick={() => setCat(c)} style={{ padding: '7px 11px', borderRadius: 20, border: `1.5px solid ${cat === c ? CC[c] || 'var(--text)' : 'var(--border)'}`, background: cat === c ? CB[c] || 'var(--surface2)' : 'transparent', color: cat === c ? CC[c] || 'var(--text)' : 'var(--text2)', fontSize: 13, fontWeight: cat === c ? 600 : 400, cursor: 'pointer' }}>{c}</button>))}
        </div>
      </div>
      <div style={{ marginBottom: 10 }}><div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>下次執行日期</div><input type="date" value={nextDate} onChange={e => setNextDate(e.target.value)} style={inp} /></div>
      <Btn onClick={add} style={{ opacity: saving ? 0.6 : 1 }}>{saving ? '儲存中...' : '新增固定收支'}</Btn>
    </Card>
    {overdue.length > 0 && <div style={{ background: 'var(--amber-bg)', borderRadius: 12, padding: '10px 14px', marginBottom: 10, fontSize: 13, color: 'var(--amber)' }}>⚠ 有 {overdue.length} 筆固定收支到期，請點「套用」建立記錄</div>}
    {fixedItems.length > 0 && <Card style={{ padding: '0 0.75rem' }}>
      <SLabel style={{ padding: '0.75rem 0 0' }}>固定收支清單</SLabel>
      {fixedItems.map((item, i) => {
        const tc = item.type === 'inc' ? 'var(--green)' : 'var(--red)';
        const due = item.next_date <= today();
        return (<div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0', borderBottom: i < fixedItems.length - 1 ? '1px solid var(--border)' : 'none' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{item.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}><span style={{ flexShrink: 0 }}><Badge cat={item.cat} /></span><span style={{ flexShrink: 0 }}>{freqMap[item.freq]} · 下次 {item.next_date}</span>{due && <span style={{ color: 'var(--amber)', flexShrink: 0 }}>（到期）</span>}</div>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: tc, fontFamily: 'DM Mono,monospace', flexShrink: 0 }}>{item.type === 'inc' ? '+' : '-'}${fmt(item.amount)}</div>
          <button onClick={() => apply(item)} style={{ background: 'var(--green-bg)', border: 'none', borderRadius: 8, padding: '6px 10px', fontSize: 12, color: 'var(--green)', cursor: 'pointer', flexShrink: 0 }}>套用</button>
          <button onClick={() => del(item.id)} style={{ background: 'none', border: 'none', color: 'var(--border2)', fontSize: 20, padding: '0 0 0 2px', flexShrink: 0, cursor: 'pointer' }}>×</button>
        </div>);
      })}
    </Card>}
    {!fixedItems.length && <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text3)' }}>尚無固定收支項目</div>}
  </div>);
}
