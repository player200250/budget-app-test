import { useState, useEffect } from 'react';
import type { TxRecord, Budgets } from '../types';
import { CATS } from '../lib/constants';
import { fmt, ym, showSync } from '../lib/utils';
import { Btn } from './ui';

type CardType = 'good' | 'warn' | 'info' | 'tip';
interface AnalysisCard { title: string; body: string; type: CardType; }

const sumTwd = (rs: TxRecord[]) => rs.reduce((s, r) => s + Number(r.twd), 0);
const byCat = (rs: TxRecord[]) => { const o: Record<string, number> = {}; rs.forEach(r => { o[r.cat] = (o[r.cat] || 0) + Number(r.twd); }); return o; };
const parseDate = (s: string) => { const [y, mo, d] = s.split('-').map(Number); return new Date(y, mo - 1, d); };
const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

async function copyText(text: string) {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* 改用舊方法 */ }
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(ta);
  return ok;
}

export default function AIView({ records, viewMonth, budgets }: {
  records: TxRecord[];
  viewMonth: Date;
  budgets: Budgets;
}) {
  const [cards, setCards] = useState<AnalysisCard[]>([]);
  const [ran, setRan] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [withNotes, setWithNotes] = useState(false);
  const m = ym(viewMonth);
  const mo = records.filter(r => r.date.startsWith(m));
  const moExp = mo.filter(r => r.type === 'exp');
  const income = sumTwd(mo.filter(r => r.type === 'inc'));
  const expense = sumTwd(moExp);
  const saveRate = income > 0 ? Math.round((income - expense) / income * 100) : null;
  const isCurrentMonth = m === ym(new Date());
  const monthDays = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const days = isCurrentMonth ? new Date().getDate() : 0;
  const projected = isCurrentMonth && days > 0 ? Math.round(expense / days * monthDays) : 0;
  const catExp = byCat(moExp);
  const pm = ym(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1));
  const prevExpRecs = records.filter(r => r.date.startsWith(pm) && r.type === 'exp');

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

    // 2. 與上月比較（當月未過完時，以同期天數比較）
    if (prevExpRecs.length > 0 && expense > 0) {
      const cutoff = isCurrentMonth ? days : 31;
      const prevSame = prevExpRecs.filter(r => parseDate(r.date).getDate() <= cutoff);
      const prevTotal = sumTwd(prevSame);
      if (prevTotal > 0) {
        const diff = expense - prevTotal; const pct = Math.round(diff / prevTotal * 100);
        const prevCat = byCat(prevSame);
        const jumps = Object.entries(catExp).map(([c, v]) => [c, v - (prevCat[c] || 0)] as const).filter(([, d]) => d > 0).sort((a, b) => b[1] - a[1]);
        const label = isCurrentMonth ? `與上月同期（1–${days} 日）相比` : '與上月相比';
        if (pct >= 15) {
          result.push({ title: `支出比上月多 ${pct}%`, body: `${label}多花 $${fmt(diff)}。${jumps.length ? `增加最多的是「${jumps[0][0]}」+$${fmt(jumps[0][1])}。` : ''}`, type: 'warn' });
        } else if (pct <= -15) {
          result.push({ title: `支出比上月少 ${-pct}%`, body: `${label}少花 $${fmt(-diff)}，控制得不錯！`, type: 'good' });
        } else {
          result.push({ title: '支出與上月相近', body: `${label}差距 ${pct >= 0 ? '+' : ''}${pct}%（$${fmt(diff)}），消費節奏穩定。`, type: 'info' });
        }
      }
    }

    // 3. 「其他」佔比過高（超過 30% 時取代集中度卡片）
    const otherPct = expense > 0 ? Math.round((catExp['其他'] || 0) / expense * 100) : 0;
    if (otherPct > 30) {
      result.push({ title: `「其他」佔支出 ${otherPct}%`, body: `本月有 $${fmt(catExp['其他'])} 歸在「其他」，建議到明細改成正確分類，分析才會準確。`, type: 'warn' });
    }

    // 4. 最大支出分類
    const topEntries = Object.entries(catExp).sort((a, b) => b[1] - a[1]);
    if (topEntries.length > 0 && !(topEntries[0][0] === '其他' && otherPct > 30)) {
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

    // 5. 異常大額支出（高於本月單筆中位數 3 倍且至少 $1,000）
    if (moExp.length >= 5) {
      const sorted = moExp.map(r => Number(r.twd)).sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      const big = moExp.filter(r => Number(r.twd) >= Math.max(median * 3, 1000)).sort((a, b) => Number(b.twd) - Number(a.twd)).slice(0, 3);
      if (big.length > 0) {
        result.push({ title: `${big.length} 筆大額支出`, body: big.map(r => `${r.date.slice(5)} ${r.cat}${r.note ? `「${r.note}」` : ''} $${fmt(Number(r.twd))}`).join('；') + `。單筆中位數為 $${fmt(median)}，確認是否為必要支出。`, type: 'tip' });
      }
    }

    // 6. 平日 vs 週末日均消費
    const elapsed = isCurrentMonth ? days : monthDays;
    let wkDays = 0, weDays = 0;
    for (let d = 1; d <= elapsed; d++) { if (isWeekend(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d))) weDays++; else wkDays++; }
    if (moExp.length >= 5 && wkDays > 0 && weDays > 0) {
      const weSum = sumTwd(moExp.filter(r => isWeekend(parseDate(r.date))));
      const wkAvg = (expense - weSum) / wkDays, weAvg = weSum / weDays;
      if (wkAvg > 0 && weAvg >= wkAvg * 1.5) {
        result.push({ title: `週末日均是平日的 ${(weAvg / wkAvg).toFixed(1)} 倍`, body: `週末日均 $${fmt(weAvg)}、平日日均 $${fmt(wkAvg)}。週末消費偏高，可以事先規劃週末預算。`, type: 'tip' });
      } else if (weAvg > 0 && wkAvg >= weAvg * 1.5) {
        result.push({ title: `平日日均是週末的 ${(wkAvg / weAvg).toFixed(1)} 倍`, body: `平日日均 $${fmt(wkAvg)}、週末日均 $${fmt(weAvg)}。可留意通勤、午餐等平日固定開銷。`, type: 'info' });
      }
    }

    // 7. 預算超支 / 接近上限警告
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

    // 8. 月底超支預警（至少消費 5 天後才預測）
    if (isCurrentMonth && income > 0 && days >= 5 && projected > income * 1.1) {
      const remain = monthDays - days;
      const daily = remain > 0 ? Math.round((income - expense) / remain) : 0;
      result.push({ title: '本月可能超支', body: `目前日均消費 $${fmt(Math.round(expense / days))}，月底預估 $${fmt(projected)}（超出收入 $${fmt(projected - income)}）。後續每日建議控制在 $${fmt(Math.max(0, daily))} 以內。`, type: 'warn' });
    }

    setCards(result);
    setRan(true);
  }

  // 給 Claude 的分析內容：只送彙總，備註需使用者勾選才附上
  function buildPrompt() {
    const lines: string[] = [
      '請扮演我的個人理財顧問，根據以下記帳彙總（金額單位：新台幣）分析我的財務狀況：',
      '1. 本月整體評估',
      '2. 值得注意的支出變化或異常',
      '3. 三個具體、可執行的建議',
      '請用繁體中文、條列式簡潔回答。',
      '',
      `【${m} 本月】${isCurrentMonth ? `（資料截至 ${days} 日，本月共 ${monthDays} 天）` : '（整月）'}`,
      `收入 $${fmt(income)}、支出 $${fmt(expense)}、結餘 $${fmt(income - expense)}${saveRate !== null ? `、儲蓄率 ${saveRate}%` : ''}`,
      '各分類支出：',
      ...CATS.exp.filter(c => catExp[c] || budgets[c]).map(c => {
        const v = catExp[c] || 0, bud = budgets[c] || 0;
        return `- ${c} $${fmt(v)}${bud > 0 ? `（預算 $${fmt(bud)}，已用 ${Math.round(v / bud * 100)}%）` : ''}`;
      }),
      '',
      '【近 6 個月趨勢】',
    ];
    for (let i = 5; i >= 0; i--) {
      const k = ym(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - i, 1));
      const rs = records.filter(r => r.date.startsWith(k));
      if (!rs.length) continue;
      const exp = rs.filter(r => r.type === 'exp');
      const cats = Object.entries(byCat(exp)).sort((a, b) => b[1] - a[1]).map(([c, v]) => `${c} ${fmt(v)}`).join('、');
      lines.push(`- ${k}：收入 $${fmt(sumTwd(rs.filter(r => r.type === 'inc')))}、支出 $${fmt(sumTwd(exp))}${cats ? `（${cats}）` : ''}`);
    }
    const top = [...moExp].sort((a, b) => Number(b.twd) - Number(a.twd)).slice(0, 5);
    if (top.length) {
      lines.push('', '【本月前 5 大單筆支出】', ...top.map(r => `- ${r.date} ${r.cat} $${fmt(Number(r.twd))}${withNotes && r.note ? `（備註：${r.note}）` : ''}`));
    }
    return lines.join('\n');
  }

  async function copyForClaude() {
    if (await copyText(buildPrompt())) { setCopied(true); showSync('已複製，請到 Claude 貼上', 'ok'); }
    else showSync('複製失敗，請展開內容手動複製', 'err');
  }

  useEffect(() => { setRan(false); setCopied(false); setShowPrompt(false); }, [m]);
  useEffect(() => { setCopied(false); }, [withNotes]);
  useEffect(() => { if (!ran) analyze(); }, [ran]);

  const cm: Record<CardType, { bg: string; bc: string; tc: string }> = { good: { bg: '#e8f5ee', bc: '#1a7a55', tc: '#0d5c3a' }, warn: { bg: '#fdf5e0', bc: '#a06b00', tc: '#7a4f00' }, info: { bg: '#eaf1fb', bc: '#1a5fa8', tc: '#0d3f7a' }, tip: { bg: '#f0edfc', bc: '#5b3fa8', tc: '#3d2880' } };
  return (<div>
    <div style={{ background: 'var(--surface2)', borderRadius: 12, padding: '12px 14px', marginBottom: 10, fontSize: 13, color: 'var(--text2)' }}>
      {m} · {mo.length} 筆記錄 · 支出 ${fmt(expense)}{income > 0 ? ` · 儲蓄率 ${saveRate}%` : ''}
    </div>
    {cards.map((c, i) => { const col = cm[c.type] || cm.tip; return (<div key={i} style={{ borderRadius: 12, padding: '14px', marginBottom: 10, background: col.bg, borderLeft: `3px solid ${col.bc}` }}><div style={{ fontSize: 13, fontWeight: 600, color: col.tc, marginBottom: 5 }}>{c.title}</div><div style={{ fontSize: 13, color: col.tc, opacity: .85, lineHeight: 1.6 }}>{c.body}</div></div>); })}
    <Btn onClick={() => { setRan(false); }} style={{ background: 'var(--purple-bg)', color: 'var(--purple)', marginTop: 4 }}>重新分析</Btn>
    {mo.length > 0 && (<div style={{ marginTop: 16, padding: 14, borderRadius: 12, border: '1px solid var(--border2)' }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>交給 Claude 深入分析</div>
      <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6, marginBottom: 10 }}>複製本月與近 6 個月的彙總，貼到 Claude 即可取得分析並追問。</div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text2)', marginBottom: 10, cursor: 'pointer' }}><input type="checkbox" checked={withNotes} onChange={e => setWithNotes(e.target.checked)} />包含大額支出的備註（讓 Claude 看懂用途）</label>
      <Btn onClick={copyForClaude} style={{ background: 'var(--purple)' }}>{copied ? '✓ 已複製，再複製一次' : '複製分析內容'}</Btn>
      {copied && <a href="https://claude.ai/new" target="_blank" rel="noopener noreferrer" style={{ display: 'block', textAlign: 'center', marginTop: 8, padding: '12px 16px', borderRadius: 'var(--r)', background: 'var(--purple-bg)', color: 'var(--purple)', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>開啟 Claude 貼上 ↗</a>}
      <div onClick={() => setShowPrompt(!showPrompt)} style={{ marginTop: 10, fontSize: 12, color: 'var(--text3)', cursor: 'pointer', textAlign: 'center' }}>{showPrompt ? '隱藏' : '查看'}將複製的內容</div>
      {showPrompt && <textarea readOnly value={buildPrompt()} onFocus={e => e.currentTarget.select()} style={{ width: '100%', minHeight: 220, marginTop: 8, padding: 10, borderRadius: 8, border: '1px solid var(--border2)', fontSize: 12, lineHeight: 1.6, color: 'var(--text2)', background: 'var(--surface2)', boxSizing: 'border-box', resize: 'vertical' }} />}
    </div>)}
  </div>);
}
