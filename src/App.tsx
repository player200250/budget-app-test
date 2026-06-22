import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import type { TxRecord, Account, Budgets, FixedItem } from './types';
import { ALL_TABS, MOBILE_NAV, MORE_TABS } from './lib/constants';
import { sb } from './lib/supabase';
import { showSync, isDesktop } from './lib/utils';
import LoginPage from './components/LoginPage';
import HomeView from './components/HomeView';
import AddView from './components/AddView';
import RecordsView from './components/RecordsView';
import BudgetView from './components/BudgetView';
import AccountsView from './components/AccountsView';
import FixedView from './components/FixedView';
import ShareView from './components/ShareView';
import AIView from './components/AIView';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tab, setTab] = useState('home');
  const [moreTab, setMoreTab] = useState('budget');
  const [viewMonth, setViewMonth] = useState(new Date());
  const [records, setRecords] = useState<TxRecord[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [budgets, setBudgets] = useState<Budgets>({});
  const [fixedItems, setFixedItems] = useState<FixedItem[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [desktop, setDesktop] = useState(isDesktop());

  useEffect(() => {
    sb.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    const { data: { subscription } } = sb.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    async function loadAll() {
      const u = user!;
      setDataLoading(true); showSync('從雲端載入資料...');
      const uid = u.id;
      const [r, a, b, fi] = await Promise.all([
        sb.from('records').select('*').eq('user_id', uid).order('date', { ascending: false }),
        sb.from('accounts').select('*').eq('user_id', uid),
        sb.from('budgets').select('*').eq('user_id', uid),
        sb.from('fixed_items').select('*').eq('user_id', uid).order('next_date', { ascending: true }),
      ]);
      if (r.data) setRecords(r.data as TxRecord[]);
      if (a.data) setAccounts((a.data.length > 0 ? a.data : [{ id: crypto.randomUUID(), name: '現金', type: '現金', init: 0, user_id: uid }, { id: crypto.randomUUID() + 1, name: '銀行', type: '銀行存款', init: 0, user_id: uid }]) as Account[]);
      if (b.data) { const bd: Budgets = {}; b.data.forEach((x: { cat: string; amount: number }) => { bd[x.cat] = x.amount; }); setBudgets(bd); }
      if (fi.data) setFixedItems(fi.data as FixedItem[]);
      setDataLoading(false); showSync('資料已同步', 'ok');
    }
    loadAll();
    const h = () => setDesktop(isDesktop());
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, [user]);

  async function signOut() {
    await sb.auth.signOut();
    setUser(null); setRecords([]); setAccounts([]); setBudgets({});
  }

  function changeMonth(d: number) { setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + d, 1)); }
  const monthLabel = `${viewMonth.getFullYear()}年${viewMonth.getMonth() + 1}月`;

  if (authLoading) return (<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 12 }}><div style={{ fontSize: 28 }}>💰</div><div style={{ fontSize: 14, color: 'var(--text2)' }}>載入中...</div></div>);
  if (!user) return <LoginPage />;

  const viewMap: Record<string, ReactNode> = {
    home: <HomeView records={records} accounts={accounts} budgets={budgets} viewMonth={viewMonth} />,
    add: <AddView records={records} setRecords={setRecords} accounts={accounts} userId={user.id} onDone={() => setTab('home')} />,
    records: <RecordsView records={records} setRecords={setRecords} viewMonth={viewMonth} userId={user.id} />,
    budget: <BudgetView budgets={budgets} setBudgets={setBudgets} records={records} viewMonth={viewMonth} userId={user.id} />,
    accounts: <AccountsView accounts={accounts} setAccounts={setAccounts} records={records} userId={user.id} />,
    fixed: <FixedView fixedItems={fixedItems} setFixedItems={setFixedItems} records={records} setRecords={setRecords} accounts={accounts} userId={user.id} />,
    share: <ShareView userId={user.id} />,
    ai: <AIView records={records} viewMonth={viewMonth} budgets={budgets} />,
  };

  const userAvatar = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {user.user_metadata?.avatar_url && <img src={user.user_metadata.avatar_url} style={{ width: 28, height: 28, borderRadius: '50%' }} />}
      <button onClick={signOut} style={{ background: 'transparent', border: '1px solid var(--border2)', borderRadius: 8, padding: '4px 10px', fontSize: 12, color: 'var(--text2)', cursor: 'pointer' }}>登出</button>
    </div>
  );

  if (desktop) {
    return (<div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', minHeight: '100vh' }}>
      <div style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)', padding: '1.5rem 1rem', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 18, fontWeight: 600, padding: '0 0.5rem 1rem', borderBottom: '1px solid var(--border)', marginBottom: '0.5rem' }}>我的帳本</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 0.5rem', marginBottom: '1rem' }}>
          <button onClick={() => changeMonth(-1)} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--border2)', background: 'transparent', fontSize: 16, cursor: 'pointer', color: 'var(--text2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
          <span style={{ fontSize: 13, fontWeight: 500, flex: 1, textAlign: 'center' }}>{monthLabel}</span>
          <button onClick={() => changeMonth(1)} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--border2)', background: 'transparent', fontSize: 16, cursor: 'pointer', color: 'var(--text2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
        </div>
        {ALL_TABS.map(t => (<button key={t.id} onClick={() => setTab(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', borderRadius: 10, border: 'none', background: tab === t.id ? 'var(--surface2)' : 'transparent', color: tab === t.id ? 'var(--text)' : 'var(--text2)', fontWeight: tab === t.id ? 600 : 400, fontSize: 14, cursor: 'pointer', marginBottom: 2, textAlign: 'left' }}><span style={{ fontSize: 17 }}>{t.icon}</span>{t.label}</button>))}
        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>{userAvatar}</div>
      </div>
      <div style={{ padding: '2rem', overflowY: 'auto' }}>{dataLoading ? <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text3)' }}>載入中...</div> : viewMap[tab] || viewMap.home}</div>
    </div>);
  }

  return (<div style={{ maxWidth: 560, margin: '0 auto', paddingBottom: 90 }}>
    {tab !== 'add' && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1rem 0.5rem' }}>
      <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.5px' }}>我的帳本</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => changeMonth(-1)} style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--border2)', background: 'transparent', fontSize: 16, color: 'var(--text2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>‹</button>
          <span style={{ fontSize: 12, fontWeight: 500, minWidth: 72, textAlign: 'center' }}>{monthLabel}</span>
          <button onClick={() => changeMonth(1)} style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--border2)', background: 'transparent', fontSize: 16, color: 'var(--text2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>›</button>
        </div>
        {user.user_metadata?.avatar_url && <img src={user.user_metadata.avatar_url} onClick={signOut} style={{ width: 28, height: 28, borderRadius: '50%', cursor: 'pointer' }} title="點擊登出" />}
      </div>
    </div>}
    <div style={{ padding: '0 1rem' }}>
      {tab === 'more' ? (<>
        <div style={{ display: 'flex', gap: 2, background: 'var(--surface2)', borderRadius: 12, padding: 3, marginBottom: 12, overflowX: 'auto' }}>
          {MORE_TABS.map(t => (<button key={t.id} onClick={() => setMoreTab(t.id)} style={{ flex: '0 0 auto', padding: '7px 13px', borderRadius: 9, border: 'none', background: moreTab === t.id ? 'var(--surface)' : 'transparent', color: moreTab === t.id ? 'var(--text)' : 'var(--text2)', fontWeight: moreTab === t.id ? 600 : 400, fontSize: 13, cursor: 'pointer' }}>{t.label}</button>))}
        </div>
        {viewMap[moreTab] || viewMap.budget}
      </>) : viewMap[tab] || viewMap.home}
    </div>
    <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 560, background: 'var(--surface)', borderTop: '1px solid var(--border)', display: 'flex', zIndex: 100, paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {MOBILE_NAV.map(n => (<button key={n.id} onClick={() => setTab(n.id)} style={{ flex: 1, padding: '10px 0 8px', border: 'none', background: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, color: tab === n.id ? 'var(--text)' : 'var(--text3)', cursor: 'pointer' }}>
        <span style={{ fontSize: n.id === 'add' ? 22 : 18, fontWeight: 600, lineHeight: 1 }}>{n.icon}</span>
        <span style={{ fontSize: 10, fontWeight: tab === n.id ? 600 : 400 }}>{n.label}</span>
      </button>))}
    </div>
  </div>);
}
