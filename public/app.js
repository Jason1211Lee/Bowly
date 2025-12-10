// ==========================================
// Bowly 應用核心邏輯（支援 Firestore 同步）
// ==========================================

import { auth, db } from "./firebase-config.js";
import { currentUser, showGameView } from "./auth.js";
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// 常數
const STORAGE_KEY = 'bowlyRecords';
const TARGET_KEY = 'bowlyTarget';

// 初始化 - 從 localStorage 讀取數據（備用）
let records = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let targetScore = parseFloat(localStorage.getItem(TARGET_KEY)) || 170;

// 全局圖表實例
let trendChart = null;
let statsChart = null;

// Firestore 監聽器參考
let firestoreUnsubscribe = null;

// ==========================================
// 數據管理函式
// ==========================================

/**
 * 添加新紀錄到 records 並保存到 localStorage + Firestore
 * @param {Object} record - 包含 date, score, strikes, spares
 * @returns {boolean} - 是否成功添加
 */
function addGame(record) {
  // 新增紀錄（允許同日多筆）
  record.id = generateId();
  record.createdAt = Date.now();
  records.push(record);
  
  // 按日期排序
  records.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // 保存到 localStorage
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  
  // 同步到 Firestore（若已登入）
  if (currentUser) {
    syncRecordsToFirestore();
  }
  
  return true;
}

/**
 * 刪除指定日期的紀錄
 * @param {string} date - ISO 格式日期或 ID
 */
function removeGame(date) {
  // 保留向後相容性：若傳入的是 id（優先），否則視為 date 並刪除所有該日期
  if (!date) return;
  const isId = typeof date === 'string' && records.some(r => r.id === date);
  if (isId) {
    records = records.filter(r => r.id !== date);
  } else {
    // date 非 id，當作日期字串，刪除同日所有紀錄（舊行為）
    records = records.filter(r => r.date !== date);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  
  // 同步到 Firestore（若已登入）
  if (currentUser) {
    syncRecordsToFirestore();
  }
}

/**
 * 清空所有紀錄
 */
function clearAllRecords() {
  if (confirm('確定要清空所有紀錄嗎？此操作無法撤銷。')) {
    records = [];
    localStorage.removeItem(STORAGE_KEY);
    
    // 同步到 Firestore（若已登入）
    if (currentUser) {
      syncRecordsToFirestore();
    }
  }
}

/**
 * 生成唯一識別符
 * @returns {string}
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ==========================================
// Firestore 同步函數
// ==========================================

/**
 * 將記錄同步到 Firestore
 */
async function syncRecordsToFirestore() {
  if (!currentUser) return;
  
  try {
    const userDocRef = doc(db, "users", currentUser.uid);
    await updateDoc(userDocRef, {
      records: records,
      target: targetScore,
      lastUpdated: new Date().toISOString()
    });
    console.log('✅ Firestore 同步完成');
  } catch (error) {
    console.error('❌ Firestore 同步失敗:', error);
  }
}

/**
 * 從 Firestore 載入使用者的記錄
 */
async function loadRecordsFromFirestore() {
  if (!currentUser) return;
  
  try {
    const userDocRef = doc(db, "users", currentUser.uid);
    const docSnap = await getDoc(userDocRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      records = data.records || [];
      targetScore = data.target || 170;
      
      // 更新 localStorage 為 Firestore 的資料
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      localStorage.setItem(TARGET_KEY, targetScore);
      
      console.log('✅ Firestore 資料已載入');
      refreshUI();
    } else {
      console.log('⚠️ Firestore 中無使用者資料');
    }
  } catch (error) {
    console.error('❌ Firestore 載入失敗:', error);
  }
}

/**
 * 設定 Firestore 即時監聽（當資料改變時自動更新本地）
 */
function setupFirestoreListener() {
  if (!currentUser || firestoreUnsubscribe) return;
  
  try {
    const userDocRef = doc(db, "users", currentUser.uid);
    firestoreUnsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        records = data.records || [];
        targetScore = data.target || 170;
        
        // 更新 localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
        localStorage.setItem(TARGET_KEY, targetScore);
        
        console.log('📡 Firestore 資料已更新（來自其他裝置）');
        refreshUI();
      }
    });
    console.log('✅ Firestore 監聽已開始');
  } catch (error) {
    console.error('❌ Firestore 監聽設定失敗:', error);
  }
}

/**
 * 停止 Firestore 監聽
 */
function stopFirestoreListener() {
  if (firestoreUnsubscribe) {
    firestoreUnsubscribe();
    firestoreUnsubscribe = null;
    console.log('✅ Firestore 監聽已停止');
  }
}

// ==========================================
// 統計計算函式
// ==========================================

/**
 * 計算平均分
 * @returns {number}
 */
function calculateAvgScore() {
  if (records.length === 0) return 0;
  const sum = records.reduce((acc, r) => acc + r.score, 0);
  return (sum / records.length).toFixed(2);
}

/**
 * 計算最高分
 * @returns {number}
 */
function calculateMaxScore() {
  if (records.length === 0) return 0;
  return Math.max(...records.map(r => r.score));
}

/**
 * 計算與目標的差距
 * @returns {string}
 */
function calculateTargetGap() {
  const avg = parseFloat(calculateAvgScore());
  const gap = targetScore - avg;
  if (gap > 0) {
    return `+${gap.toFixed(2)}`;
  } else if (gap < 0) {
    return gap.toFixed(2); // 已超越目標
  } else {
    return '0.00'; // 達成目標
  }
}

/**
 * 取得近 5 場成績
 * @returns {Array}
 */
function getRecentScores() {
  return records.slice(-5).map(r => r.score);
}

/**
 * 計算全倒和補中的總計
 * @returns {Object} - { totalStrikes, totalSpares }
 */
function calculateStrikesAndSpares() {
  let totalStrikes = 0, totalSpares = 0;
  records.forEach(r => {
    totalStrikes += r.strikes || 0;
    totalSpares += r.spares || 0;
  });
  return { totalStrikes, totalSpares };
}

/**
 * 生成 AI 訓練建議
 * @returns {string}
 */
function generateAISuggestion() {
  if (records.length < 3) {
    return '累積 3 場以上成績後會有建議';
  }

  const recentScores = getRecentScores().reverse(); // 按時間順序
  const avgScore = parseFloat(calculateAvgScore());
  
  // 計算最近 3-5 場的趨勢
  const recentGames = records.slice(-5).map(r => r.score);
  let suggestion = '';

  if (recentGames.length >= 3) {
    const lastThree = recentGames.slice(-3);
    const avgLastThree = lastThree.reduce((a, b) => a + b) / lastThree.length;
    const overallAvg = avgScore;

    if (avgLastThree < overallAvg - 10) {
      suggestion = '📉 最近幾場表現下降，建議加強基本動作練習和穩定性訓練。';
    } else if (avgLastThree > overallAvg + 5) {
      suggestion = '📈 保持進度！你的表現在進步中，再加油就能達成目標！';
    } else {
      suggestion = '🎯 表現穩定，持續練習就能突破目標。每場都很重要！';
    }
  }

  return suggestion;
}

// ==========================================
// UI 更新函式
// ==========================================

/**
 * 更新統計數字
 */
function renderStats() {
  $('#avgScore').text(calculateAvgScore());
  $('#maxScore').text(records.length > 0 ? calculateMaxScore() : '--');
  $('#totalGames').text(records.length);
  $('#targetGap').text(calculateTargetGap());
  
  // 近 5 場
  const recent = getRecentScores();
  if (recent.length > 0) {
    $('#recentScores').text(recent.join(', '));
  } else {
    $('#recentScores').text('暫無紀錄');
  }

  // AI 建議
  $('#aiSuggestion').text(generateAISuggestion());
}

/**
 * 初始化並更新圖表
 */
function renderCharts() {
  // 趨勢折線圖
  const trendCtx = document.getElementById('trendChart');
  if (!trendCtx) return;

  const labels = records.map(r => r.date);
  const data = records.map(r => r.score);

  if (trendChart) {
    trendChart.data.labels = labels;
    trendChart.data.datasets[0].data = data;
    trendChart.update();
  } else {
    trendChart = new Chart(trendCtx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: '分數趨勢',
            data: data,
            borderColor: '#0d6efd',
            backgroundColor: 'rgba(13, 110, 253, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 6,
            pointHoverRadius: 8
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: true,
            labels: {
              font: { size: 12 }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 300,
            title: { display: true, text: '分數' }
          }
        }
      }
    });
  }

  // 全倒/補中分佈圖
  const statsCtx = document.getElementById('statsChart');
  if (!statsCtx) return;

  const { totalStrikes, totalSpares } = calculateStrikesAndSpares();
  const other = records.length - totalStrikes - totalSpares;

  if (statsChart) {
    statsChart.data.datasets[0].data = [totalStrikes, totalSpares, Math.max(0, other)];
    statsChart.update();
  } else {
    statsChart = new Chart(statsCtx, {
      type: 'doughnut',
      data: {
        labels: ['全倒 (Strikes)', '補中 (Spares)', '其他'],
        datasets: [
          {
            data: [totalStrikes, totalSpares, Math.max(0, other)],
            backgroundColor: ['#0dcaf0', '#ffc107', '#6c757d'],
            borderColor: ['#fff', '#fff', '#fff'],
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: { size: 12 }
            }
          }
        }
      }
    });
  }
}

/**
 * 渲染完整紀錄列表
 */
function renderRecordsList() {
  const listContainer = $('#recordsList');
  if (records.length === 0) {
    listContainer.html('<p class="text-muted">暫無紀錄</p>');
    return;
  }
  const listHtml = records.map((record, idx) => {
    const created = record.createdAt ? new Date(record.createdAt).toLocaleString() : '';
    return `
    <div class="card mb-2">
      <div class="card-body d-flex justify-content-between align-items-center">
        <div>
          <strong>${record.date}</strong> <small class="text-muted">${created}</small><br>
          <small class="text-muted">分數: ${record.score} | 全倒: ${record.strikes} | 補中: ${record.spares}</small>
        </div>
        <div>
          <button type="button" class="btn btn-sm btn-outline-secondary me-2" data-id="${record.id}" data-action="view">查看</button>
          <button type="button" class="btn btn-sm btn-danger delete-btn" data-id="${record.id}">刪除</button>
        </div>
      </div>
    </div>
  `;
  }).join('');

  listContainer.html(listHtml);
}

/**
 * 刷新整個 UI
 */
function refreshUI() {
  renderStats();
  renderCharts();
  renderRecordsList();
}

// ==========================================
// 事件綁定
// ==========================================

$(document).ready(function() {
  // 監聽認證狀態變化（當用戶登入時）
  let authInitialized = false;
  const checkAuth = setInterval(() => {
    if (currentUser && !authInitialized) {
      authInitialized = true;
      clearInterval(checkAuth);
      
      console.log('✅ 用戶已登入，準備載入 Firestore 資料');
      setTimeout(() => {
        loadRecordsFromFirestore();
        setupFirestoreListener();
        $('#navAuth').show();
      }, 500);
    }
  }, 100);
  // 表單提交
  $('#gameForm').on('submit', function(e) {
    e.preventDefault();

    const date = $('#gameDate').val();
    const score = parseInt($('#gameScore').val());
    const strikes = parseInt($('#gameStrikes').val()) || 0;
    const spares = parseInt($('#gameSpares').val()) || 0;

    // 驗證
    if (!date || !score) {
      alert('請填入日期和總分');
      return;
    }

    if (score < 0 || score > 300) {
      alert('分數範圍必須在 0-300 之間');
      return;
    }

    if (strikes < 0 || strikes > 12 || spares < 0 || spares > 21) {
      alert('全倒數必須在 0-12，補中數必須在 0-21');
      return;
    }

    // 添加紀錄
    if (addGame({ date, score, strikes, spares })) {
      $('#gameForm')[0].reset();
      $('#gameDate').focus();
      refreshUI();
      alert('紀錄已保存');
    }
  });

  // 保存目標
  $('#saveTargetBtn').on('click', function() {
    const target = parseFloat($('#targetScore').val());
    if (target < 0 || target > 300) {
      alert('目標分數必須在 0-300 之間');
      return;
    }
    targetScore = target;
    localStorage.setItem(TARGET_KEY, target);
    refreshUI();
    alert('目標已保存');
  });

  // 刪除單筆紀錄
  $(document).on('click', '.delete-btn', function() {
    const id = $(this).data('id');
    const record = records.find(r => r.id === id);
    const label = record ? `${record.date} ${record.createdAt ? new Date(record.createdAt).toLocaleString() : ''}` : id;
    if (confirm(`確定要刪除 ${label} 的紀錄嗎？`)) {
      removeGame(id);
      refreshUI();
    }
  });

  // 清空全部
  $('#clearAllBtn').on('click', function() {
    clearAllRecords();
    refreshUI();
  });

  // 匯出 JSON
  $('#exportBtn').on('click', function() {
    const dataToExport = {
      records: records,
      target: targetScore,
      exportDate: new Date().toISOString()
    };
    const dataStr = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bowly-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  });

  // 匯入 JSON
  $('#importBtn').on('click', function() {
    $('#importFile').click();
  });

  $('#importFile').on('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
      try {
        const data = JSON.parse(event.target.result);
        if (data.records && Array.isArray(data.records)) {
          records = data.records;
          targetScore = data.target || 170;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
          localStorage.setItem(TARGET_KEY, targetScore);
          $('#targetScore').val(targetScore);
          refreshUI();
          alert('數據已成功匯入');
        } else {
          alert('檔案格式錯誤');
        }
      } catch (err) {
        alert('匯入失敗：' + err.message);
      }
    };
    reader.readAsText(file);
  });

  // 初始化頁面
  $('#targetScore').val(targetScore);
  refreshUI();
});

// ==========================================
// 逐格輸入處理（Frame-based input）
// ==========================================

// 打開逐格輸入區
$(document).on('click', '#openFramesBtn', function() {
  $('#framesInput').toggle();
});

// 關閉逐格輸入
$(document).on('click', '#closeFramesBtn', function() {
  $('#framesInput').hide();
});

// 清空格子
$(document).on('click', '#clearFramesBtn', function() {
  $('.frame-input').val('');
  $('#gameScore').val('');
  $('#gameStrikes').val(0);
  $('#gameSpares').val(0);
});

// 計算並填入分數（從逐格輸入）
$(document).on('click', '#calcFramesBtn', function() {
  const frames = collectFramesFromUI();
  const validation = validateFrames(frames);
  if (!validation.ok) {
    alert('輸入錯誤：' + validation.message);
    return;
  }

  const result = calculateScoreFromFrames(frames);
  // 填入表單欄位
  $('#gameScore').val(result.total);
  $('#gameStrikes').val(result.strikes);
  $('#gameSpares').val(result.spares);
  // 更新顯示（但不提交）
  alert(`計算完成：總分 ${result.total}，全倒 ${result.strikes}，補中 ${result.spares}`);
});

/**
 * 從 UI 收集 frames 資料，返回 frames: Array[10] of Array rolls (strings)
 */
function collectFramesFromUI() {
  const frames = [];
  for (let f = 1; f <= 10; f++) {
    const rolls = [];
    const maxRolls = f === 10 ? 3 : 2;
    for (let r = 0; r < maxRolls; r++) {
      const val = $(`.frame-input[data-frame='${f}'][data-roll='${r}']`).val();
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        rolls.push(String(val).trim());
      }
    }
    frames.push(rolls);
  }
  return frames;
}

/**
 * 驗證 frames 是否合理（基礎驗證）
 */
function validateFrames(frames) {
  // frames 必須為 10 個
  if (!Array.isArray(frames) || frames.length !== 10) return { ok: false, message: 'frames 必須包含 10 格' };
  for (let i = 0; i < 9; i++) {
    const r = frames[i];
    if (r.length === 0) continue; // 允許空（表示不使用逐格輸入）
    if (r.length > 2) return { ok: false, message: `第 ${i+1} 格最多兩次投球` };
    // 如果第一投是 X，第二投應為空
    if (/^x$/i.test(r[0]) && r.length > 1) return { ok: false, message: `第 ${i+1} 格若為 X，請只輸入一次` };
    // 驗證字符
    for (let j = 0; j < r.length; j++) {
      if (!/^[0-9Xx\/]$/.test(r[j])) return { ok: false, message: `第 ${i+1} 格第 ${j+1} 投輸入不合法 (${r[j]})` };
    }
    // 若第二投為 /，則第一投必須為數字
    if (r.length === 2 && r[1] === '/') {
      if (!/^[0-9]$/.test(r[0])) return { ok: false, message: `第 ${i+1} 格第二投為 / 時，第一投須為數字` };
    }
  }
  // 第十格：最多 3 個輸入，內容限制
  const last = frames[9];
  if (last.length > 3) return { ok: false, message: '第10格最多三次投球' };
  for (let j = 0; j < last.length; j++) {
    if (!/^[0-9Xx\/]$/.test(last[j])) return { ok: false, message: `第10格第 ${j+1} 投輸入不合法 (${last[j]})` };
  }
  return { ok: true };
}

/**
 * 將 frames 轉換為 rolls（數字），並計算總分
 * frames: Array[10] of Array of strings
 * 回傳 { total, strikes, spares }
 */
function calculateScoreFromFrames(frames) {
  const rolls = [];
  // 1-9
  for (let i = 0; i < 9; i++) {
    const f = frames[i];
    if (f.length === 0) continue;
    const a = f[0];
    if (/^x$/i.test(a)) {
      rolls.push(10);
    } else {
      const first = /^[0-9]$/.test(a) ? parseInt(a, 10) : 0;
      if (f.length > 1) {
        const b = f[1];
        if (b === '/') {
          rolls.push(first);
          rolls.push(10 - first);
        } else if (/^[0-9]$/.test(b)) {
          rolls.push(first);
          rolls.push(parseInt(b, 10));
        } else {
          // invalid char - treat as 0
          rolls.push(first);
          rolls.push(0);
        }
      } else {
        // only one entry (e.g., first roll only)
        rolls.push(first);
      }
    }
  }
  // 第10格
  const last = frames[9];
  for (let k = 0; k < last.length; k++) {
    const v = last[k];
    if (/^x$/i.test(v)) {
      rolls.push(10);
    } else if (v === '/') {
      const prev = rolls.length > 0 ? rolls[rolls.length -1] : 0;
      rolls.push(10 - prev);
    } else if (/^[0-9]$/.test(v)) {
      rolls.push(parseInt(v,10));
    } else {
      rolls.push(0);
    }
  }

  // 計算總分
  let total = 0;
  let rollIndex = 0;
  let strikesCount = 0;
  let sparesCount = 0;
  for (let frame = 0; frame < 10; frame++) {
    const r1 = rolls[rollIndex] !== undefined ? rolls[rollIndex] : 0;
    const r2 = rolls[rollIndex + 1] !== undefined ? rolls[rollIndex + 1] : 0;
    if (r1 === 10) {
      // strike
      const bonus1 = rolls[rollIndex + 1] !== undefined ? rolls[rollIndex + 1] : 0;
      const bonus2 = rolls[rollIndex + 2] !== undefined ? rolls[rollIndex + 2] : 0;
      total += 10 + bonus1 + bonus2;
      rollIndex += 1;
      strikesCount++;
    } else if (r1 + r2 === 10) {
      // spare
      const bonus = rolls[rollIndex + 2] !== undefined ? rolls[rollIndex + 2] : 0;
      total += 10 + bonus;
      rollIndex += 2;
      sparesCount++;
    } else {
      total += r1 + r2;
      rollIndex += 2;
    }
  }

  return { total, strikes: strikesCount, spares: sparesCount };
}

// ==========================================
// 鍵盤互動：將鍵盤輸入傳遞到被選中的格子
// ==========================================

let activeInput = null; // jQuery element

// 點擊格子時，設定 activeInput（改為 readonly，所以仍可被點選）
$(document).on('click', '.frame-input', function(e) {
  $('.frame-input').removeClass('active');
  $(this).addClass('active');
  activeInput = $(this);
});

// 鍵盤按鍵事件
$(document).on('click', '.keypad-key', function() {
  const key = $(this).text().trim();
  if (!activeInput) {
    alert('請先選擇要輸入的格子');
    return;
  }
  handleKeypadInput(key);
});

// 刪除鍵
$(document).on('click', '#keyDel', function() {
  if (!activeInput) return;
  activeInput.val('');
  activeInput.removeClass('active');
  activeInput.focus();
});

// 下一個按鍵（移到下一個可輸入的格子）
$(document).on('click', '#keyNext', function() {
  if (!activeInput) return;
  moveToNextInput(activeInput);
});

// 處理鍵盤輸入的核心邏輯
function handleKeypadInput(key) {
  // Standardize X and /
  if (key === 'x' || key === 'X') key = 'X';
  if (key === '/') key = '/';

  // only allow valid chars
  if (!/^[0-9X\/]$/.test(key)) return;

  // set value
  activeInput.val(key);

  // 自動移位邏輯
  autoAdvanceAfterInput(activeInput, key);
}

function autoAdvanceAfterInput($input, key) {
  const frame = parseInt($input.data('frame'), 10);
  const roll = parseInt($input.data('roll'), 10);

  // 若為 1-9 框，且輸入 X（strike）時，移到下一格第一投
  if (frame < 10) {
    if (key === 'X') {
      // find next frame first roll
      const next = $(`.frame-input[data-frame='${frame+1}'][data-roll='0']`);
      if (next.length) {
        $('.frame-input').removeClass('active');
        next.addClass('active');
        activeInput = next;
      }
      return;
    }

    // 如果是在第一投且輸入數字，移到同格第二投
    if (roll === 0 && /^[0-9]$/.test(key)) {
      const second = $(`.frame-input[data-frame='${frame}'][data-roll='1']`);
      if (second.length) {
        $('.frame-input').removeClass('active');
        second.addClass('active');
        activeInput = second;
      }
      return;
    }

    // 如果是在第二投，輸入後移到下一格第一投
    if (roll === 1) {
      const next = $(`.frame-input[data-frame='${frame+1}'][data-roll='0']`);
      if (next.length) {
        $('.frame-input').removeClass('active');
        next.addClass('active');
        activeInput = next;
      }
      return;
    }
  } else {
    // 第10格特殊處理：若還有未填的下一投，移到下一個
    const maxRolls = 3;
    for (let r = roll + 1; r < maxRolls; r++) {
      const next = $(`.frame-input[data-frame='10'][data-roll='${r}']`);
      if (next.length && next.val() === '') {
        $('.frame-input').removeClass('active');
        next.addClass('active');
        activeInput = next;
        return;
      }
    }
    // 否則不移動
  }
}

function moveToNextInput($input) {
  const frame = parseInt($input.data('frame'), 10);
  const roll = parseInt($input.data('roll'), 10);
  if (frame < 10) {
    if (roll === 0) {
      const second = $(`.frame-input[data-frame='${frame}'][data-roll='1']`);
      if (second.length) { $('.frame-input').removeClass('active'); second.addClass('active'); activeInput = second; return; }
    }
    const next = $(`.frame-input[data-frame='${frame+1}'][data-roll='0']`);
    if (next.length) { $('.frame-input').removeClass('active'); next.addClass('active'); activeInput = next; }
  } else {
    // 第10格
    for (let r = roll + 1; r < 3; r++) {
      const next = $(`.frame-input[data-frame='10'][data-roll='${r}']`);
      if (next.length) { $('.frame-input').removeClass('active'); next.addClass('active'); activeInput = next; return; }
    }
  }
}
