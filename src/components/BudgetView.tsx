import type { TxRecord, Budgets } from '../types';
import { CATS } from '../lib/constants';
import { sb } from '../lib/supabase';
import { fmt, ym } from '../lib/utils';
import { Card, Badge, SLabel, ProgBar } from './ui';

export default function BudgetView({ budgets, setBudgets, records, viewMonth, userId }: {
  budgets: Budgets;
  setBudgets: (b: Budgets) => void;
  records: TxRecord[];
  viewMonth: Date;
  userId: string;
}) {
  const m = ym(viewMonth);
  const mo = records.filter(r => r.date.startsWith(m));
  async function update(cat: string, val: number) {
    setBudgets({ ...budgets, [cat]: val });
    await sb.from('budgets').upsert({ cat, amount: val, user_id: userId });
  }
  return (<Card><SLabel>設定月預算（TWD）</SLabel>{CATS.exp.map(cat => {
    const sp = mo.filter(r => r.type === 'exp' && r.cat === cat).reduce((s, r) => s + Number(r.twd), 0);
    const bud = budgets[cat] || 0; const pct = bud > 0 ? sp / bud * 100 : 0;
    return (<div key={cat} style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Badge cat={cat} />
        <input type="number" placeholder="月預算" value={bud || ''} inputMode="numeric" onChange={e => update(cat, parseInt(e.target.value) || 0)} style={{ flex: 1, maxWidth: 140, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border2)', fontSize: 13, color: 'var(--text)', background: 'var(--surface)', outline: 'none' }} />
        {bud > 0 && <span style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'DM Mono,monospace', flexShrink: 0 }}>${fmt(sp)}/{fmt(bud)}</span>}
      </div>
      {bud > 0 && <ProgBar pct={pct} color={pct > 90 ? 'var(--red)' : pct > 70 ? 'var(--amber)' : 'var(--green)'} />}
    </div>);
  })}</Card>);
}
