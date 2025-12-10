const express = require('express');
const compression = require('compression');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

// ==========================================
// 中間件設定
// ==========================================

// 壓縮回應
app.use(compression());

// CORS 設定（允許跨域請求）
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));

// 靜態文件服務（提供前端文件）
app.use(express.static(path.join(__dirname, 'public')));

// JSON 解析
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================================
// API 路由
// ==========================================

// 健康檢查
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 根路由 - 提供首頁
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 處理 - 將所有其他路由導向 index.html（SPA 支持）
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==========================================
// 錯誤處理
// ==========================================

app.use((err, req, res, next) => {
  console.error('❌ 錯誤:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    status: err.status || 500
  });
});

// ==========================================
// 啟動服務器
// ==========================================

app.listen(PORT, HOST, () => {
  console.log(`
╔════════════════════════════════════════════════╗
║                                                ║
║      🎳 Bowly 保齡球戰績追蹤平台 v1.0.0      ║
║                                                ║
║  ✅ 伺服器已啟動                              ║
║  🌐 訪問地址: http://${HOST}:${PORT}                   ║
║                                                ║
║  📊 API 健康檢查: http://${HOST}:${PORT}/api/health   ║
║  🎯 按 Ctrl+C 停止服務器                      ║
║                                                ║
╚════════════════════════════════════════════════╝
  `);
});

// 優雅關閉
process.on('SIGINT', () => {
  console.log('\n👋 伺服器正在關閉...');
  process.exit(0);
});

module.exports = app;
