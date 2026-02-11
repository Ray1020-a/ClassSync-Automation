// src/app/api/auth/verify/route.ts
import { NextResponse } from 'next/server';
import { codeStorage } from '../send-code/route'; // 確保 send-code 有導出儲存空間
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { userId, code } = await request.json();

    // 1. 檢查驗證碼 (從記憶體暫存中抓取)
    const savedCode = codeStorage.get(userId);
    
    if (!savedCode || savedCode !== code) {
      return NextResponse.json({ error: '驗證碼錯誤或已過期' }, { status: 400 });
    }

    // 2. 驗證成功，清除驗證碼
    codeStorage.delete(userId);

    // 3. 使用 AUTH_SECRET 簽署數位簽章 (防止偽造身分)
    const secret = process.env.AUTH_SECRET || 'fallback-secret';
    const signature = crypto.createHmac('sha256', secret).update(userId).digest('hex');
    const secureToken = btoa(`${userId}.${signature}`); // 最終儲存在 Cookie 的內容

    const response = NextResponse.json({ success: true });

    // 4. 設定安全 Cookie (30天過期)
    response.cookies.set('user_session', secureToken, {
      httpOnly: false, // 讓前端能讀取解碼 userId 來顯示介面
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: '伺服器驗證出錯' }, { status: 500 });
  }
}