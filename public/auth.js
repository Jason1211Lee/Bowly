// Firebase 認證相關函數
import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// ==========================================
// 認證狀態管理
// ==========================================

export let currentUser = null;

// 監聽認證狀態變化
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  
  if (user) {
    // 用戶已登入
    console.log(`✅ 用戶已登入: ${user.email}`);
    showGameView();
  } else {
    // 用戶未登入
    console.log("❌ 用戶未登入");
    showAuthView();
  }
});

// ==========================================
// 認證函數
// ==========================================

/**
 * 用戶註冊
 */
export async function registerUser(email, password) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // 在 Firestore 中建立用戶記錄
    await setDoc(doc(db, "users", user.uid), {
      email: user.email,
      createdAt: new Date().toISOString(),
      records: [], // 初始化為空紀錄
      target: 170 // 默認目標
    });
    
    console.log("✅ 註冊成功:", user.email);
    return user;
  } catch (error) {
    console.error("❌ 註冊失敗:", error.message);
    throw error;
  }
}

/**
 * 用戶登入
 */
export async function loginUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log("✅ 登入成功:", user.email);
    return user;
  } catch (error) {
    console.error("❌ 登入失敗:", error.message);
    throw error;
  }
}

/**
 * 用戶登出
 */
export async function logoutUser() {
  try {
    await signOut(auth);
    console.log("✅ 登出成功");
  } catch (error) {
    console.error("❌ 登出失敗:", error.message);
    throw error;
  }
}

// ==========================================
// UI 切換
// ==========================================

function showAuthView() {
  // 隱藏遊戲視圖，顯示認證視圖
  const gameApp = document.getElementById('gameApp');
  const authApp = document.getElementById('authApp');
  
  if (gameApp) gameApp.style.display = 'none';
  if (authApp) authApp.style.display = 'block';
}

function showGameView() {
  // 顯示遊戲視圖，隱藏認證視圖
  const gameApp = document.getElementById('gameApp');
  const authApp = document.getElementById('authApp');
  
  if (gameApp) gameApp.style.display = 'block';
  if (authApp) authApp.style.display = 'none';
  
  // 更新導航欄用戶信息
  if (currentUser) {
    const userEmail = document.getElementById('userEmail');
    if (userEmail) userEmail.textContent = currentUser.email;
  }
}

// ==========================================
// 事件綁定（認證表單）
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  // 註冊表單
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('registerEmail').value;
      const password = document.getElementById('registerPassword').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      
      if (password !== confirmPassword) {
        alert('❌ 密碼不相符');
        return;
      }
      
      try {
        await registerUser(email, password);
        alert('✅ 註冊成功！已自動登入。');
        registerForm.reset();
      } catch (error) {
        alert(`❌ 註冊失敗: ${error.message}`);
      }
    });
  }
  
  // 登入表單
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;
      
      try {
        await loginUser(email, password);
        alert('✅ 登入成功！');
        loginForm.reset();
      } catch (error) {
        alert(`❌ 登入失敗: ${error.message}`);
      }
    });
  }
  
  // 登出按鈕
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      if (confirm('確定要登出嗎？')) {
        try {
          await logoutUser();
          alert('✅ 已登出');
        } catch (error) {
          alert(`❌ 登出失敗: ${error.message}`);
        }
      }
    });
  }
  
  // 切換登入/註冊頁籤
  const showLoginBtn = document.getElementById('showLoginBtn');
  const showRegisterBtn = document.getElementById('showRegisterBtn');
  const loginPanel = document.getElementById('loginPanel');
  const registerPanel = document.getElementById('registerPanel');
  
  if (showLoginBtn && showRegisterBtn && loginPanel && registerPanel) {
    showLoginBtn.addEventListener('click', () => {
      loginPanel.style.display = 'block';
      registerPanel.style.display = 'none';
      showLoginBtn.classList.add('active');
      showRegisterBtn.classList.remove('active');
    });
    
    showRegisterBtn.addEventListener('click', () => {
      loginPanel.style.display = 'none';
      registerPanel.style.display = 'block';
      showLoginBtn.classList.remove('active');
      showRegisterBtn.classList.add('active');
    });
  }
});

export { showGameView, showAuthView };
