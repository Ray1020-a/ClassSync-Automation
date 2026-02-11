// src/app/api/leaderboard/route.ts
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { parseSections } from '@/lib/scheduleUtils';

export async function GET() {
  try {
    const classData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/data/class.json'), 'utf8'));
    const studentData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/data/student.json'), 'utf8'));

    // 取得所有出現過的日期，作為計算基準
    const allDates = Array.from(new Set(Object.values(classData).flatMap((c: any) => c.map((s: any) => s.Time)))).sort();

    const stats = Object.keys(studentData).map(userId => {
      const student = studentData[userId];
      const myClasses = student.class;
      
      let totalPeriods = 0;
      let morningOffCount = 0;
      let afternoonOffCount = 0;

      // 針對每一個日期進行掃描
      allDates.forEach(date => {
        let periodsToday: number[] = [];

        myClasses.forEach((className: string) => {
          const schedules = classData[className] || [];
          schedules.forEach((sche: any) => {
            if (sche.Time === date) {
              periodsToday.push(...parseSections(sche.Section));
            }
          });
        });

        // 1. 計算總節數
        totalPeriods += periodsToday.length;

        // 2. 判斷早上是否沒課 (1,2,3,4 節)
        const hasMorningClass = periodsToday.some(p => p >= 1 && p <= 4);
        if (!hasMorningClass) morningOffCount++;

        // 3. 判斷下午是否沒課 (5,6,7,8 節)
        const hasAfternoonClass = periodsToday.some(p => p >= 5 && p <= 8);
        if (!hasAfternoonClass) afternoonOffCount++;
      });

      return {
        name: student.name,
        totalPeriods,
        morningOffCount,
        afternoonOffCount
      };
    });

    return NextResponse.json({
      mostBusy: [...stats].sort((a, b) => b.totalPeriods - a.totalPeriods).slice(0, 30),
      morningKings: [...stats].sort((a, b) => b.morningOffCount - a.morningOffCount).slice(0, 30),
      afternoonKings: [...stats].sort((a, b) => b.afternoonOffCount - a.afternoonOffCount).slice(0, 30)
    });
  } catch (error) {
    return NextResponse.json({ error: '無法生成排行榜' }, { status: 500 });
  }
}