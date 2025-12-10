# Bowly 認證功能 - 快速啟動

## 🎯 新增功能

你的 Bowly 應用現在支持：
- ✅ **使用者帳號註冊/登入**（Firebase Authentication）
- ✅ **雲端戰績同步**（Firestore）
- ✅ **跨裝置自動同步**（登入同一帳號即可）

## 🚀 快速開始（本地測試）

### 1. 啟動應用
```bash
cd Bowly
npm install  # 如果尚未安裝依賴
npm start
```

應用將在 **http://localhost:3000** 啟動

### 2. 首次使用
- **選擇「註冊」**頁籤
- 輸入電子郵件和密碼
- 點擊「註冊」
- 系統會自動登入

### 3. 測試 Firestore 同步
- 添加一筆戰績
- 打開 [Firebase Console](https://console.firebase.google.com/)
- 進入 `bowly-41ddd` → **Firestore Database**
- 查看 `users` 集合 → 你的 UID 文件
- 應該能看到 `records` 陣列已自動更新 ✨

### 4. 跨裝置測試
- 在另一個瀏覽器（無痕模式或不同瀏覽器）用同一帳號登入
- 應該會看到相同的戰績

## 📋 必須在 Firebase Console 完成的設定

### A. 啟用 Authentication

1. 進入 [Firebase Console](https://console.firebase.google.com/)
2. 選擇 `bowly-41ddd` 專案
3. **Authentication → Sign-in method → Email/Password**
4. 啟用「電子郵件/密碼」

### B. 建立 Firestore Database

1. **Firestore Database → 建立資料庫**
2. 選擇「以測試模式開始」
3. 選擇地區（推薦 `us-central1`）

### C. 設定 Firestore 安全規則

1. **Firestore Database → Rules**
2. 複製以下規則並貼上：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

3. 點擊「發佈」

## 🌐 部署到 Vercel

### 1. 確保代碼已推送到 GitHub
```bash
git push origin main
```

### 2. 連接 Vercel
- 訪問 https://vercel.com
- 登入並點擊「Add New Project」
- 導入 `Bowly` 倉庫
- Vercel 會自動構建和部署

### 3. 更新 Firebase 授權域名
- 進入 [Firebase Console](https://console.firebase.google.com/)
- **Project Settings → Authorization domains**
- 添加你的 Vercel URL（例如 `bowly-abc123.vercel.app`）

### 4. 完成！
你的應用現在可在：`https://bowly-abc123.vercel.app` 訪問

## 📚 文件結構

新增的認證相關檔案：

```
public/
├── firebase-config.js      # Firebase 初始化設定
├── auth.js                 # 認證邏輯（登入/註冊/登出）
├── app.js                  # 主應用邏輯（已更新支援 Firestore）
└── index.html              # 前端 UI（已更新認證頁面）

FIRESTORE_RULES.txt         # Firestore 安全規則
SETUP_GUIDE.md              # 詳細設定指南
```

## 🆘 常見問題

### Q: 登入後看不到之前的戰績？
**A:** 確認用同一帳號登入。首次使用時，Firestore 會自動建立你的用戶記錄。

### Q: Firestore 報錯？
**A:** 
1. 確保 Firestore Database 已建立
2. 檢查安全規則是否已發佈
3. 確認你已在 Firebase Authentication 中啟用「電子郵件/密碼」

### Q: 如何清除所有數據？
**A:** 
- 本地：點擊「清空全部」按鈕
- Firestore：在 Firebase Console 中手動刪除你的 `users/{uid}` 文件

### Q: 忘記密碼怎麼辦？
**A:** 在本地測試時，進入 Firebase Console → Authentication → Users，刪除該用戶，然後重新註冊。部署後可添加「忘記密碼」功能。

## 📞 需要幫助？

查看：
- `README.md` - 完整文檔
- `SETUP_GUIDE.md` - 詳細設定指南
- `FIRESTORE_RULES.txt` - 安全規則

---

**恭喜！🎉 Bowly 現已支援帳號同步功能！**
