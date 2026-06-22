export type SyncType = 'info' | 'ok' | 'err';

export function showSync(msg: string, type: SyncType = 'info') {
  const el = document.getElementById('sync-bar');
  if (!el) return;
  el.textContent = msg;
  el.className = 'sync-bar show ' + type;
  if (type !== 'info') setTimeout(() => el.classList.remove('show'), 2500);
}

export function fmt(n: number) {
  return Math.round(n).toLocaleString();
}

export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function ym(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function csvEscape(v: unknown) {
  const s = String(v == null ? '' : v);
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? '"' + s.replace(/"/g, '""') + '"'
    : s;
}

export const isDesktop = () => window.innerWidth >= 600;
