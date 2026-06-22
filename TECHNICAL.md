# 我的帳本 — 技術文件

個人記帳 PWA。前端為單一 `index.html`，後端使用 Supabase（Google OAuth + PostgreSQL），透過 GitHub Actions 部署到 GitHub Pages。

> 使用說明與部署教學請見 [README.md](README.md)；本文聚焦於架構、資料模型與維護重點。

---

## 1. 技術架構

```
瀏覽器 (PWA)
 ├─ index.html ── React 18 + Babel standalone（CDN，無建置流程）
 │                直接以 <script type="text/babel"> 在瀏覽器內編譯 JSX
 ├─ manifest.json ── PWA 設定（standalone 顯示、圖示）
 └─ Supabase JS SDK v2
        │
        ▼
 Supabase
  ├─ Auth ── Google OAuth（redirectTo = 當前頁面網址）
  └─ PostgreSQL ── records / accounts / budgets / fixed_items / share_items
                   （以 user_id 隔離各使用者資料）
```

### 設計取捨
- **無建置流程**：所有依賴（React、ReactDOM、Babel、Supabase）皆從 CDN 載入，部署只需推送靜態檔。代價是首次載入需在瀏覽器端編譯 JSX，正式產品可考慮預編譯。
- **單檔應用**：全部元件、樣式、邏輯集中於 `index.html`（約 900 行）。
- **金鑰**：`SUPABASE_URL` 與 `SUPABASE_KEY`（publishable key）寫死在前端，安全性依賴 Supabase Row Level Security（RLS）。**務必在 Supabase 為每張表啟用 RLS 並以 `user_id = auth.uid()` 限制存取**，否則 publishable key 可讀取他人資料。

### 主要檔案
| 檔案 | 用途 |
|---|---|
| `index.html` | 整個前端應用（樣式 + React 元件 + 邏輯） |
| `manifest.json` | PWA manifest |
| `icons/` | 192 / 512 PWA 圖示 |
| `.github/workflows/deploy.yml` | push 到 `main` 自動部署到 GitHub Pages |
| `README.md` | 部署與使用教學 |

---

## 2. 資料模型（Supabase PostgreSQL）

所有資料表皆含 `user_id`，前端查詢一律加上 `.eq('user_id', uid)`。建議於後端以 RLS 強制隔離。

### `records` — 交易紀錄
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

### `accounts` — 帳戶
| 欄位 | 型別 | 說明 |
|---|---|---|
| `id` | uuid | |
| `name` | text | 帳戶名稱 |
| `type` | text | `現金`/`銀行存款`/`信用卡`/`電子支付`/`投資`（決定圖示） |
| `init` | numeric | 初始餘額 |

> 帳戶餘額不存於資料庫，而是即時由 `init` 加減所有相關 `records.twd` 計算得出。

### `budgets` — 月預算
| 欄位 | 型別 | 說明 |
|---|---|---|
| `cat` | text | 支出分類 |
| `amount` | numeric | 月預算金額（TWD） |

### `fixed_items` — 固定收支
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

### `share_items` — 共享帳本
| 欄位 | 型別 | 說明 |
|---|---|---|
| `id` | uuid | |
| `date` | text | |
| `note` | text | |
| `amount` | numeric | 總金額 |
| `payers` | jsonb | `{ 付款人: 金額 }` |
| `members` | jsonb | 分攤成員陣列（等比分攤） |

---

## 3. 元件結構（`index.html`）

| 元件 | 職責 |
|---|---|
| `App` | 根元件：管理 Auth session、載入所有資料、桌機 / 手機版面切換、月份切換、分頁路由 |
| `LoginPage` | Google OAuth 登入畫面 |
| `HomeView` | 總覽：本月支出/收入/結餘/總資產/預估月底、儲蓄率、支出分類、最近記錄、近 6 個月趨勢折線圖（可展開） |
| `AddView` | 完整記帳表單（支出/收入/轉帳、多幣別、即時匯率換算、分類、備註） |
| `QuickEntry` | 快速記帳（數字鍵盤 + 選分類即存），`AddView` 預設模式 |
| `RecordsView` | 本月明細列表、刪除、CSV 匯出（含 BOM，Excel 相容） |
| `BudgetView` | 各分類月預算設定與使用率進度條 |
| `AccountsView` | 帳戶 CRUD 與即時餘額 |
| `FixedView` | 固定收支 CRUD、到期提醒、「套用」產生 record 並推進 `next_date` |
| `ShareView` | 共享支出記錄、自動結算 |
| `AIView` | 規則式財務分析（非真正 AI / LLM） |
| 共用元件 | `Card` / `Badge` / `SLabel` / `ProgBar` / `Btn` |

### 共用常數
- `CATS`：支出/收入/轉帳分類清單
- `CC` / `CB`：各分類的文字色 / 背景色
- `ACCT_ICONS`：帳戶類型 → emoji
- `ALL_TABS` / `MOBILE_NAV` / `MORE_TABS`：導覽列定義

### 共用工具函式
- `fmt(n)`：四捨五入 + 千分位
- `today()` / `ym(d)`：產生本地時區的 `YYYY-MM-DD` / `YYYY-MM`（**刻意不使用 `toISOString()` 以避免 UTC 時區位移**）
- `csvEscape(v)`：CSV 欄位逸出
- `isDesktop()`：寬度 ≥ 600px 視為桌機
- `showSync(msg, type)`：頂部同步狀態提示列（info/ok/err）

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

`.github/workflows/deploy.yml`：push 到 `main` 即觸發，將整個 repo 根目錄作為 artifact 上傳並部署到 GitHub Pages（`actions/configure-pages` → `upload-pages-artifact` → `deploy-pages`）。需在 repo Settings → Pages 將 Source 設為「GitHub Actions」。

### 設定 Supabase（新環境）
1. 建立 Supabase 專案，啟用 Google OAuth provider，並將 GitHub Pages 網址加入 redirect 白名單。
2. 建立上述 5 張資料表。
3. **為每張表啟用 RLS**，policy 以 `auth.uid() = user_id` 限制 select/insert/update/delete。
4. 將 `index.html` 中的 `SUPABASE_URL` / `SUPABASE_KEY` 換成自己專案的值。

---

## 6. 已知限制與維護注意事項

- **RLS 是唯一資料防線**：前端金鑰公開，務必確認 RLS 已正確設定。
- **無離線快取 / Service Worker**：目前 PWA 僅有 manifest，無法離線使用；資料完全依賴雲端。
- **CDN 依賴**：未鎖定 React/Babel 版本快取，CDN 故障會導致無法載入。
- **Babel 在瀏覽器端編譯**：首次載入較慢，且在正式環境會顯示 Babel 的開發警告。
- **`payer` 欄位**：`records` 表保留但未實際使用。
- **AI 分析**為規則式，名稱中的「AI」非指 LLM。
- **多幣別**：僅 `records` 支援；`fixed_items` / `share_items` 固定為 TWD。
- **30 天估算**：月底支出預估以固定 30 天計算，非當月實際天數。
