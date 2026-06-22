-- ============================================================
-- 我的帳本 — Supabase Row Level Security (RLS) 政策
-- ============================================================
-- 用途：確保每位使用者只能存取自己的資料（user_id = auth.uid()）。
-- 使用方式：貼到 Supabase Dashboard → SQL Editor → Run。
-- 可重複執行（每條政策建立前會先 DROP，故為冪等）。
--
-- 前提：所有資料表皆有 user_id 欄位，型別需與 auth.uid()（uuid）相容。
-- 若你的 user_id 為 text，請將下方比對改為 auth.uid()::text = user_id。
-- ============================================================

-- ---------- records ----------
alter table public.records enable row level security;

drop policy if exists "records_select_own" on public.records;
create policy "records_select_own" on public.records
  for select using (auth.uid() = user_id);

drop policy if exists "records_insert_own" on public.records;
create policy "records_insert_own" on public.records
  for insert with check (auth.uid() = user_id);

drop policy if exists "records_update_own" on public.records;
create policy "records_update_own" on public.records
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "records_delete_own" on public.records;
create policy "records_delete_own" on public.records
  for delete using (auth.uid() = user_id);

-- ---------- accounts ----------
alter table public.accounts enable row level security;

drop policy if exists "accounts_select_own" on public.accounts;
create policy "accounts_select_own" on public.accounts
  for select using (auth.uid() = user_id);

drop policy if exists "accounts_insert_own" on public.accounts;
create policy "accounts_insert_own" on public.accounts
  for insert with check (auth.uid() = user_id);

drop policy if exists "accounts_update_own" on public.accounts;
create policy "accounts_update_own" on public.accounts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "accounts_delete_own" on public.accounts;
create policy "accounts_delete_own" on public.accounts
  for delete using (auth.uid() = user_id);

-- ---------- budgets ----------
alter table public.budgets enable row level security;

drop policy if exists "budgets_select_own" on public.budgets;
create policy "budgets_select_own" on public.budgets
  for select using (auth.uid() = user_id);

drop policy if exists "budgets_insert_own" on public.budgets;
create policy "budgets_insert_own" on public.budgets
  for insert with check (auth.uid() = user_id);

drop policy if exists "budgets_update_own" on public.budgets;
create policy "budgets_update_own" on public.budgets
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "budgets_delete_own" on public.budgets;
create policy "budgets_delete_own" on public.budgets
  for delete using (auth.uid() = user_id);

-- ---------- fixed_items ----------
alter table public.fixed_items enable row level security;

drop policy if exists "fixed_items_select_own" on public.fixed_items;
create policy "fixed_items_select_own" on public.fixed_items
  for select using (auth.uid() = user_id);

drop policy if exists "fixed_items_insert_own" on public.fixed_items;
create policy "fixed_items_insert_own" on public.fixed_items
  for insert with check (auth.uid() = user_id);

drop policy if exists "fixed_items_update_own" on public.fixed_items;
create policy "fixed_items_update_own" on public.fixed_items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "fixed_items_delete_own" on public.fixed_items;
create policy "fixed_items_delete_own" on public.fixed_items
  for delete using (auth.uid() = user_id);

-- ---------- share_items ----------
alter table public.share_items enable row level security;

drop policy if exists "share_items_select_own" on public.share_items;
create policy "share_items_select_own" on public.share_items
  for select using (auth.uid() = user_id);

drop policy if exists "share_items_insert_own" on public.share_items;
create policy "share_items_insert_own" on public.share_items
  for insert with check (auth.uid() = user_id);

drop policy if exists "share_items_update_own" on public.share_items;
create policy "share_items_update_own" on public.share_items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "share_items_delete_own" on public.share_items;
create policy "share_items_delete_own" on public.share_items
  for delete using (auth.uid() = user_id);

-- ============================================================
-- 驗證：執行後可用以下查詢確認 5 張表 RLS 皆已啟用
-- ============================================================
-- select tablename, rowsecurity
-- from pg_tables
-- where schemaname = 'public'
--   and tablename in ('records','accounts','budgets','fixed_items','share_items');
--
-- 查看已建立的政策：
-- select tablename, policyname, cmd
-- from pg_policies
-- where schemaname = 'public'
-- order by tablename, cmd;
-- ============================================================
