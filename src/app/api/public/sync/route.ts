import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getMondayOfDate, parseSections, getTaiwanDate } from '@/lib/scheduleUtils';

const ADDRESS_MAP: Record<string, string> = {
  "吉林基地": "臺北市中山區吉林路110號",
  "弘道基地": "臺北市中正區公園路21號",
  "線上基地": "臺北市信義區信義路7號101樓"
};

const API_BASE = process.env.CLASSSYNC_API_URL;
const SYSTEM_API_KEY = process.env.CLASSSYNC_API_KEY;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, apiKey } = body;

    // --- 1. 安全檢查：驗證傳入的 apiKey ---
    if (!apiKey || apiKey !== SYSTEM_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized: 無效的 API Key' }, { status: 401 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'Bad Request: 缺少 userId (學號)' }, { status: 400 });
    }

    const email = `${userId}@tschool.tp.edu.tw`;

    // --- 2. 讀取資料庫 ---
    const classPath = path.join(process.cwd(), 'src/data/class.json');
    const studentPath = path.join(process.cwd(), 'src/data/student.json');
    
    if (!fs.existsSync(classPath) || !fs.existsSync(studentPath)) {
      return NextResponse.json({ error: 'Internal Server Error: 資料庫檔案不存在' }, { status: 500 });
    }

    const classData = JSON.parse(fs.readFileSync(classPath, 'utf8'));
    const studentData = JSON.parse(fs.readFileSync(studentPath, 'utf8'));

    const studentInfo = studentData[userId];
    if (!studentInfo) {
      return NextResponse.json({ error: `Not Found: 找不到學號為 ${userId} 的資料` }, { status: 404 });
    }

    // --- 3. 獲取實體 User ID ---
    const userResponse = await fetch(`${API_BASE}/admin/lookup-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: SYSTEM_API_KEY, email: email })
    });

    if (!userResponse.ok) {
      return NextResponse.json({ error: 'Failed to lookup user from ClassSync' }, { status: 401 });
    }
    const userData = await userResponse.json();
    const realUserNum = userData.userId;

    // --- 4. 資料轉換與週次分組 ---
    const weeklyPayloads: Record<string, any> = {};

    studentInfo.class.forEach((courseName: string) => {
      const schedules = classData[courseName] || [];
      schedules.forEach((sche: any) => {
        const monday = getMondayOfDate(sche.Time);
        const dateObj = getTaiwanDate(sche.Time);
        let dayOfWeek = dateObj.getDay();
        if (dayOfWeek === 0) dayOfWeek = 7; 

        if (!weeklyPayloads[monday]) {
          weeklyPayloads[monday] = { "1":{}, "2":{}, "3":{}, "4":{}, "5":{}, "6":{}, "7":{} };
        }

        const [base, room] = sche.Location.split('_');
        const sections = parseSections(sche.Section);

        sections.forEach(s => {
          weeklyPayloads[monday][dayOfWeek.toString()][s.toString()] = {
            courseName: courseName,
            isTemporary: true,
            base: base,
            room: room || "",
            address: ADDRESS_MAP[base] || "臺北市中山區吉林路110號",
            isSynced: false
          };
        });
      });
    });

    // --- 5. 批次執行同步 ---
    let successCount = 0;
    const errors = [];

    for (const [monday, weekData] of Object.entries(weeklyPayloads)) {
      const payload = {
        apiKey: SYSTEM_API_KEY,
        userId: realUserNum.toString(),
        weekStart: monday,
        data: weekData
      };

      const res = await fetch(`${API_BASE}/admin/set-schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        successCount++;
      } else {
        errors.push(monday);
      }
    }

    // --- 6. 回應最終結果 ---
    return NextResponse.json({ 
      success: true, 
      userId: userId,
      syncedWeeks: successCount,
      failedWeeks: errors.length > 0 ? errors : undefined,
      message: `學號 ${userId} 同步成功，共完成 ${successCount} 週資料更新。`
    });

  } catch (error) {
    console.error('Public Sync API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}