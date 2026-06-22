import type { TxRecord } from '../types';
import { CC, CB } from '../lib/constants';
import { sb } from '../lib/supabase';
import { showSync, fmt, ym, csvEscape } from '../lib/utils';
import { Card, Badge, SLabel } from './ui';

export default function RecordsView({ records, setRecords, viewMonth, userId }: {
  records: TxRecord[];
  setRecords: (r: TxRecord[]) => void;
  viewMonth: Date;
  userId: string;
}) {
  const m = ym(viewMonth);
  const filtered = records.filter(r => r.date.startsWith(m));
  async function del(id: string) {
    await sb.from('records').delete().eq('id', id).eq('user_id', userId);
    setRecords(records.filter(x => x.id !== id));
    showSync('已刪除', 'ok');
  }
  function exportCSV() {
    let csv = '﻿日期,類型,分類,備註,金額,幣別,台幣金額\n';
    filtered.forEach(r => { csv += `${csvEscape(r.date)},${r.type === 'exp' ? '支出' : r.type === 'inc' ? '收入' : '轉帳'},${csvEscape(r.cat)},${csvEscape(r.note)},${csvEscape(r.amount)},${csvEscape(r.currency || 'TWD')},${csvEscape(r.twd)}\n`; });
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `記帳_${m}.csv`; a.click();
  }
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <SLabel style={{ margin: 0 }}>本月明細（{filtered.length} 筆）</SLabel>
        <button onClick={exportCSV} style={{ background: 'transparent', border: '1px solid var(--border2)', borderRadius: 8, padding: '5px 12px', fontSize: 12, color: 'var(--text2)', cursor: 'pointer' }}>匯出 CSV</button>
      </div>
      {!filtered.length ? <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text3)' }}>本月尚無記錄</div> :
        <Card style={{ padding: '0 0.75rem' }}>
          {filtered.map((r, i) => {
            const sign = r.type === 'inc' ? '+' : r.type === 'xfr' ? '⇄' : '-';
            const color = r.type === 'inc' ? 'var(--green)' : r.type === 'xfr' ? 'var(--blue)' : 'var(--red)';
            const label = r.currency && r.currency !== 'TWD' ? `${sign}${r.amount} ${r.currency}` : `${sign}$${fmt(r.twd)}`;
            return (<div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0', borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: CB[r.cat] || '#f0efe9', color: CC[r.cat] || '#6b6b65', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 600, flexShrink: 0 }}>{(r.note || r.cat || '?').charAt(0)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.note || r.cat}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 3, alignItems: 'center' }}><Badge cat={r.cat} /><span style={{ fontSize: 11, color: 'var(--text3)' }}>{r.date}</span></div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color, fontFamily: 'DM Mono,monospace', flexShrink: 0 }}>{label}</div>
              <button onClick={() => del(r.id)} style={{ background: 'none', border: 'none', color: 'var(--border2)', fontSize: 20, padding: '0 0 0 4px', flexShrink: 0, cursor: 'pointer' }}>×</button>
            </div>);
          })}
        </Card>}
    </div>
  );
}
