import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getWeekDays, parseSections } from '@/lib/scheduleUtils';

const SECRET = process.env.AUTH_SECRET || 'fallback';
const SCHOOL_NAME = "臺北市數位實驗高級中等學校";

/**
 * 伺服器端驗證簽章邏輯 (手動實作以確保與 Middleware 一致)
 */
function verifyToken(session: string): string | null {
  try {
    const decoded = Buffer.from(session, 'base64').toString();
    const [userId, signature] = decoded.split('.');
    
    const expectedSignature = crypto
      .createHmac('sha256', SECRET)
      .update(userId)
      .digest('hex');

    return signature === expectedSignature ? userId : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const session = searchParams.get('user_session');

  if (!session) {
    return NextResponse.json({ error: '缺少 user_session 參數' }, { status: 400 });
  }

  // 1. 驗證 Session 簽章是否正確
  const userId = verifyToken(session);
  if (!userId) {
    return NextResponse.json({ error: '無效的會話或簽章錯誤' }, { status: 401 });
  }

  try {
    // 2. 讀取資料庫
    const classPath = path.join(process.cwd(), 'src/data/class.json');
    const studentPath = path.join(process.cwd(), 'src/data/student.json');
    const classData = JSON.parse(fs.readFileSync(classPath, 'utf8'));
    const studentData = JSON.parse(fs.readFileSync(studentPath, 'utf8'));

    const studentInfo = studentData[userId];
    if (!studentInfo) {
      return NextResponse.json({ error: '找不到該學生資料' }, { status: 404 });
    }

    // 3. 獲取當週日期 (Monday to Friday)
    const currentWeekDates = getWeekDays(0); 

    // 4. 建立當週課表結構
    const weeklySchedule: Record<string, any> = {};
    
    currentWeekDates.forEach((date) => {
      weeklySchedule[date] = {};
      
      // 檢查該學生修的所有課程
      studentInfo.class.forEach((className: string) => {
        const schedules = classData[className] || [];
        
        schedules.forEach((sche: any) => {
          if (sche.Time === date) {
            const sections = parseSections(sche.Section);
            sections.forEach(s => {
              // 初始化該節次的陣列 (考慮到衝堂)
              if (!weeklySchedule[date][s]) weeklySchedule[date][s] = [];
              
              weeklySchedule[date][s].push({
                courseName: className,
                location: sche.Location,
                base: sche.Location.split('_')[0],
                room: sche.Location.split('_')[1] || ""
              });
            });
          }
        });
      });
    });

    // 5. 回傳完整 JSON
    return NextResponse.json({
      success: true,
      data: {
        name: studentInfo.name,
        userId: userId,
        school: SCHOOL_NAME,
        currentWeek: {
          range: `${currentWeekDates[0]} ~ ${currentWeekDates[4]}`,
          schedule: weeklySchedule
        }
      }
    });

  } catch (error) {
    console.error("Public User Info API Error:", error);
    return NextResponse.json({ error: '伺服器內部錯誤' }, { status: 500 });
  }
}