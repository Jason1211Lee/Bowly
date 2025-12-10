# Bowly Firebase + Firestore 設定指南

## 1️⃣ Firebase Console 設定 (已完成)

你的 Firebase 專案已建立，配置信息如下：

```
項目名稱: Bowly
項目 ID: bowly-41ddd
Web App Config 已內建在代碼中
```

### 必須完成的步驟：

#### A. 啟用 Firestore Authentication

1. 訪問 [Firebase Console](https://console.firebase.google.com/)
2. 選擇 `bowly-41ddd` 專案
3. **左側菜單 → Authentication → 開始使用**
4. 點擊「電子郵件/密碼」
5. 啟用「電子郵件/密碼」登入方式
6. 在「Users」頁籤中，你可以看到已註冊的用戶

#### B. 建立和設定 Firestore Database

1. **左側菜單 → Firestore Database → 建立資料庫**
2. 選擇**「以測試模式開始」**（開發用）
3. 選擇地區（建議 `us-central1` 或最近的地區）
4. 建立完成

#### C. 設定 Firestore 安全規則

1. 進入 **Firestore Database → Rules**
2. **刪除現有的規則**，並替換為以下內容：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 只允許已登入的用戶存取他們自己的記錄
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

3. 點擊「發佈」

**⚠️ 重要：** 此規則只允許用戶存取自己的數據（由 uid 區隔），其他用戶無法看到。

## 2️⃣ 本地測試 (開發環境)

### 啟動應用

```bash
cd Bowly
npm install
npm start
```

應用將在 `http://localhost:3000` 啟動

### 測試功能

1. **註冊新帳號**
   - 點擊「註冊」頁籤
   - 輸入電子郵件（例如 `test@example.com`）
   - 設定密碼並確認
   - 點擊「註冊」

2. **登入**
   - 系統會自動登入
   - 導航欄顯示你的電子郵件和「登出」按鈕

3. **添加戰績**
   - 輸入日期、分數等
   - 點擊「新增紀錄」
   - **檢查 Firebase Console：** Firestore → `users` 集合 → 查看你的 UID 文件，應該能看到 `records` 陣列已更新

4. **跨裝置測試**
   - 在另一個瀏覽器或不同設備上用同一帳號登入
   - 應該會看到相同的戰績（自動同步）

## 3️⃣ 部署到 Vercel (生產環境)

### A. 推送代碼到 GitHub

代碼已推送：
```bash
git push origin main
```

### B. 在 Vercel 上部署

1. 訪問 [Vercel Dashboard](https://vercel.com/dashboard)
2. 點擊「Add New → Project」
3. 選擇「Import Git Repository」
4. 搜索並選擇 `Bowly` 倉庫
5. 點擊「Import」

### C. 設定環境變數 (Vercel)

1. 在 Vercel 項目頁面，進入 **Settings → Environment Variables**
2. 添加以下變數：

```
PORT=3000
NODE_ENV=production
ALLOWED_ORIGINS=https://your-project-name.vercel.app
```

3. 點擊「Save」

### D. 部署完成

- Vercel 會自動構建並部署
- 部署完成後，你會得到一個公開 URL（例如 `https://bowly-xxx.vercel.app`）
- **重要：** 更新 Firebase Console 中的授權域名

#### 更新 Firebase 授權域名

1. 進入 [Firebase Console](https://console.firebase.google.com/)
2. 選擇 `bowly-41ddd` 專案
3. **Project Settings → Authorization domains**
4. 添加你的 Vercel URL（例如 `bowly-xxx.vercel.app`）
5. 點擊「Save」

## 4️⃣ 常見問題排查

### Q: 登入後看不到之前的戰績？
**A:** 確認：
- 用同一帳號登入
- Firebase Console 中 Firestore 規則已正確設定
- 檢查 Firestore 是否有 `users/{uid}` 文件且包含 `records` 陣列

### Q: Firestore 報錯「Permission denied」？
**A:** 
- 檢查安全規則是否已發佈
- 確認你已登入（Firebase Auth）
- 檢查規則中的 `request.auth.uid` 是否與用戶 UID 匹配

### Q: 如何切換帳號？
**A:** 點擊導航欄的「登出」，然後用另一帳號登入或註冊

### Q: 如何重置數據？
**A:** 進入 Firebase Console，在 Firestore 中手動刪除你的 `users/{uid}` 文件

## 5️⃣ 下一步升級建議

- **備份和恢復**：保留現有的 JSON 匯出/匯入功能作為備份方式
- **離線支持**：可添加 PWA 支持，實現離線記錄功能
- **社交功能**：（未來）分享成績、對比排名等
- **高級分析**：添加更多統計圖表和趨勢分析

---

**有問題？** 檢查 `FIRESTORE_RULES.txt` 和 `README.md` 以了解更多詳情。
