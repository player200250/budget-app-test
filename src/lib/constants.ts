import type { TxType } from '../types';

export const CATS: Record<TxType, string[]> = {
  exp: ['餐飲', '交通', '購物', '娛樂', '醫療', '居住', '教育', '訂閱', '其他'],
  inc: ['薪水', '獎金', '投資', '副業', '退款', '其他'],
  xfr: ['轉帳'],
};

export const CC: Record<string, string> = {
  餐飲: '#1a7a55', 交通: '#1a5fa8', 購物: '#c0392b', 娛樂: '#8e3a9d', 醫療: '#5b3fa8',
  居住: '#a06b00', 教育: '#2e7d32', 訂閱: '#0277bd', 其他: '#6b6b65', 薪水: '#1a7a55',
  獎金: '#1a5fa8', 投資: '#5b3fa8', 副業: '#a06b00', 退款: '#2e7d32', 轉帳: '#1a5fa8',
};

export const CB: Record<string, string> = {
  餐飲: '#e8f5ee', 交通: '#eaf1fb', 購物: '#fdf0ee', 娛樂: '#f8edfb', 醫療: '#f0edfc',
  居住: '#fdf5e0', 教育: '#edf7ee', 訂閱: '#e3f2fd', 其他: '#f0efe9', 薪水: '#e8f5ee',
  獎金: '#eaf1fb', 投資: '#f0edfc', 副業: '#fdf5e0', 退款: '#edf7ee', 轉帳: '#eaf1fb',
};

export const ACCT_ICONS: Record<string, string> = {
  現金: '💵', 銀行存款: '🏦', 信用卡: '💳', 電子支付: '📱', 投資: '📈',
};

export interface TabDef { id: string; icon: string; label: string; }

export const ALL_TABS: TabDef[] = [
  { id: 'home', icon: '⊙', label: '總覽' },
  { id: 'add', icon: '+', label: '新增記錄' },
  { id: 'records', icon: '≡', label: '明細' },
  { id: 'budget', icon: '◎', label: '預算' },
  { id: 'accounts', icon: '▣', label: '帳戶' },
  { id: 'fixed', icon: '↻', label: '固定收支' },
  { id: 'share', icon: '⇌', label: '共享帳本' },
  { id: 'ai', icon: '✦', label: 'AI 分析' },
];

export const MOBILE_NAV: TabDef[] = [
  { id: 'home', icon: '⊙', label: '總覽' },
  { id: 'add', icon: '+', label: '新增' },
  { id: 'records', icon: '≡', label: '明細' },
  { id: 'more', icon: '···', label: '更多' },
];

export const MORE_TABS: TabDef[] = ALL_TABS.slice(3);
