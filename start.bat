@echo off
REM Bowly - 保齡球戰績追蹤平台 Windows 快速啟動腳本

echo.
echo ╔════════════════════════════════════════════════╗
echo ║                                                ║
echo ║      🎳 Bowly 保齡球戰績追蹤平台              ║
echo ║                                                ║
echo ║         Windows 快速啟動指南                  ║
echo ║                                                ║
echo ╚════════════════════════════════════════════════╝
echo.

REM 檢查 Node.js 是否已安裝
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 錯誤：未找到 Node.js
    echo 請先下載安裝 Node.js: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js 已檢測到
node --version
echo.

REM 檢查依賴是否已安裝
if not exist node_modules (
    echo 📦 正在安裝依賴...
    call npm install
    echo.
)

REM 啟動應用
echo 🚀 正在啟動 Bowly...
echo.
call npm start

pause
