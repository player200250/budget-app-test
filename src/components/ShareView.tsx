import { useState, useEffect, useMemo } from 'react';
import type { CSSProperties } from 'react';
import type { ShareItem } from '../types';
import { sb } from '../lib/supabase';
import { showSync, fmt, today } from '../lib/utils';
import { Card, SLabel, Btn } from './ui';

export default function ShareView({ userId }: { userId: string }) {
  const [items, setItems] = useState<ShareItem[]>([]);
  const [localMembers, setLocalMembers] = useState<string[]>([]);
  const [newMember, setNewMember] = useState('');
  const [payerName, setPayerName] = useState('');
  const [amount, setAmount] = useState('');
  const [splitParts, setSplitParts] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(today());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const inp: CSSProperties = { padding: '10px 12px', borderRadius: 'var(--rs)', border: '1px solid var(--border2)', background: 'var(--surface)', color: 'var(--text)', outline: 'none', fontSize: 14 };

  useEffect(() => {
    sb.from('share_items').select('*').eq('user_id', userId).order('date', { ascending: false })
      .then(({ data }) => { if (data) setItems(data as ShareItem[]); setLoading(false); });
  }, []);

  // 從所有紀錄推導已知成員（payers 的 key + members 陣列），合併手動新增的
  const knownMembers = useMemo(() => {
    const s = new Set(localMembers);
    items.forEach(i => {
      Object.keys(i.payers || {}).forEach(n => s.add(n));
      (i.members || []).forEach(n => s.add(n));
    });
    return [...s].sort();
  }, [items, localMembers]);

  function addMember() {
    const nm = newMember.trim();
    if (!nm || knownMembers.includes(nm)) return;
    setLocalMembers(m => [...m, nm]); setNewMember('');
  }
  function toggleSplit(nm: string) { setSplitParts(p => p.includes(nm) ? p.filter(x => x !== nm) : [...p, nm]); }

  async function addItem() {
    if (!payerName || !amount || splitParts.length === 0) return;
    const amt = parseFloat(amount);
    setSaving(true);
    const row: ShareItem = { id: crypto.randomUUID(), user_id: userId, date, note: note.trim(), amount: amt, payers: { [payerName]: amt }, members: splitParts };
    const { error } = await sb.from('share_items').insert(row);
    if (!error) { setItems([row, ...items]); setAmount(''); setNote(''); setSplitParts([]); showSync('已儲存', 'ok'); }
    else showSync('儲存失敗', 'err');
    setSaving(false);
  }

  async function delItem(id: string) {
    await sb.from('share_items').delete().eq('id', id).eq('user_id', userId);
    setItems(items.filter(x => x.id !== id));
    showSync('已刪除', 'ok');
  }

  // 計算每人淨餘額：付款方 +，分攤方 −（等比）
  const balances: Record<string, number> = {};
  items.forEach(item => {
    Object.entries(item.payers || {}).forEach(([n, paid]) => { balances[n] = (balances[n] || 0) + Number(paid); });
    const mems = item.members || [];
    if (mems.length > 0) {
      const share = Number(item.amount) / mems.length;
      mems.forEach(n => { balances[n] = (balances[n] || 0) - share; });
    }
  });

  // 貪心結算：最小化轉帳次數
  const pCopy = Object.entries(balances).filter(([, v]) => v > 0.01).sort((a, b) => b[1] - a[1]).map(([n, v]) => ({ n, v }));
  const nCopy = Object.entries(balances).filter(([, v]) => v < -0.01).sort((a, b) => a[1] - b[1]).map(([n, v]) => ({ n, v }));
  const settlements: { from: string; to: string; amount: number }[] = [];
  let pi = 0, ni = 0;
  while (pi < pCopy.length && ni < nCopy.length) {
    const cr = pCopy[pi]; const db = nCopy[ni];
    const amt = Math.min(cr.v, -db.v);
    settlements.push({ from: db.n, to: cr.n, amount: Math.round(amt) });
    cr.v -= amt; db.v += amt;
    if (Math.abs(cr.v) < 0.01) pi++; if (Math.abs(db.v) < 0.01) ni++;
  }

  const total = items.reduce((s, i) => s + Number(i.amount), 0);

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text3)' }}>載入中...</div>;

  return (<div>
    <Card>
      <SLabel>成員</SLabel>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input value={newMember} onChange={e => setNewMember(e.target.value)} onKeyDown={e => e.key === 'Enter' && addMember()} placeholder="新增成員名稱" style={{ ...inp, flex: 1, width: 'auto' }} />
        <button onClick={addMember} style={{ padding: '10px 16px', borderRadius: 'var(--r)', border: 'none', background: 'var(--text)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>新增</button>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {knownMembers.map(m => (
          <span key={m} style={{ background: 'var(--surface2)', borderRadius: 20, padding: '5px 12px', fontSize: 13 }}>{m}</span>
        ))}
        {!knownMembers.length && <span style={{ fontSize: 13, color: 'var(--text3)' }}>尚未有成員，請先新增</span>}
      </div>
    </Card>

    {knownMembers.length >= 2 && <Card>
      <SLabel>新增共享支出</SLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>付款人</div>
          <select value={payerName} onChange={e => setPayerName(e.target.value)} style={{ ...inp, width: '100%' }}>
            <option value=''>選擇付款人</option>
            {knownMembers.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>金額（TWD）</div>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" style={{ ...inp, width: '100%' }} />
        </div>
      </div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>分攤成員（等比）</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {knownMembers.map(m => (
            <button key={m} onClick={() => toggleSplit(m)} style={{ padding: '7px 12px', borderRadius: 20, border: `1.5px solid ${splitParts.includes(m) ? 'var(--blue)' : 'var(--border)'}`, background: splitParts.includes(m) ? 'var(--blue-bg)' : 'transparent', color: splitParts.includes(m) ? 'var(--blue)' : 'var(--text2)', fontSize: 13, cursor: 'pointer' }}>{m}</button>
          ))}
        </div>
        {splitParts.length > 0 && amount && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>每人分攤 ${fmt(parseFloat(amount) / splitParts.length)}</div>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
        <input value={note} onChange={e => setNote(e.target.value)} placeholder="備註（選填）" style={{ ...inp, width: '100%' }} />
        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...inp, width: '100%' }} />
      </div>
      <Btn onClick={addItem} style={{ opacity: saving ? 0.6 : 1 }}>{saving ? '儲存中...' : '新增支出'}</Btn>
    </Card>}

    {settlements.length > 0 && <Card style={{ background: 'var(--green-bg)', border: '1px solid rgba(26,122,85,0.3)' }}>
      <SLabel>結算方式</SLabel>
      {settlements.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', fontSize: 14, borderBottom: i < settlements.length - 1 ? '1px solid rgba(26,122,85,0.15)' : 'none' }}>
          <span style={{ fontWeight: 600, color: 'var(--red)' }}>{s.from}</span>
          <span style={{ color: 'var(--text3)' }}>付給</span>
          <span style={{ fontWeight: 600, color: 'var(--green)' }}>{s.to}</span>
          <span style={{ marginLeft: 'auto', fontWeight: 600, fontFamily: 'DM Mono,monospace', color: 'var(--green)' }}>${fmt(s.amount)}</span>
        </div>
      ))}
    </Card>}

    {items.length > 0 && <Card style={{ padding: '0 0.75rem' }}>
      <div style={{ padding: '0.75rem 0 0.25rem' }}>
        <SLabel style={{ margin: 0 }}>共享支出（{items.length} 筆 · 合計 ${fmt(total)}）</SLabel>
      </div>
      {items.map((item, i) => {
        const payerStr = Object.entries(item.payers || {}).map(([n, v]) => `${n} $${fmt(v)}`).join('、');
        const membStr = (item.members || []).join('、');
        return (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.note || '共享支出'}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{payerStr} 付款 · {membStr} 分攤 · {item.date}</div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, fontFamily: 'DM Mono,monospace', flexShrink: 0 }}>${fmt(item.amount)}</div>
            <button onClick={() => delItem(item.id)} style={{ background: 'none', border: 'none', color: 'var(--border2)', fontSize: 20, padding: '0 0 0 2px', flexShrink: 0, cursor: 'pointer' }}>×</button>
          </div>
        );
      })}
    </Card>}

    {knownMembers.length < 2 && <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text3)' }}>請先新增至少 2 位成員</div>}
  </div>);
}
