// ==========================================
// Bowly 應用核心邏輯
// ==========================================

// 常數
const STORAGE_KEY = 'bowlyRecords';
const TARGET_KEY = 'bowlyTarget';

// 初始化 - 從 localStorage 讀取數據
let records = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let targetScore = parseFloat(localStorage.getItem(TARGET_KEY)) || 170;

// 全局圖表實例
let trendChart = null;
let statsChart = null;

// ==========================================
// 數據管理函式
// ==========================================

/**
 * 添加新紀錄到 records 並保存到 localStorage
 * @param {Object} record - 包含 date, score, strikes, spares
 * @returns {boolean} - 是否成功添加
 */
function addGame(record) {
  // 檢查是否同日期已存在
  const existingIndex = records.findIndex(r => r.date === record.date);
  if (existingIndex !== -1) {
    // 若用戶確認覆蓋
    if (confirm(`${record.date} 已有紀錄，是否覆蓋？`)) {
      records[existingIndex] = {
        ...record,
        id: records[existingIndex].id, // 保留原 ID
        createdAt: records[existingIndex].createdAt
      };
    } else {
      return false;
    }
  } else {
    // 新增紀錄
    record.id = generateId();
    record.createdAt = Date.now();
    records.push(record);
  }
  
  // 按日期排序
  records.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // 保存到 localStorage
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  return true;
}

/**
 * 刪除指定日期的紀錄
 * @param {string} date - ISO 格式日期
 */
function removeGame(date) {
  records = records.filter(r => r.date !== date);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

/**
 * 清空所有紀錄
 */
function clearAllRecords() {
  if (confirm('確定要清空所有紀錄嗎？此操作無法撤銷。')) {
    records = [];
    localStorage.removeItem(STORAGE_KEY);
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

  const listHtml = records.map((record, idx) => `
    <div class="card mb-2">
      <div class="card-body d-flex justify-content-between align-items-center">
        <div>
          <strong>${record.date}</strong><br>
          <small class="text-muted">分數: ${record.score} | 全倒: ${record.strikes} | 補中: ${record.spares}</small>
        </div>
        <button type="button" class="btn btn-sm btn-danger delete-btn" data-date="${record.date}">刪除</button>
      </div>
    </div>
  `).join('');

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
    const date = $(this).data('date');
    if (confirm(`確定要刪除 ${date} 的紀錄嗎？`)) {
      removeGame(date);
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

