import { useState } from 'react';
import type { TxRecord, Account, Budgets } from '../types';
import { CC, CB } from '../lib/constants';
import { fmt, ym, isDesktop } from '../lib/utils';
import { Card, SLabel, ProgBar } from './ui';

export default function HomeView({ records, accounts, viewMonth }: {
  records: TxRecord[];
  accounts: Account[];
  budgets: Budgets;
  viewMonth: Date;
}) {
  const [showTrend, setShowTrend] = useState(false);
  const m = ym(viewMonth);
  const mo = records.filter(r => r.date.startsWith(m));
  const income = mo.filter(r => r.type === 'inc').reduce((s, r) => s + Number(r.twd), 0);
  const expense = mo.filter(r => r.type === 'exp').reduce((s, r) => s + Number(r.twd), 0);
  const bal = income - expense;
  const saveRate = income > 0 ? Math.round((income - expense) / income * 100) : null;
  const totalAssets = accounts.reduce((s, a) => {
    let b = Number(a.init) || 0;
    records.forEach(r => { if (r.type === 'inc' && r.acct_id === a.id) b += Number(r.twd); if (r.type === 'exp' && r.acct_id === a.id) b -= Number(r.twd); if (r.type === 'xfr' && r.acct_id === a.id) b -= Number(r.twd); if (r.type === 'xfr' && r.acct2_id === a.id) b += Number(r.twd); });
    return s + b;
  }, 0);
  const isCurrentMonth = ym(viewMonth) === ym(new Date());
  const days = isCurrentMonth ? new Date().getDate() : 0;
  const projected = isCurrentMonth && days > 0 ? Math.round(expense / days * 30) : null;
  const catExp: Record<string, number> = {}; mo.filter(r => r.type === 'exp').forEach(r => { catExp[r.cat] = (catExp[r.cat] || 0) + Number(r.twd); });
  const top = Object.entries(catExp).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const max = top[0] ? top[0][1] : 1;
  const last6 = Array.from({ length: 6 }, (_, i) => { const d = new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 5 + i, 1); return ym(d); });
  const mExp = last6.map(mm => records.filter(r => r.date.startsWith(mm) && r.type === 'exp').reduce((s, r) => s + Number(r.twd), 0));
  const mInc = last6.map(mm => records.filter(r => r.date.startsWith(mm) && r.type === 'inc').reduce((s, r) => s + Number(r.twd), 0));
  const tMax = Math.max(...mExp, ...mInc, 1);
  const nMax = Math.ceil(tMax / 1000) * 1000;
  return (
    <div>
      <Card>
        <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>本月支出</div>
        <div style={{ fontSize: 40, fontWeight: 600, letterSpacing: '-2px', color: 'var(--red)', fontFamily: 'DM Mono,monospace', lineHeight: 1, marginBottom: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>${fmt(expense)}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginBottom: '1rem' }}>
          {([['收入', `+$${fmt(income)}`, 'var(--green)'], ['結餘', `${bal >= 0 ? '+' : '-'}$${fmt(Math.abs(bal))}`, bal >= 0 ? 'var(--green)' : 'var(--red)'], ['總資產', `$${fmt(totalAssets)}`, 'var(--text)'], ['預估月底', projected !== null ? `$${fmt(projected)}` : '─', 'var(--amber)']] as [string, string, string][]).map(([l, v, c]) => (
            <div key={l} style={{ background: 'var(--surface2)', borderRadius: 10, padding: '10px 12px', minWidth: 0 }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 3 }}>{l}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: c, fontFamily: 'DM Mono,monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</div>
            </div>
          ))}
        </div>
        <ProgBar pct={saveRate || 0} color={(saveRate ?? 0) >= 20 ? 'var(--green)' : (saveRate ?? 0) >= 10 ? 'var(--amber)' : 'var(--red)'} />
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 5 }}>{saveRate !== null ? `儲蓄率 ${saveRate}%` : '尚無收入資料'}</div>
      </Card>
      <div style={{ display: 'grid', gridTemplateColumns: isDesktop() ? '1fr 1fr' : '1fr', gap: 10 }}>
        {top.length > 0 && <Card><SLabel>支出分類</SLabel>{top.map(([cat, val]) => (
          <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
            <span style={{ fontSize: 12, color: 'var(--text2)', width: 44, textAlign: 'right', flexShrink: 0 }}>{cat}</span>
            <div style={{ flex: 1, height: 10, background: 'var(--surface2)', borderRadius: 5, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.round(val / max * 100)}%`, background: CC[cat] || '#6b6b65', borderRadius: 5 }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 500, flexShrink: 0, textAlign: 'right', color: CC[cat] || '#6b6b65', fontFamily: 'DM Mono,monospace', maxWidth: 88, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>${fmt(val)}</span>
          </div>
        ))}</Card>}
        {mo.slice(0, 8).length > 0 && <Card style={{ padding: '0.75rem' }}><SLabel>最近記錄</SLabel>{mo.slice(0, 8).map((r, i) => {
          const sign = r.type === 'inc' ? '+' : r.type === 'xfr' ? '⇄' : '-'; const color = r.type === 'inc' ? 'var(--green)' : r.type === 'xfr' ? 'var(--blue)' : 'var(--red)';
          return (<div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: i < Math.min(mo.length, 8) - 1 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: CB[r.cat] || '#f0efe9', color: CC[r.cat] || '#6b6b65', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, flexShrink: 0 }}>{(r.note || r.cat || '?').charAt(0)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.note || r.cat}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{r.date}</div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color, fontFamily: 'DM Mono,monospace', flexShrink: 0 }}>{sign}${fmt(r.twd)}</div>
          </div>);
        })}</Card>}
      </div>
      <Card style={{ padding: '0' }}>
        <button onClick={() => setShowTrend(t => !t)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '12px 1rem', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 'var(--r)' }}>
          <SLabel style={{ margin: 0 }}>近6個月趨勢</SLabel>
          <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500 }}>{showTrend ? '收起 ▲' : '展開 ▼'}</span>
        </button>
        {showTrend && <div style={{ padding: '0 0 12px' }}>
          <div style={{ display: 'flex', gap: 12, fontSize: 11, justifyContent: 'flex-end', padding: '0 12px 6px' }}>
            <span style={{ color: '#1a7a55', display: 'flex', alignItems: 'center', gap: 4 }}><svg width="18" height="6"><line x1="0" y1="3" x2="18" y2="3" stroke="#1a7a55" strokeWidth="2" strokeLinecap="round" /></svg>收入</span>
            <span style={{ color: '#c0392b', display: 'flex', alignItems: 'center', gap: 4 }}><svg width="18" height="6"><line x1="0" y1="3" x2="18" y2="3" stroke="#c0392b" strokeWidth="2" strokeLinecap="round" /></svg>支出</span>
          </div>
          <svg width="100%" height="250" style={{ display: 'block', overflow: 'visible' }}>
            {[0, 0.5, 1].map(f => { const yv = nMax * f; const yp = Math.round(14 + 208 * (1 - f)); const lbl = yv >= 10000 ? `${+(yv / 10000).toFixed(1)}萬` : yv >= 1000 ? `${+(yv / 1000).toFixed(1)}k` : Math.round(yv); return (<g key={f}><line x1="12%" y1={yp} x2="98%" y2={yp} stroke="rgba(0,0,0,0.07)" strokeWidth="1" /><text x="11%" y={yp + 4} textAnchor="end" fontSize="10" fill="#9a9a92">{lbl}</text></g>); })}
            {mInc.map((v, i) => i < 5 && <line key={'il' + i} x1={`${12 + i * 17}%`} y1={Math.round(222 - 208 * v / nMax)} x2={`${12 + (i + 1) * 17}%`} y2={Math.round(222 - 208 * mInc[i + 1] / nMax)} stroke="#1a7a55" strokeWidth="2" strokeLinecap="round" />)}
            {mExp.map((v, i) => i < 5 && <line key={'el' + i} x1={`${12 + i * 17}%`} y1={Math.round(222 - 208 * v / nMax)} x2={`${12 + (i + 1) * 17}%`} y2={Math.round(222 - 208 * mExp[i + 1] / nMax)} stroke="#c0392b" strokeWidth="2" strokeLinecap="round" />)}
            {mInc.map((v, i) => <circle key={'id' + i} cx={`${12 + i * 17}%`} cy={Math.round(222 - 208 * v / nMax)} r="4" fill="#1a7a55" stroke="#fff" strokeWidth="1.5" />)}
            {mExp.map((v, i) => <circle key={'ed' + i} cx={`${12 + i * 17}%`} cy={Math.round(222 - 208 * v / nMax)} r="4" fill="#c0392b" stroke="#fff" strokeWidth="1.5" />)}
            {last6.map((mm, i) => <text key={mm} x={`${12 + i * 17}%`} y="247" textAnchor="middle" fontSize="10" fill="#9a9a92">{Number(mm.slice(5))}月</text>)}
          </svg>
        </div>}
      </Card>
    </div>
  );
}
