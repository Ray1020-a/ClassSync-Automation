// src/lib/auth.ts
import Cookies from 'js-cookie';

/**
 * 獲取目前登入的使用者 ID
 * 
 * 因為後端核發的 Cookie 格式為 "userId.數位簽章" 並經過 Base64 編碼，
 * 前端需要解碼並切分字串來取得原始的 userId。
 */
export const getAuthUser = () => {
  const session = Cookies.get('user_session');
  if (!session) return null;

  try {
    // 1. Base64 解碼 (例如將 "ODg2Lnh4eHg=" 轉回 "866.xxxx")
    const decoded = atob(session);
    
    // 2. 透過點號 (.) 切割，取得第一部分即為 userId
    const [userId] = decoded.split('.');
    
    return userId || null;
  } catch (error) {
    console.error("解析驗證 Cookie 失敗:", error);
    return null;
  }
};

/**
 * 移除登入狀態 (登出)
 */
export const removeAuthCookie = () => {
  Cookies.remove('user_session', { path: '/' });
};

/**
 * 格式化為學校信箱
 */
export const formatEmail = (id: string) => {
  if (!id) return "";
  // 移除使用者可能誤輸入的 @ 之後內容
  const cleanId = id.split('@')[0];
  return `${cleanId}@tschool.tp.edu.tw`;
};

/**
 * 注意：
 * 我們不再提供前端的 setAuthCookie 函式，
 * 因為現在安全性強化後，Cookie 必須由後端 API (verify) 
 * 透過 HTTP Response Header 核發，以確保數位簽章不被竄改。
 */