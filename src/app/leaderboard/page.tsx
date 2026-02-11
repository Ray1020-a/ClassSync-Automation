"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Trophy, 
  Sun, 
  Moon, 
  ArrowLeft, 
  Loader2, 
  Medal,
  Flame,
  Coffee,
  Info
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { getAuthUser } from "@/lib/auth";

// 排行榜單列元件
const RankingItem = ({ item, index, dataKey, unit }: any) => {
  const isTopThree = index < 3;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`flex items-center justify-between p-4 rounded-2xl transition-all duration-300 ${
        isTopThree ? "bg-slate-50/80 border border-slate-100 shadow-sm" : "hover:bg-slate-50"
      }`}
    >
      <div className="flex items-center gap-4">
        {/* 名次標記 */}
        <div className={`w-8 h-8 flex items-center justify-center font-black rounded-xl text-sm
          ${index === 0 ? "bg-yellow-400 text-white shadow-lg shadow-yellow-100" : 
            index === 1 ? "bg-slate-300 text-white shadow-lg shadow-slate-100" : 
            index === 2 ? "bg-orange-400 text-white shadow-lg shadow-orange-100" : "text-slate-300"}`}
        >
          {index + 1}
        </div>
        <span className={`font-bold ${isTopThree ? "text-slate-800" : "text-slate-600"}`}>
          {item.name}
        </span>
      </div>

      <div className="flex items-baseline gap-1">
        <span className="text-xl font-black text-slate-900 tracking-tighter">
          {item[dataKey]}
        </span>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          {unit}
        </span>
      </div>
    </motion.div>
  );
};

// 榜單卡片外殼
const RankingCard = ({ title, subTitle, icon: Icon, list, unit, colorClass, dataKey }: any) => (
  <div className="bg-white rounded-[2.5rem] p-6 shadow-xl shadow-slate-200/50 border border-slate-100 flex-1 flex flex-col">
    <div className="flex items-center gap-4 mb-8">
      <div className={`p-4 rounded-2xl ${colorClass} text-white shadow-lg`}>
        <Icon size={24} />
      </div>
      <div>
        <h2 className="text-xl font-black text-slate-800 tracking-tight">{title}</h2>
        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{subTitle}</p>
      </div>
    </div>

    <div className="space-y-2 flex-1">
      {list && list.length > 0 ? (
        list.map((item: any, idx: number) => (
          <RankingItem 
            key={item.name} 
            item={item} 
            index={idx} 
            dataKey={dataKey} 
            unit={unit} 
          />
        ))
      ) : (
        <div className="h-40 flex items-center justify-center text-slate-300 text-sm font-medium">
          尚無統計數據
        </div>
      )}
    </div>
  </div>
);

export default function LeaderboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // 1. 安全檢查：檢查前端登入狀態
    const user = getAuthUser();
    if (!user) {
      router.replace("/login");
      return;
    }

    // 2. 向後端請求排行榜數據
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch("/api/leaderboard");
        
        if (res.status === 401) {
          // 後端驗證失敗（簽章錯誤）
          router.replace("/login");
          return;
        }

        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Leaderboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [router]);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <Loader2 className="animate-spin text-blue-600 w-12 h-12 mb-4" />
      <p className="text-slate-400 font-black tracking-widest animate-pulse">正在計算課程數據...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-12">
      <div className="max-w-7xl mx-auto">
        
        {/* 返回與標題 */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <Link 
            href="/dashboard" 
            className="group flex items-center gap-2 text-slate-400 hover:text-blue-600 font-bold transition-all"
          >
            <div className="p-2 rounded-xl group-hover:bg-blue-50 transition-colors">
              <ArrowLeft size={20} />
            </div>
            返回我的課表
          </Link>

          <div className="text-left md:text-right">
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter italic">
              LEADER<span className="text-blue-600">BOARD</span>
            </h1>
          </div>
        </div>

        {/* 三大榜單區塊 */}
        <div className="flex flex-col lg:flex-row gap-8 items-stretch">
          
          <RankingCard 
            title="課程節數榜"
            subTitle="Total Class Periods"
            icon={Flame}
            list={data?.mostBusy}
            dataKey="totalPeriods"
            unit="節"
            colorClass="bg-blue-600 shadow-blue-200"
          />

          <RankingCard 
            title="早上沒課榜"
            subTitle="Morning Free Time"
            icon={Sun}
            list={data?.morningKings}
            dataKey="morningOffCount"
            unit="天"
            colorClass="bg-orange-500 shadow-orange-200"
          />

          <RankingCard 
            title="午後沒課榜"
            subTitle="Afternoon Free Time"
            icon={Moon}
            list={data?.afternoonKings}
            dataKey="afternoonOffCount"
            unit="天"
            colorClass="bg-indigo-600 shadow-indigo-200"
          />

        </div>

        {/* 底部說明 */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-12 bg-white rounded-3xl p-6 border border-slate-200 flex flex-col md:flex-row items-center gap-6"
        >
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
            <Info size={24} />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">計算規則說明</h4>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              本排行榜基於資料庫中所有已排定課程日期若有誤請聯繫管理員修正。<br />
              計算方式包含<span className="text-blue-600 font-bold mx-1">「線上同步課程」</span>
            </p>
          </div>
        </motion.div>

        <p className="text-center mt-12 text-[12px] font-black text-slate-300">
          © 2026 ClassSync | AI assistance powered by Google Gemini
        </p>
      </div>
    </div>
  );
}