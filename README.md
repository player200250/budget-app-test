# 我的帳本 — 部署到 GitHub Pages 教學

部署完成後，你會得到一個網址（如 `https://你的帳號.github.io/budget-app`），
電腦、手機、任何裝置打開瀏覽器輸入這個網址就能用。

---

## 步驟一：建立 GitHub 帳號

前往 https://github.com 註冊（免費）。

---

## 步驟二：建立新 Repository

1. 登入後點右上角「+」→「New repository」
2. Repository name 填：`budget-app`
3. 選「**Public**」（GitHub Pages 免費版需要 Public）
4. 點「Create repository」

---

## 步驟三：上傳檔案

### 方法 A：直接在網頁上傳（最簡單）

1. 進入剛建立的 repository
2. 點「uploading an existing file」
3. 把這個 ZIP 裡的所有檔案拖曳上傳
   - `index.html`
   - `manifest.json`
   - `.github/workflows/deploy.yml`（需要先建立這個資料夾路徑）
4. 點「Commit changes」

### 方法 B：用 Git 指令（需要先安裝 Git）

```bash
git init
git add .
git commit -m "初始上傳"
git branch -M main
git remote add origin https://github.com/你的帳號/budget-app.git
git push -u origin main
```

---

## 步驟四：開啟 GitHub Pages

1. 進入 repository，點上方「**Settings**」
2. 左側選「**Pages**」
3. Source 選「**GitHub Actions**」
4. 等待約 1-2 分鐘

---

## 步驟五：取得你的網址

部署完成後，Pages 頁面會顯示：

```
Your site is live at https://你的帳號.github.io/budget-app
```

把這個網址加入書籤！

---

## 手機加入主畫面

**Android Chrome：**
1. 用 Chrome 開啟網址
2. 點右上角三個點「⋮」
3. 選「新增至主畫面」

**iOS Safari：**
1. 用 Safari 開啟網址
2. 點底部分享按鈕「⬆」
3. 選「加入主畫面」

---

## 注意事項

- 資料存在各裝置的瀏覽器本地，電腦和手機是分開的
- 用 App 裡的「備份同步」頁面可以匯出/匯入 JSON 手動同步
- 想要真正跨裝置即時同步，需要接上 PostgreSQL 資料庫

---

有問題回到 Claude 對話說明，我可以繼續幫你！
