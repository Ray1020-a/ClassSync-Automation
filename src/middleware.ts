import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// --- 配置白名單 ---
const PUBLIC_FILE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico'];
const PUBLIC_PATHS = ['/login', '/api/auth/send-code', '/api/auth/verify'];

const textEncoder = new TextEncoder();

/**
 * Web Crypto API: 驗證 HMAC 簽章 (適用於 Edge Runtime)
 */
async function verifySignature(userId: string, signature: string, secret: string) {
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      textEncoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // 將 Hex 字串轉為 Uint8Array
    const sigArray = new Uint8Array(
      signature.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
    );

    return await crypto.subtle.verify(
      'HMAC',
      key,
      sigArray,
      textEncoder.encode(userId)
    );
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const secret = process.env.AUTH_SECRET;

  // 1. 排除靜態檔案 (例如 /T-school.png) 與 Next.js 內部檔案
  if (
    pathname.startsWith('/_next') || 
    PUBLIC_FILE_EXTENSIONS.some(ext => pathname.endsWith(ext))
  ) {
    return NextResponse.next();
  }

  // 2. 檢查是否為公開路徑 (登入流程)
  const isPublicPath = PUBLIC_PATHS.some(path => pathname === path);
  if (isPublicPath) {
    return NextResponse.next();
  }

  // --- 開始受保護區域的驗證 ---

  const sessionCookie = request.cookies.get('user_session')?.value;

  // 處理「沒 Cookie」的情況
  if (!sessionCookie) {
    return handleUnauthorized(request);
  }

  try {
    // 解碼 Base64 (格式: userId.signature)
    const decoded = atob(sessionCookie);
    const [userId, signature] = decoded.split('.');

    if (!userId || !signature || !secret) {
      throw new Error('Invalid session format');
    }

    // 驗證數位簽章
    const isValid = await verifySignature(userId, signature, secret);

    if (!isValid) {
      return handleUnauthorized(request, true);
    }

    // 驗證通過，繼續執行
    return NextResponse.next();
  } catch (error) {
    return handleUnauthorized(request, true);
  }
}

/**
 * 統一處理未授權的情況
 */
function handleUnauthorized(request: NextRequest, shouldDeleteCookie = false) {
  const { pathname } = request.nextUrl;

  // 如果是 API 請求，回傳 JSON 401
  if (pathname.startsWith('/api/')) {
    const response = NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
    if (shouldDeleteCookie) response.cookies.delete('user_session');
    return response;
  }

  // 如果是頁面請求，重導向到登入頁
  const loginUrl = new URL('/login', request.url);
  const response = NextResponse.redirect(loginUrl);
  if (shouldDeleteCookie) response.cookies.delete('user_session');
  return response;
}

// 匹配所有路徑 (排除已在程式內過濾的靜態資源)
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};