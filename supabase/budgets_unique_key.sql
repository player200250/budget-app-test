-- ============================================================
-- budgets：確保 (user_id, cat) 唯一
-- 前端 BudgetView 以 upsert(..., { onConflict: 'user_id,cat' }) 寫入，
-- 資料庫必須有對應的唯一鍵，否則 upsert 會報錯（42P10）。
-- 在 Supabase Dashboard → SQL Editor 執行，可重複執行。
-- ============================================================

-- 1. 檢查：目前 budgets 的主鍵 / 唯一鍵
select conname, contype, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.budgets'::regclass;

-- 2. 檢查：是否已有重複的 (user_id, cat)
select user_id, cat, count(*)
from public.budgets
group by user_id, cat
having count(*) > 1;

-- 3. 去除重複，每組只保留一筆（ctid 較大者，通常為最後寫入）
delete from public.budgets a
using public.budgets b
where a.user_id = b.user_id
  and a.cat = b.cat
  and a.ctid < b.ctid;

-- 4. 加上唯一鍵（已存在則略過）
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.budgets'::regclass
      and conname = 'budgets_user_id_cat_key'
  ) then
    alter table public.budgets
      add constraint budgets_user_id_cat_key unique (user_id, cat);
  end if;
end $$;
