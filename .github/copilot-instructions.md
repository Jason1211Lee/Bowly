# Bowly 開發指南

**Bowly** 是一個保齡球戰績追蹤平台，幫助使用者記錄和分析保齡球成績。支援即時統計、數據可視化、目標追蹤及跨裝置同步。

## 項目架構

```
Bowly/
├── public/                      # 前端應用文件（靜態資源）
│   ├── index.html              # 主頁面
│   ├── app.js                  # 前端邏輯
│   └── style.css               # 樣式文件
├── server.js                   # Express 伺服器（生產環境）
├── package.json                # NPM 依賴與啟動腳本
├── .env                        # 環境配置（本地開發）
├── .env.example                # 環境配置模板
├── start.bat                   # Windows 快速啟動腳本
├── start.sh                    # macOS/Linux 快速啟動腳本
├── QUICKSTART.md               # 快速啟動指南
├── README.md                   # 完整文檔與部署指南
├── .github/
│   └── copilot-instructions.md # 本文件
└── .gitignore
```

**技術棧**：

**前端**（客戶端）：
- HTML5 + CSS3 + Bootstrap（RWD 結構）
- JavaScript + jQuery：表單驗證、事件綁定、數據處理
- Chart.js（CDN）：折線圖、甜甜圈圖
- LocalStorage：本地存儲記錄（JSON 格式）

**後端**（Express 伺服器）：
- Node.js + Express：靜態文件服務、CORS、API
- compression：Gzip 壓縮
- cors：跨域資源共享
- dotenv：環境變數管理

**部署**（可選升級）：
- Vercel / Heroku：無伺服器部署
- Firebase Realtime Database：雲端儲存、跨裝置同步
- Firebase Authentication：用戶認證

## 核心功能規範

### 1. 戰績輸入（表單區）
- **必填欄位**：日期、總分（0-300）、全倒 Strikes（0-12）、補中 Spares（0-21）
- **驗證邏輯**：同日期不可重複輸入、分數範圍檢驗
- **去重機制**：若輸入日期已存在，提示覆蓋或新增版本

### 2. 即時統計計算（統計區）
- **平均分數**：所有場次的平均值
- **最高分**：最佳單場成績（Personal Best）
- **總場次**：完整戰績筆數
- **近 5 場趨勢**：最近 5 局的分數序列
- **目標差距**：設定目標平均分（如 170），實時顯示 `當前平均 - 目標`

### 3. 數據可視化（圖表區）
- **分數趨勢折線圖**：X 軸為日期/場次序號，Y 軸為分數，視覺追蹤進度
- **全倒/補中分佈圖**：
  - 餅圖：全倒、補中、其他的佔比
  - 或長條圖：每場全倒數、補中數（如有多場）

### 4. 目標追蹤
- 允許用戶設定目標平均分（例如 170）
- 即時展示與目標的差距（需要多少分才能達成）
- 歷史目標變更（可選）

### 5. 簡易管理功能
- **刪除單筆**：點擊特定戰績可刪除
- **清空全部**：警告確認後清除所有數據
- **導出 JSON**：下載本地備份文件
- **導入 JSON**：恢復或移轉數據至新裝置

### 6. 選配功能
- **AI 小建議**：根據最近 3-5 場成績生成 1 段訓練建議或鼓勵語
  - 若最近成績下滑：「最近幾場表現下降，建議加強基本動作練習」
  - 若進步中：「保持進度！再加油就能達成目標」

### 7. 響應式設計（RWD）
- **手機**：快速輸入表單、豎向排版統計、圖表折疊展開
- **平板/桌機**：雙欄佈局（左表單/管理，右統計/圖表）

## 開發優先級與工作流

**MVP 階段**（第 1-4 週）：
1. ✅ 搭建 HTML 結構 + Bootstrap 響應式框架
2. ✅ 實現 LocalStorage 數據管理（增刪查改）
3. ✅ 表單驗證 + 去重邏輯
4. ✅ 統計計算函數（平均、最高、場次、差距）
5. ✅ Chart.js 折線圖 + 甜甜圈圖整合
6. ✅ 基礎 CSS 樣式 + 行動版適配
7. ✅ Express 伺服器整合 + 一鍵啟動

**啟動應用**：
- Windows：雙擊 `start.bat`
- macOS/Linux：執行 `./start.sh` 或 `npm start`
- 訪問 `http://localhost:3000`

**進階階段**（可選）：
8. 導出/導入 JSON 功能 ✅
9. AI 建議模塊（可使用 OpenAI API 或預設樣板） ✅
10. Firebase 遷移（雲端同步）
11. 線上部署（Vercel / Heroku）

## 核心約定與模式

### 數據結構
```javascript
// LocalStorage 鍵：'bowlyRecords' (JSON 字符串)
[
  {
    id: 'YYYYMMDD-HHmmss',  // 唯一識別符
    date: '2025-12-10',       // ISO 格式日期
    score: 185,               // 0-300
    strikes: 8,               // 全倒數
    spares: 5,                // 補中數
    createdAt: 1734000000000  // 時間戳
  }
]
```

### 事件綁定原則
- 使用 jQuery 委託事件：`$(document).on('click', '.delete-btn', ...)`
- 提交表單後：驗證 → 去重檢查 → localStorage 更新 → 刷新統計 + 圖表 → UI 反饋

### 圖表初始化
- 在 `app.js` 中定義全局圖表實例：`window.trendChart`、`window.statsChart`
- 更新數據時調用 `.data.datasets[0].data = [...]` + `.update()`
- 參考 [Chart.js 文檔](https://www.chartjs.org/docs/latest/charts/line.html)

### 國際化
- 所有 UI 文本使用繁體中文（zh-Hant）
- 日期格式：YYYY-MM-DD（ISO 標準）
- 數字無需本地化

## 常見開發任務

**添加新統計指標**：
1. 在 `app.js` 中新增計算函數，例如 `calculateMedianScore(records)`
2. 在 HTML 中新增展示元素，例如 `<span id="medianScore">--</span>`
3. 在更新函數中呼叫：`$('#medianScore').text(calculateMedianScore(records))`

**修改圖表樣式**：
- 編輯 Chart.js 初始化配置中的 `options.plugins.legend.display`、`options.scales` 等
- 使用 Bootstrap 的色系變數（`--bs-primary`、`--bs-success` 等）

**調試 localStorage**：
```javascript
// 瀏覽器控制台
localStorage.getItem('bowlyRecords')  // 檢視原始數據
JSON.parse(localStorage.getItem('bowlyRecords'))  // 格式化檢視
```

## 可選升級路線

- **Firebase**：當用戶數增多時，遷移至實時數據庫 + 用戶認證
- **PWA**：離線功能、安裝至主屏
- **後端 API**：若需複雜計算或第三方集成（如 AI 服務）
