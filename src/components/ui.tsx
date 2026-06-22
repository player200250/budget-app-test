import type { CSSProperties, ReactNode } from 'react';
import { CC, CB } from '../lib/constants';

export const Card = ({ children, style = {} }: { children: ReactNode; style?: CSSProperties }) => (
  <div style={{ background: 'var(--surface)', borderRadius: 'var(--r)', border: '1px solid var(--border)', padding: '1rem', marginBottom: 10, ...style }}>{children}</div>
);

export const Badge = ({ cat }: { cat: string }) => (
  <span style={{ background: CB[cat] || '#f0efe9', color: CC[cat] || '#6b6b65', fontSize: 12, padding: '3px 9px', borderRadius: 20, fontWeight: 500 }}>{cat}</span>
);

export const SLabel = ({ children, style = {} }: { children: ReactNode; style?: CSSProperties }) => (
  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8, ...style }}>{children}</div>
);

export const ProgBar = ({ pct, color = 'var(--green)' }: { pct: number; color?: string }) => (
  <div style={{ height: 5, background: 'var(--surface2)', borderRadius: 3, overflow: 'hidden' }}>
    <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 3, transition: 'width .4s' }} />
  </div>
);

export const Btn = ({ children, onClick, style = {} }: { children: ReactNode; onClick?: () => void; style?: CSSProperties }) => (
  <button onClick={onClick} style={{ padding: '12px 16px', borderRadius: 'var(--r)', border: 'none', background: 'var(--text)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', width: '100%', ...style }}>{children}</button>
);
