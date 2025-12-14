# Bowly 開發報告

**報告內容**: 應用介紹 / 技術說明 / 製作過程 Prompt（開發對話關鍵指令）/ 心得與後續建議

---

**一、應用（Application）概述**

Bowly 是一個保齡球戰績追蹤與分析的單頁應用（SPA），支援：
- 即時輸入單場戰績（手動總分或逐格 Frame-by-Frame 輸入）
- 自動計算平均分、最高分、全倒（Strikes）與補中（Spares）統計
- 分數趨勢折線圖與全倒/補中圓餅圖（Chart.js）
- 目標平均分追蹤 + 近 5 場趨勢
- 匯出 / 匯入 JSON 備份
- 逐格輸入的虛擬鍵盤（點擊鍵盤或物理鍵盤輸入）
- 使用者認證（Firebase Authentication）與雲端同步（Firestore），可跨裝置存取個人紀錄

使用者流程簡述：
1. 註冊或登入（Email/Password）
2. 新增戰績（日期 + 總分或逐格輸入）
3. 系統會把戰績儲存在 Firestore（並同步到 localStorage）
4. 任何其他裝置登入相同帳號即可看到相同資料（實時同步）

---

**二、技術（Technology）細節**

- 前端
  - HTML5 + Bootstrap 5（響應式 UI）
  - JavaScript + jQuery（事件綁定、DOM 操作）
  - Chart.js（圖表）
  - Firebase SDK（Auth + Firestore）
  - 本地儲存：`localStorage` 作為快取與離線備援

- 後端
  - Express（`server.js`）用於靜態檔案服務與 SPA 重寫，方便本地測試或完整部署
  - Node.js 環境（`package.json` 已列出依賴）

- 資料結構（LocalStorage / Firestore）
  - Key: `bowlyRecords`（陣列）
  - 單筆紀錄範例：
    ```json
    {
      "id": "20251211-....",
      "date": "2025-12-11",
      "score": 185,
      "strikes": 8,
      "spares": 5,
      "createdAt": 1734000000000
    }
    ```

- Firestore 安全規則（已紀錄於 `FIRESTORE_RULES.txt`）
  - 只允許已登入使用者讀寫 `users/{uid}` 下的文件

---

**三、製作過程 Prompt（開發對話中使用的重要指令與需求）**

以下為開發過程中使用者（或我）向助理提出的重要 prompt、需求或決策指令，依時間與功能主題整理：

1. 倉庫分析與說明文件
   - "分析並為倉庫生成/更新 `.github/copilot-instructions.md`"

2. 開始實作 MVP 與前端功能
   - "開始開發"（建立表單、統計、Chart.js、LocalStorage）
   - "把逐格輸入改成按鍵盤式"（新增虛擬鍵盤與焦點管理）
   - "允許同日多筆紀錄"（由 `date` 唯一改為以 `id` 操作）

3. 部署選擇與配置
   - "A 靜態部署（Vercel/Netlify）"（決定靜態部署路線）
   - 新增 `vercel.json` / `netlify.toml` 與部署說明

4. 加入帳號註冊/登入（雲端同步）
   - "請你幫我改成網站有可以註冊帳號嗎 讓我可以知道之前的紀錄"
   - 選擇方案 A: 使用 Firebase（Auth + Firestore）
   - 使用者提供 Firebase Config（範例）→ 整合於 `public/firebase-config.js`

5. 逐格輸入驗證與修正
   - 使用者指出 bug："輸入分數可以輸入4 8 加起來大於10 這樣有bug"
   - 要求更嚴格的限制："如果同一格裡第一格輸入的是4 第二格幫我把6-9都去掉 變成只能輸入0 1 2 3 或/(spare)"
   - 進一步修正："第一投是4的話 只能輸入0-5跟/ 因為6就表示有解到(spare)所以就用/表示"
   - 物理鍵盤也要受限："用鍵盤輸入還是可以超過10分 在檢查的時候要加入驗證"

6. 開發測試指令
   - `npm install` / `npm start` / `git add` / `git commit` / `git push`

註：上述 prompt 與指令是本次開發流程中最具影響力的使用者需求句子，已直接驅動功能設計與代碼修改。

---

**四、製作過程（步驟與重點決策）**

1. 初始架構
   - 準備靜態 `public/` 資料夾，包含 `index.html`, `app.js`, `style.css`。
   - 建立 `server.js`（Express）方便本地測試與 SPA rewrite。

2. 前端核心功能
   - 先以 LocalStorage 為單機 MVP（添加 / 刪除 / 匯入 / 匯出 / 統計 / 圖表）
   - 增加逐格輸入 UI（10 框，第 1-9 框兩次投球，第 10 框最多三次）與虛擬數字鍵盤

3. 認證與雲端同步
   - 決定使用 Firebase：優點為快速、易整合、提供 Auth 與 Firestore
   - 新增 `public/firebase-config.js`、`public/auth.js`，在 `app.js` 中加入同步邏輯（`syncRecordsToFirestore`, `loadRecordsFromFirestore`, `setupFirestoreListener`）
   - Firestore 儲存結構：`users/{uid}` 文件包含 `records[]` 與 `target` 等欄位

4. 逐格輸入驗證迭代
   - 發現虛擬鍵盤限制不足（使用者可直接在 input 輸入非法字元或數字）
   - 新增三層防護：
     a. 鍵盤按鈕動態禁用（`updateKeypadAvailability()`）
     b. 實時 `input` 事件驗證（阻擋物理鍵盤輸入非法值）
     c. 最後在 `validateFrames()` 做最終檢查
   - 特別規則：第二投數字限制為 `0` 到 `10 - first_roll`；若需要補中應輸入 `/`

5. 測試與提交
   - 反覆在本機測試 `npm start`、手動驗證逐格輸入行為
   - 將變更分批 commit 並推送到 GitHub

---

**五、心得（Reflection）與後續建議**

心得：
一開始開發的時候，很害怕自己因為不擅長打城市所以做不出來，一直在問ChatGPT有沒有辦法可以一步一步帶我做，後來因為有參加實習，所以知道了Copilot這個東西，我這次開發大部分程式碼都是用Copilot寫的，而我主要是負責debug跟一些功能優化，像是逐格輸入跟一格的最大分數要小於十分等等，然後資料庫跟網頁的部分也是透過查資料然後一步一步建立起來的，我覺得現在網路上真的很多資源，有心的話想要弄東西一定可以弄得出來，像我網站適用vercell，資料庫適用Firebase，這兩個都可以直接連結github帳號，所把專案推到github上面就可以了，建立起來很簡單快速，透過這次自己一步一步把網站建起來，讓我覺得很有成就感，而且也收穫了很多實用的工具。

後續優化建議：
1. 單元測試和 E2E 測試（例如 Jest + Playwright）來自動化檢查逐格輸入邏輯與整體流程。
2. 加入「忘記密碼」與驗證信（Firebase 有現成 API 可用）以提升使用者體驗。
3. 強化伺服器端驗證（如果將來加入自有後端），不能只依賴前端驗證。
4. 將逐格輸入結果也保存為更豐富的資料模型（例如每一個 roll 的細節），方便後續做更細緻的統計與回放。
5. 考慮 PWA（離線與同步改善）與使用者設定版本歷史（多版本或變更歷史）

---

**六、檔案清單（新增/修改重點）**

新增：
- `public/firebase-config.js`  (Firebase 初始化)
- `public/auth.js`            (註冊/登入/登出，監聽 Auth State)
- `FIRESTORE_RULES.txt`       (建議的 Firestore 規則)
- `SETUP_GUIDE.md` / `QUICKSTART_FIREBASE.md` / `COMPLETION_SUMMARY.md` / `REPORT.md`

修改：
- `public/index.html`        (加入認證 UI、逐格輸入鍵盤 data 屬性)
- `public/app.js`            (核心邏輯：LocalStorage、Firestore 同步、鍵盤互動、輸入驗證、validateFrames)
- `public/style.css`         (禁用按鈕樣式等)

---

**七、如何查看與測試**

1. 啟動
```powershell
cd d:\Bowly
npm install
npm start
```
2. 開啟瀏覽器並前往 `http://localhost:3000`
3. 測試重點
   - 註冊 / 登入（Firebase 必須先在 Console 啟用 Email/Password）
   - 逐格輸入：第一投輸入 `4`，確認第二投按鈕 `6-9` 為禁用狀態；直接用鍵盤輸入 `6` 時被攔截
   - 匯出/匯入 JSON、圖表顯示、目標設定