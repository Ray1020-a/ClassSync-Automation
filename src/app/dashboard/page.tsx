"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  ChevronLeft, 
  ChevronRight, 
  LogOut, 
  RefreshCw, 
  User, 
  Calendar,
  MapPin,
  Loader2,
  Lock,
  Trophy,
  Link
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Cookies from "js-cookie";

// 導入自定義工具與元件
import { getAuthUser, removeAuthCookie } from "@/lib/auth";
import { getWeekDays, parseSections } from "@/lib/scheduleUtils";
import LoadingScreen from "@/components/LoadingScreen";

export default function Dashboard() {
  // --- 狀態管理 ---
  const [initialLoading, setInitialLoading] = useState(true); // 初始頁面加載
  const [isSyncing, setIsSyncing] = useState(false);         // 同步 API 加載
  const [data, setData] = useState<{ classes: any; students: any } | null>(null);
  const [loggedInId, setLoggedInId] = useState<string>("");   // 登入者本人 ID
  const [currentId, setCurrentId] = useState<string>("");     // 目前顯示的同學 ID
  const [weekOffset, setWeekOffset] = useState(0);            // 週次偏移量
  const router = useRouter();

  // --- 初始化流程 ---
  useEffect(() => {
    const user = getAuthUser();
    if (!user) {
      router.replace("/login");
      return;
    }

    setLoggedInId(user);
    setCurrentId(user); // 預設顯示自己的課表

    const fetchData = async () => {
      try {
        const res = await fetch("/api/schedule");
        const json = await res.json();
        setData(json);
        // 為了展示 Logo 加載畫面，稍微延遲 1.5 秒
        setTimeout(() => setInitialLoading(false), 1500);
      } catch (err) {
        alert("資料庫讀取失敗，請檢查網路連線");
      }
    };

    fetchData();
  }, [router]);

  // --- 核心邏輯：計算當週日期 (台灣時間) ---
  const weekDates = useMemo(() => getWeekDays(weekOffset), [weekOffset]);

  // --- 權限判斷：是否為本人 ---
  const isMyOwnSchedule = currentId === loggedInId;

  // --- 登出 ---
  const handleLogout = () => {
    if (confirm("確定要登出系統嗎？")) {
      removeAuthCookie();
      router.push("/login");
    }
  };

  // --- 同步至 ClassSync (只限本人) ---
  const handleSync = async () => {
    if (!isMyOwnSchedule) return;
    alert("還是爛的，先不要用")
    // if (!confirm("即將開始同步您的課表至 ClassSync 系統，這可能需要幾秒鐘的時間。確定繼續？")) return;

    // setIsSyncing(true);
    // try {
    //   const res = await fetch("/api/sync", {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify({ userId: loggedInId }),
    //   });

    //   const result = await res.json();
    //   if (res.ok) {
    //     alert(`同步完成！\n成功將 ${result.syncedWeeks} 週的課表同步至 ClassSync。`);
    //   } else {
    //     alert(`同步失敗：${result.error}`);
    //   }
    // } catch (err) {
    //   alert("無法連線至同步 API，請稍後再試。");
    // } finally {
    //   setIsSyncing(false);
    // }
  };

  // --- 渲染判斷 ---
  if (initialLoading || !data) return <LoadingScreen />;

  const days = ["一", "二", "三", "四", "五"];
  const periods = [1, 2, 3, 4, 5, 6, 7, 8];
  const viewedStudentClasses = data.students[currentId]?.class || [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      
      {/* --- 全螢幕同步鎖定畫面 --- */}
      <AnimatePresence>
        {isSyncing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6"
          >
            <div className="bg-white p-8 rounded-[2.5rem] flex flex-col items-center shadow-2xl max-w-xs w-full">
              <div className="relative mb-6">
                <Loader2 className="w-16 h-16 animate-spin text-blue-600" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <RefreshCw size={20} className="text-blue-200" />
                </div>
              </div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">同步處理中</h3>
              <p className="text-slate-500 text-center mt-2 text-sm leading-relaxed">
                正在獲取用戶編號並轉換地址...<br/>請勿關閉視窗。
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- 導覽列 --- */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <img src="/favicon.ico" alt="Logo" className="w-8 h-8 rounded-md" />
            <span className="font-black text-lg tracking-tight hidden sm:block">ClassSync Automation</span>
            
            {/* 選擇同學 (下拉選單) */}
            <div className="relative group min-w-[120px]">
              <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-xl hover:bg-slate-200 transition cursor-pointer border border-transparent">
                <User size={16} className="text-slate-400" />
                <span className="font-bold text-sm text-slate-700">
                  {data.students[currentId]?.name || "選擇同學"}
                </span>
              </div>
              <select 
                className="absolute inset-0 opacity-0 cursor-pointer w-full"
                value={currentId}
                onChange={(e) => setCurrentId(e.target.value)}
              >
                {Object.keys(data.students).map(id => (
                  <option key={id} value={id}>
                    {data.students[id].name} {id === loggedInId ? "(我)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => router.push("/leaderboard")}
              className="group flex items-center gap-2 bg-slate-100 hover:bg-amber-50 px-4 py-2.5 rounded-xl transition-all duration-300 active:scale-95 border border-transparent hover:border-amber-200">
              <Trophy 
                size={18} 
                className="text-slate-400 group-hover:text-amber-500 group-hover:rotate-12 transition-all duration-300" 
              />
              <span className="text-sm font-bold text-slate-600 group-hover:text-amber-700 tracking-tight">
                排行榜
              </span>
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            {/* 僅本人顯示同步按鈕 */}
            {isMyOwnSchedule ? (
              <button 
                onClick={handleSync}
                className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-100 active:scale-95"
              >
                <RefreshCw size={14} />
                <span className="hidden sm:block">同步我的課表</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 text-slate-400 bg-slate-100 px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-200">
                <Lock size={12} />
                <span>唯讀模式</span>
              </div>
            )}
            
            <button 
              onClick={handleLogout}
              className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition"
            >
              <LogOut size={22} />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        
        {/* --- 標題與週次切換 --- */}
        <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-10 gap-6">
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
              <Calendar className="text-blue-600" size={28} />
              {weekOffset === 0 ? "本週課程" : `第 ${weekOffset > 0 ? "下" : "上"} ${Math.abs(weekOffset)} 週`}
            </h2>
            <p className="text-slate-400 font-mono text-sm tracking-wide">
              {weekDates[0]} (一) — {weekDates[4]} (五)
            </p>
          </div>

          <div className="flex bg-white p-2 rounded-2xl shadow-sm border border-slate-200 w-full md:w-auto justify-center">
            <button onClick={() => setWeekOffset(v => v - 1)} className="p-2 hover:bg-slate-100 rounded-xl transition text-slate-600"><ChevronLeft/></button>
            <button onClick={() => setWeekOffset(0)} className="px-6 text-sm font-black text-slate-500 hover:text-blue-600 uppercase tracking-widest">本週</button>
            <button onClick={() => setWeekOffset(v => v + 1)} className="p-2 hover:bg-slate-100 rounded-xl transition text-slate-600"><ChevronRight/></button>
          </div>
        </div>

        {/* --- 課表網格系統 --- */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/60 border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="grid grid-cols-6 min-w-[850px]">
              
              {/* 時段標記 */}
              <div className="bg-slate-50/50 border-r border-slate-100">
                <div className="h-20 border-b border-slate-100 flex items-center justify-center">
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]"></span>
                </div>
                {periods.map(p => (
                  <div key={p} className="h-32 border-b border-slate-100 last:border-0 flex items-center justify-center">
                    <span className="text-3xl font-black text-slate-300">{p}</span>
                  </div>
                ))}
              </div>

              {/* 星期一至五 */}
              {days.map((dayName, dIdx) => (
                <div key={dayName} className="border-r border-slate-100 last:border-0">
                  <div className="h-20 border-b border-slate-100 bg-slate-50/30 flex flex-col items-center justify-center">
                    <span className="font-black text-slate-800 text-lg">週{dayName}</span>
                    <span className="text-[10px] font-mono font-bold text-slate-400">{weekDates[dIdx].slice(5)}</span>
                  </div>

                  {periods.map(p => {
                    // 比對邏輯：過濾當前查看學生的課程，並與 Time/Section 進行配對
                    const cellEvents: any[] = [];
                    viewedStudentClasses.forEach((courseName: string) => {
                      const schedules = data.classes[courseName] || [];
                      schedules.forEach((sche: any) => {
                        if (sche.Time === weekDates[dIdx] && parseSections(sche.Section).includes(p)) {
                          cellEvents.push({ name: courseName, ...sche });
                        }
                      });
                    });

                    return (
                      <div key={p} className="h-32 border-b border-slate-50 last:border-0 p-2 flex flex-col gap-1.5 overflow-hidden group hover:bg-slate-50/40 transition-colors">
                        <AnimatePresence mode="popLayout">
                          {cellEvents.slice(0, 2).map((evt, i) => (
                            <motion.div
                              layout
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              key={evt.name + i}
                              className={`flex-1 rounded-2xl p-2.5 shadow-sm border-l-[6px] overflow-hidden relative
                                ${i === 0 
                                  ? 'bg-blue-50/80 border-blue-500 text-blue-900' 
                                  : 'bg-indigo-50/80 border-indigo-500 text-indigo-900'}`}
                            >
                              <div className="font-black text-[12px] leading-tight truncate mb-1">
                                {evt.name}
                              </div>
                              <div className="flex items-center gap-1 text-[10px] opacity-60 font-bold truncate">
                                <MapPin size={10} />
                                {evt.Location.split('_')[1] || evt.Location}
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                        
                        {/* 衝堂數量提示 */}
                        {cellEvents.length > 2 && (
                          <div className="text-[9px] text-center font-black text-red-500 bg-red-50 rounded-full py-0.5 animate-pulse">
                            +{cellEvents.length - 2} 堂衝堂
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 頁尾資訊 */}
        <div className="mt-10 flex flex-col md:flex-row justify-between items-center text-slate-400 text-[11px] font-bold tracking-widest gap-6">
          <p>© 2026 ClassSync | AI assistance powered by Google Gemini</p>
          <p>若發現任何錯誤，請聯絡</p>
        </div>
      </main>
    </div>
  );
}