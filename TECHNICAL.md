# 我的帳本 — 技術文件

個人記帳 PWA。前端為 **Vite + React + TypeScript**，後端使用 Supabase（Google OAuth + PostgreSQL），透過 GitHub Actions 建置並部署到 GitHub Pages。

> 使用說明與部署教學請見 [README.md](README.md)；本文聚焦於架構、資料模型與維護重點。

---

## 1. 技術架構

```
瀏覽器 (PWA)
 ├─ Vite 打包產物（dist/）
 │   ├─ index.html
 │   ├─ assets/*.js, *.css（雜湊檔名）
 │   ├─ manifest.json + icons/（來自 public/）
 │   └─ React 18 + TypeScript 應用程式
 └─ @supabase/supabase-js v2（npm 套件）
        │
        ▼
 Supabase
  ├─ Auth ── Google OAuth（redirectTo = 當前頁面網址）
  └─ PostgreSQL ── records / accounts / budgets / fixed_items / share_items
                   （以 user_id 隔離，並由 RLS 強制）
```

### 開發 / 建置流程
| 指令 | 用途 |
|---|---|
| `npm install` | 安裝依賴 |
| `npm run dev` | 本機開發伺服器（HMR） |
| `npm run build` | `tsc --noEmit` 型別檢查 + `vite build`，輸出到 `dist/` |
| `npm run preview` | 預覽建置產物 |
| `npm run typecheck` | 僅執行型別檢查 |

### 設計取捨
- **Vite + TypeScript**：取代原先單檔 + CDN + 瀏覽器端 Babel 的做法。換取模組化、型別檢查、HMR、正式 build（更快載入、無開發警告）。代價是部署需經過建置步驟（已由 CI 自動處理）。
- **base 設為 `'./'`**：見 `vite.config.ts`。GitHub Pages 專案站台位於子路徑 `/budget-app-test/`，相對路徑可確保資源正確載入，且不綁定特定 repo 名稱。
- **inline 樣式**：沿用原版 inline style + CSS 變數，未改用 CSS Modules（屬 1:1 搬移範圍外）。全域樣式與字型在 `src/index.css`。
- **金鑰**：`VITE_SUPABASE_URL` / `VITE_SUPABASE_KEY`（publishable key）可由 `.env` 提供，未提供時 `src/lib/supabase.ts` 使用內建預設值。安全性依賴 Supabase Row Level Security（RLS）。**務必為每張表啟用 RLS**（見 `supabase/rls_policies.sql`），否則 publishable key 可讀取他人資料。

### 專案結構
| 路徑 | 用途 |
|---|---|
| `index.html` | Vite 進入點（掛載 `#root` 與 `#sync-bar`，載入 `src/main.tsx`） |
| `src/main.tsx` | React 進入點 |
| `src/App.tsx` | 根元件：Auth、資料載入、版面切換、月份切換、分頁路由 |
| `src/types.ts` | 資料模型型別定義 |
| `src/index.css` | 全域樣式、CSS 變數、字型、`.sync-bar` |
| `src/lib/supabase.ts` | Supabase client |
| `src/lib/constants.ts` | `CATS` / `CC` / `CB` / `ACCT_ICONS` / 導覽列定義 |
| `src/lib/utils.ts` | `fmt` / `today` / `ym` / `csvEscape` / `isDesktop` / `showSync` |
| `src/components/*.tsx` | 各頁面與共用 UI 元件 |
| `public/manifest.json`, `public/icons/` | PWA 資源（原樣複製到 `dist/` 根目錄） |
| `vite.config.ts` / `tsconfig.json` | 建置與型別設定 |
| `.github/workflows/deploy.yml` | push 到 `main` → 建置 → 部署 GitHub Pages |
| `supabase/rls_policies.sql` | RLS 政策（手動套用到 Supabase） |

---

## 2. 資料模型（Supabase PostgreSQL）

型別定義於 `src/types.ts`。所有資料表皆含 `user_id`，前端查詢一律加上 `.eq('user_id', uid)`，並由 RLS 強制隔離。

### `records` — 交易紀錄（型別 `TxRecord`）
| 欄位 | 型別 | 說明 |
|---|---|---|
| `id` | uuid | 前端以 `crypto.randomUUID()` 產生 |
| `date` | text | `YYYY-MM-DD` |
| `type` | text | `exp`(支出) / `inc`(收入) / `xfr`(轉帳) |
| `acct_id` | uuid | 帳戶；轉帳時為轉出帳戶 |
| `acct2_id` | uuid | 僅轉帳使用，轉入帳戶 |
| `cat` | text | 分類（見 `CATS`） |
| `note` | text | 備註 |
| `payer` | text | 目前保留欄位（未使用） |
| `amount` | numeric | 原始金額（原幣別） |
| `currency` | text | `TWD`/`USD`/`JPY`/`EUR`/`CNY`/`HKD` |
| `twd` | numeric | 換算後台幣金額，所有統計皆以此為準 |

### `accounts` — 帳戶（型別 `Account`）
| 欄位 | 型別 | 說明 |
|---|---|---|
| `id` | uuid | |
| `name` | text | 帳戶名稱 |
| `type` | text | `現金`/`銀行存款`/`信用卡`/`電子支付`/`投資`（決定圖示） |
| `init` | numeric | 初始餘額 |

> 帳戶餘額不存於資料庫，而是即時由 `init` 加減所有相關 `records.twd` 計算得出。

### `budgets` — 月預算（型別 `Budgets = Record<string, number>`）
| 欄位 | 型別 | 說明 |
|---|---|---|
| `cat` | text | 支出分類 |
| `amount` | numeric | 月預算金額（TWD） |

### `fixed_items` — 固定收支（型別 `FixedItem`）
| 欄位 | 型別 | 說明 |
|---|---|---|
| `id` | uuid | |
| `name` | text | 項目名稱（如房租、薪水） |
| `type` | text | `exp`/`inc` |
| `cat` | text | 分類 |
| `amount` | numeric | 金額（TWD） |
| `currency` | text | 目前固定 `TWD` |
| `freq` | text | `monthly`/`weekly`/`yearly` |
| `next_date` | text | 下次執行日期；「套用」後自動往後推進一個週期 |

### `share_items` — 共享帳本（型別 `ShareItem`）
| 欄位 | 型別 | 說明 |
|---|---|---|
| `id` | uuid | |
| `date` | text | |
| `note` | text | |
| `amount` | numeric | 總金額 |
| `payers` | jsonb | `{ 付款人: 金額 }` |
| `members` | jsonb | 分攤成員陣列（等比分攤） |

---

## 3. 元件結構

| 檔案 | 職責 |
|---|---|
| `App.tsx` | 根元件：管理 Auth session、載入所有資料、桌機 / 手機版面切換、月份切換、分頁路由 |
| `components/LoginPage.tsx` | Google OAuth 登入畫面 |
| `components/HomeView.tsx` | 總覽：本月支出/收入/結餘/總資產/預估月底、儲蓄率、支出分類、最近記錄、近 6 個月趨勢折線圖 |
| `components/AddView.tsx` | 完整記帳表單（支出/收入/轉帳、多幣別、即時匯率換算）；預設顯示 `QuickEntry` |
| `components/QuickEntry.tsx` | 快速記帳（數字鍵盤 + 選分類即存） |
| `components/RecordsView.tsx` | 本月明細列表、刪除、CSV 匯出（含 BOM，Excel 相容） |
| `components/BudgetView.tsx` | 各分類月預算設定與使用率進度條 |
| `components/AccountsView.tsx` | 帳戶 CRUD 與即時餘額 |
| `components/FixedView.tsx` | 固定收支 CRUD、到期提醒、「套用」產生 record 並推進 `next_date` |
| `components/ShareView.tsx` | 共享支出記錄、自動結算 |
| `components/AIView.tsx` | 規則式財務分析（非真正 AI / LLM） |
| `components/ui.tsx` | 共用元件：`Card` / `Badge` / `SLabel` / `ProgBar` / `Btn` |

### 共用常數（`lib/constants.ts`）
`CATS`（分類）、`CC`/`CB`（分類文字色/背景色）、`ACCT_ICONS`、`ALL_TABS`/`MOBILE_NAV`/`MORE_TABS`（導覽列）。

### 共用工具（`lib/utils.ts`）
- `fmt(n)`：四捨五入 + 千分位
- `today()` / `ym(d)`：產生本地時區的 `YYYY-MM-DD` / `YYYY-MM`（**刻意不使用 `toISOString()` 以避免 UTC 時區位移**）
- `csvEscape(v)`：CSV 欄位逸出
- `isDesktop()`：寬度 ≥ 600px 視為桌機
- `showSync(msg, type)`：操作 `#sync-bar` 顯示頂部同步狀態提示（info/ok/err）

---

## 4. 核心邏輯重點

### 資料流
- 登入後 `App` 以 `Promise.all` 一次載入 records / accounts / budgets / fixed_items，存於 React state。
- 寫入採「樂觀更新」：先 `sb.from(table).upsert()`，成功後更新 local state；失敗則以 `showSync(..., 'err')` 提示。
- 各 View 透過 props 取得 state 與 setter，無全域狀態管理函式庫。

### 帳戶餘額計算
```
餘額 = init
     + Σ(收入 twd, acct_id = 本帳戶)
     − Σ(支出 twd, acct_id = 本帳戶)
     − Σ(轉帳 twd, acct_id  = 本帳戶)   // 轉出
     + Σ(轉帳 twd, acct2_id = 本帳戶)   // 轉入
```

### 匯率
`AddView` 載入時呼叫 `https://open.er-api.com/v6/latest/TWD`，取得各幣別對 TWD 匯率（取倒數換算）。失敗時退回內建預設值。

### 共享帳本結算（貪婪演算法）
1. 計算每人淨額：付款 `+`、分攤 `−`（總額 ÷ 分攤人數）。
2. 將債權人（正）由大到小、債務人（負）由小到大排序。
3. 雙指標貪婪配對，每次以兩者較小絕對值結清，產生最少轉帳次數的結算方案。

### AI 分析（`AIView`）
純規則式（非 LLM），依本月資料產生卡片：儲蓄率評估、最大支出分類集中度、預算超支/接近上限、月底超支預警（消費滿 5 天才預測）。

### 響應式版面
- **桌機（≥600px）**：左側 240px 固定側邊欄 + 主內容區。
- **手機**：底部固定四鍵導覽（總覽/新增/明細/更多），其餘分頁收於「更多」。

---

## 5. 部署

`.github/workflows/deploy.yml`：push 到 `main` 觸發。流程為 **build job**（checkout → setup-node → `npm ci` → `npm run build` → 上傳 `dist/` artifact）接 **deploy job**（`deploy-pages`）。需在 repo Settings → Pages 將 Source 設為「GitHub Actions」。

### 設定 Supabase（新環境）
1. 建立 Supabase 專案，啟用 Google OAuth provider，並將 GitHub Pages 網址加入 redirect 白名單。
2. 建立第 2 節的 5 張資料表（`user_id` 型別為 `uuid`）。
3. **為每張表啟用 RLS**，套用 `supabase/rls_policies.sql`（涵蓋 SELECT/INSERT/UPDATE/DELETE，條件 `auth.uid() = user_id`）。
4. 設定 `.env`（參考 `.env.example`）或直接修改 `src/lib/supabase.ts` 的預設值。

---

## 6. 已知限制與維護注意事項

- **RLS 是唯一資料防線**：前端金鑰公開，務必確認 RLS 已正確設定。
- **無離線快取 / Service Worker**：目前 PWA 僅有 manifest，無法離線使用；資料完全依賴雲端。
- **`payer` 欄位**：`records` 表保留但未實際使用。
- **AI 分析**為規則式，名稱中的「AI」非指 LLM。
- **多幣別**：僅 `records` 支援；`fixed_items` / `share_items` 固定為 TWD。
- **30 天估算**：月底支出預估以固定 30 天計算，非當月實際天數。
- **`budgets` 主鍵**：upsert 以 `(user_id, cat)` 為準，請確認資料庫已設對應的唯一鍵，否則同分類可能重複。
