import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getWeekDays, parseSections } from '@/lib/scheduleUtils';

const SECRET = process.env.AUTH_SECRET || 'fallback';
const SCHOOL_NAME = "臺北市數位實驗高級中等學校";

// 1~8 節時間對照表
const TIME_TABLE: Record<number, { period: string; start: string; end: string }> = {
  1: { period: "一", start: "08:25", end: "09:15" },
  2: { period: "二", start: "09:15", end: "10:05" },
  3: { period: "三", start: "10:15", end: "11:05" },
  4: { period: "四", start: "11:05", end: "11:55" },
  5: { period: "五", start: "13:25", end: "14:15" },
  6: { period: "六", start: "14:15", end: "15:05" },
  7: { period: "七", start: "15:15", end: "16:05" },
  8: { period: "八", start: "16:05", end: "16:55" },
};

// 星期對照表
const WEEKDAY_NAMES = ["日", "一", "二", "三", "四", "五", "六"];

function verifyToken(session: string): string | null {
  try {
    const decoded = Buffer.from(session, 'base64').toString();
    const [userId, signature] = decoded.split('.');
    const expectedSignature = crypto.createHmac('sha256', SECRET).update(userId).digest('hex');
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

  const userId = verifyToken(session);
  if (!userId) {
    return NextResponse.json({ error: '無效的會話或簽章錯誤' }, { status: 401 });
  }

  try {
    const classData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/data/class.json'), 'utf8'));
    const studentData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/data/student.json'), 'utf8'));

    const studentInfo = studentData[userId];
    if (!studentInfo) {
      return NextResponse.json({ error: '找不到該學生資料' }, { status: 404 });
    }

    // 取得本週日期陣列 (YYYY-MM-DD)
    const currentWeekDates = getWeekDays(0); 
    const scheduleByCourse: Record<string, any> = {};

    // 遍歷學生所修的所有課程
    studentInfo.class.forEach((courseName: string) => {
      const courseEvents = classData[courseName] || [];
      const relevantSchedules: any[] = [];

      courseEvents.forEach((event: any) => {
        // 只處理發生在本週內的課程日期
        if (currentWeekDates.includes(event.Time)) {
          const dateObj = new Date(event.Time);
          const weekdayName = WEEKDAY_NAMES[dateObj.getDay()]; // 取得 "一" 到 "五"
          
          const sections = parseSections(event.Section);
          sections.forEach((s: number) => {
            const timeInfo = TIME_TABLE[s];
            if (timeInfo) {
              relevantSchedules.push({
                weekday: weekdayName,
                period: timeInfo.period,
                start: timeInfo.start,
                end: timeInfo.end
              });
            }
          });
        }
      });

      // 如果本週有課，才加入回傳結果
      if (relevantSchedules.length > 0) {
        scheduleByCourse[courseName] = {
          count: relevantSchedules.length,
          schedule: relevantSchedules.sort((a, b) => {
            // 排序邏輯：先排星期，再排節次
            const dayMap: any = { "一": 1, "二": 2, "三": 3, "四": 4, "五": 5 };
            const periodMap: any = { "一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8 };
            return dayMap[a.weekday] - dayMap[b.weekday] || periodMap[a.period] - periodMap[b.period];
          })
        };
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        name: studentInfo.name,
        userId: userId,
        school: SCHOOL_NAME,
        currentWeek: {
          range: `${currentWeekDates[0]} ~ ${currentWeekDates[4]}`,
          courses: scheduleByCourse
        }
      }
    });

  } catch (error) {
    console.error("User Info API Error:", error);
    return NextResponse.json({ error: '伺服器內部錯誤' }, { status: 500 });
  }
}