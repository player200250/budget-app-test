import { useState, useEffect } from 'react';
import type { TxRecord, Budgets } from '../types';
import { fmt, ym } from '../lib/utils';
import { Btn } from './ui';

type CardType = 'good' | 'warn' | 'info' | 'tip';
interface AnalysisCard { title: string; body: string; type: CardType; }

export default function AIView({ records, viewMonth, budgets }: {
  records: TxRecord[];
  viewMonth: Date;
  budgets: Budgets;
}) {
  const [cards, setCards] = useState<AnalysisCard[]>([]);
  const [ran, setRan] = useState(false);
  const m = ym(viewMonth);
  const mo = records.filter(r => r.date.startsWith(m));
  const income = mo.filter(r => r.type === 'inc').reduce((s, r) => s + Number(r.twd), 0);
  const expense = mo.filter(r => r.type === 'exp').reduce((s, r) => s + Number(r.twd), 0);
  const saveRate = income > 0 ? Math.round((income - expense) / income * 100) : null;
  const isCurrentMonth = m === ym(new Date());
  const days = isCurrentMonth ? new Date().getDate() : 0;
  const projected = isCurrentMonth && days > 0 ? Math.round(expense / days * 30) : 0;
  const catExp: Record<string, number> = {}; mo.filter(r => r.type === 'exp').forEach(r => { catExp[r.cat] = (catExp[r.cat] || 0) + Number(r.twd); });

  function analyze() {
    if (!mo.length) { setCards([{ title: '尚無資料', body: '請先新增本月記錄，系統即可自動分析財務狀況。', type: 'info' }]); setRan(true); return; }
    const result: AnalysisCard[] = [];

    // 1. 儲蓄率評估
    if (saveRate === null) {
      result.push({ title: '本月尚無收入記錄', body: `本月已支出 $${fmt(expense)}，建議補登薪水或其他收入，以便計算儲蓄率與結餘。`, type: 'info' });
    } else if (saveRate >= 30) {
      result.push({ title: `儲蓄率 ${saveRate}% ─ 優秀`, body: `本月收入 $${fmt(income)}、支出 $${fmt(expense)}，成功儲蓄 $${fmt(income - expense)}。財務健康，繼續保持！`, type: 'good' });
    } else if (saveRate >= 10) {
      result.push({ title: `儲蓄率 ${saveRate}% ─ 尚可`, body: `理想目標為 30%，目前尚差約 $${fmt(Math.max(0, Math.round(income * 0.3 - (income - expense))))}。可嘗試從彈性支出（餐飲、娛樂）著手節省。`, type: 'tip' });
    } else {
      result.push({ title: `儲蓄率 ${saveRate}% ─ 需注意`, body: `支出已佔收入 ${100 - saveRate}%${isCurrentMonth ? `，月底預估支出 $${fmt(projected)}` : ''}，建議立即找出可削減的項目。`, type: 'warn' });
    }

    // 2. 最大支出分類
    const topEntries = Object.entries(catExp).sort((a, b) => b[1] - a[1]);
    if (topEntries.length > 0) {
      const [topCat, topVal] = topEntries[0];
      const pct = expense > 0 ? Math.round(topVal / expense * 100) : 0;
      if (pct > 50) {
        result.push({ title: `「${topCat}」支出集中 ${pct}%`, body: `${topCat} 本月 $${fmt(topVal)}，佔總支出過半。若為固定開銷可忽略；若為彈性消費，建議設定上限。`, type: 'warn' });
      } else if (pct > 30) {
        result.push({ title: `最大支出：${topCat} $${fmt(topVal)}`, body: `佔本月支出 ${pct}%，屬合理範圍。${topEntries.length > 1 ? `次高為「${topEntries[1][0]}」$${fmt(topEntries[1][1])}（${Math.round(topEntries[1][1] / expense * 100)}%）。` : ''}`, type: 'tip' });
      } else {
        result.push({ title: '支出分佈均衡', body: `最高分類「${topCat}」僅佔 ${pct}%，${topEntries.length} 個支出分類分佈平均，消費結構健康。`, type: 'good' });
      }
    }

    // 3. 預算超支 / 接近上限警告
    const bds = budgets || {};
    const overBudget = Object.entries(bds).filter(([c, bud]) => bud > 0 && (catExp[c] || 0) > bud);
    const nearBudget = Object.entries(bds).filter(([c, bud]) => bud > 0 && (catExp[c] || 0) / bud >= 0.7 && (catExp[c] || 0) <= bud);
    const hasBudget = Object.values(bds).some(v => v > 0);
    if (overBudget.length > 0) {
      result.push({ title: `${overBudget.length} 個分類超出預算`, body: overBudget.map(([c, bud]) => `${c} 超出 $${fmt((catExp[c] || 0) - bud)}（已用 ${Math.round((catExp[c] || 0) / bud * 100)}%）`).join('；') + '。建議下半月在這些分類謹慎消費。', type: 'warn' });
    } else if (nearBudget.length > 0) {
      result.push({ title: '部分預算接近上限', body: nearBudget.map(([c, bud]) => `${c} ${Math.round((catExp[c] || 0) / bud * 100)}%`).join('、') + '，本月剩餘空間有限，請留意。', type: 'tip' });
    } else if (hasBudget) {
      result.push({ title: '預算控制良好', body: '所有已設定預算的分類目前使用率均低於 70%，財務紀律良好。', type: 'good' });
    }

    // 4. 月底超支預警（至少消費 5 天後才預測）
    if (isCurrentMonth && income > 0 && days >= 5 && projected > income * 1.1) {
      const remain = 30 - days;
      const daily = remain > 0 ? Math.round((income - expense) / remain) : 0;
      result.push({ title: '本月可能超支', body: `目前日均消費 $${fmt(Math.round(expense / days))}，月底預估 $${fmt(projected)}（超出收入 $${fmt(projected - income)}）。後續每日建議控制在 $${fmt(Math.max(0, daily))} 以內。`, type: 'warn' });
    }

    setCards(result);
    setRan(true);
  }

  useEffect(() => { setRan(false); }, [m]);
  useEffect(() => { if (!ran) analyze(); }, [ran]);

  const cm: Record<CardType, { bg: string; bc: string; tc: string }> = { good: { bg: '#e8f5ee', bc: '#1a7a55', tc: '#0d5c3a' }, warn: { bg: '#fdf5e0', bc: '#a06b00', tc: '#7a4f00' }, info: { bg: '#eaf1fb', bc: '#1a5fa8', tc: '#0d3f7a' }, tip: { bg: '#f0edfc', bc: '#5b3fa8', tc: '#3d2880' } };
  return (<div>
    <div style={{ background: 'var(--surface2)', borderRadius: 12, padding: '12px 14px', marginBottom: 10, fontSize: 13, color: 'var(--text2)' }}>
      {m} · {mo.length} 筆記錄 · 支出 ${fmt(expense)}{income > 0 ? ` · 儲蓄率 ${saveRate}%` : ''}
    </div>
    {cards.map((c, i) => { const col = cm[c.type] || cm.tip; return (<div key={i} style={{ borderRadius: 12, padding: '14px', marginBottom: 10, background: col.bg, borderLeft: `3px solid ${col.bc}` }}><div style={{ fontSize: 13, fontWeight: 600, color: col.tc, marginBottom: 5 }}>{c.title}</div><div style={{ fontSize: 13, color: col.tc, opacity: .85, lineHeight: 1.6 }}>{c.body}</div></div>); })}
    <Btn onClick={() => { setRan(false); }} style={{ background: 'var(--purple-bg)', color: 'var(--purple)', marginTop: 4 }}>重新分析</Btn>
  </div>);
}
