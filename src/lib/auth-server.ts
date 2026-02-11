// src/lib/auth-server.ts
import crypto from 'crypto';
import { cookies } from 'next/headers';

/**
 * 在伺服器端驗證 Cookie
 * 如果簽章不對，會自動刪除 Cookie 並執行「登出」
 */
export const verifySessionOnServer = async (): Promise<string | null> => {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('user_session')?.value;

  if (!sessionCookie) return null;

  try {
    // 1. 解碼 Base64
    const decoded = Buffer.from(sessionCookie, 'base64').toString();
    const [userId, signature] = decoded.split('.');

    if (!userId || !signature) {
      throw new Error("格式錯誤");
    }

    // 2. 驗證簽章
    const secret = process.env.AUTH_SECRET;
    if (!secret) throw new Error("AUTH_SECRET 未設定");

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(userId)
      .digest('hex');

    // 3. 檢查簽章是否正確
    if (signature === expectedSignature) {
      return userId; // 驗證成功
    } else {
      throw new Error("簽章不符");
    }

  } catch (error) {
    // --- 關鍵動作：立即登出 ---
    console.warn("偵測到非法或損壞的 Session，正在強制登出...");
    
    // 刪除 Cookie
    cookieStore.delete('user_session');
    
    return null;
  }
};