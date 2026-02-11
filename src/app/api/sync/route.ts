
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
const API_KEY = process.env.CLASSSYNC_API_KEY;

export async function POST(request: Request) {
  try {
    const { userId } = await request.json(); // 這是學號/email 前綴
    const email = `${userId}@tschool.tp.edu.tw`;

    // 1. 讀取本地資料庫 (防呆：檢查檔案是否存在)
    const classPath = path.join(process.cwd(), 'src/data/class.json');
    const studentPath = path.join(process.cwd(), 'src/data/student.json');
    
    if (!fs.existsSync(classPath) || !fs.existsSync(studentPath)) {
      return NextResponse.json({ error: '系統資料庫遺失' }, { status: 500 });
    }

    const classData = JSON.parse(fs.readFileSync(classPath, 'utf8'));
    const studentData = JSON.parse(fs.readFileSync(studentPath, 'utf8'));

    const studentInfo = studentData[userId];
    if (!studentInfo) return NextResponse.json({ error: '找不到該學生資料' }, { status: 404 });

    const userResponse = await fetch(`${API_BASE}/admin/lookup-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: API_KEY, email: email })
    });

    if (!userResponse.ok) {
      return NextResponse.json({ error: '無法獲取 ClassSync 用戶編號' }, { status: 401 });
    }
    const userData = await userResponse.json();
    const realUserNum = userData.userId; // 假設回傳格式包含 user ID

    // 3. 資料轉換邏輯 (按週分組)
    const weeklyPayloads: Record<string, any> = {};

    studentInfo.class.forEach((courseName: string) => {
      const schedules = classData[courseName] || [];
      schedules.forEach((sche: any) => {
        const monday = getMondayOfDate(sche.Time);
        const dateObj = getTaiwanDate(sche.Time);
        let dayOfWeek = dateObj.getDay();
        if (dayOfWeek === 0) dayOfWeek = 7; // 週日設為 7

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

    // 4. 批次同步到 ClassSync
    const syncResults = [];
    for (const [monday, weekData] of Object.entries(weeklyPayloads)) {
      const payload = {
        apiKey: API_KEY,
        userId: realUserNum.toString(),
        weekStart: monday,
        data: weekData
      };

      const res = await fetch(`${API_BASE}/admin/set-schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      syncResults.push({ week: monday, success: res.ok });
    }

    return NextResponse.json({ 
      success: true, 
      syncedWeeks: syncResults.length,
      details: syncResults 
    });

  } catch (error) {
    console.error('Sync Error:', error);
    return NextResponse.json({ error: '同步程序崩潰' }, { status: 500 });
  }
}