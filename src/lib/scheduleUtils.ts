// src/lib/scheduleUtils.ts

/**
 * 強制取得台灣時間 (UTC+8) 的 Date 物件
 * 解決伺服器在國外時日期偏移的問題
 */
export const getTaiwanDate = (dateStr?: string): Date => {
  const d = dateStr ? new Date(dateStr) : new Date();
  // 透過 offset 調整為台灣時間
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const nd = new Date(utc + (3600000 * 8)); 
  return nd;
};

/**
 * 格式化 Date 物件為 YYYY-MM-DD
 */
export const formatDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * 取得特定日期所屬週的週一日期字串 (YYYY-MM-DD)
 */
export const getMondayOfDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  const day = d.getDay(); // 0(日) 到 6(六)
  // 如果是週日(0)，要減 6 天回到週一；其他則是減去 (day - 1)
  const diff = d.getDate() - (day === 0 ? 6 : day - 1);
  const monday = new Date(d.setDate(diff));
  return formatDate(monday);
};

/**
 * 取得基於今天加上偏移週數的週一到週五日期陣列
 * @param offset 0 為本週, 1 為下週, -1 為上週
 */
export const getWeekDays = (offset: number): string[] => {
  const today = getTaiwanDate();
  const day = today.getDay();
  const distanceToMonday = day === 0 ? -6 : 1 - day;
  
  const monday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + distanceToMonday + (offset * 7)
  );

  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return formatDate(d);
  });
};

/**
 * 解析節次數字，例如 5678 -> [5, 6, 7, 8]
 */
export const parseSections = (section: number | string): number[] => {
  return String(section).split('').map(Number);
};