// src/app/api/schedule/route.ts
import { NextResponse } from 'next/server';
import { verifySessionOnServer } from '@/lib/auth-server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  // 呼叫驗證 (若失敗會自動 delete cookie)
  const validUserId = await verifySessionOnServer();

  if (!validUserId) {
    // 回傳 401，前端收到後可以引導使用者回登入頁
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 驗證成功才讀取資料
  const classData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/data/class.json'), 'utf8'));
  const studentData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/data/student.json'), 'utf8'));
  
  return NextResponse.json({ classes: classData, students: studentData });
}