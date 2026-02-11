"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
// 修改：移除 setAuthCookie，因為現在由後端 API 透過 Set-Cookie 直接核發
import { formatEmail } from "@/lib/auth";

export default function LoginPage() {
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState("");
  const [code, setCode] = useState("");
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return alert("請輸入學號");

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: `${userId}@tschool.tp.edu.tw` }), // 使用正確後綴
      });

      if (response.ok) {
        setStep(2);
      } else {
        const data = await response.json();
        alert(data.error || "發送失敗");
      }
    } catch (error) {
      alert("連線失敗，請檢查網路設定");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- 安全強化：真實驗證邏輯 ---
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 6) return alert("請輸入完整的 6 位驗證碼");

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, code }),
      });

      if (response.ok) {
        // 驗證成功！Cookie 已由後端 Set-Cookie 自動寫入
        router.push("/dashboard");
      } else {
        const data = await response.json();
        alert(data.error || "驗證碼不正確");
        setIsSubmitting(false);
      }
    } catch (error) {
      alert("驗證程序出錯，請稍後再試");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <AnimatePresence>
        {loading ? (
          <motion.div key="loader" exit={{ opacity: 0, scale: 0.8 }} className="flex flex-col items-center">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}>
              <img src="/T-school.png" alt="Logo" className="h-24" />
            </motion.div>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-6 text-gray-400 font-medium tracking-widest uppercase text-xs">
              Loading Login page...
            </motion.p>
          </motion.div>
        ) : (
          <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
            <div className="text-center mb-10">
              <h1 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">
                {step === 1 ? "歡迎回來" : "驗證身分"}
              </h1>
              <p className="text-gray-500 text-sm">
                {step === 1 
                  ? "請使用 tschool.tp.edu.tw 帳號登入" 
                  : `驗證碼已發送至 ${userId}@tschool.tp.edu.tw`}
              </p>
            </div>

            <form onSubmit={step === 1 ? handleSendCode : handleVerify} className="space-y-4">
              {step === 1 ? (
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                    <Mail size={18} />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="輸入學號"
                    className="w-full pl-12 pr-36 py-4 text-gray-900 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-blue-600 focus:bg-white outline-none transition-all text-lg font-bold"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                  />
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <span className="text-gray-400 font-bold text-sm border-l pl-3">@tschool.tp.edu.tw</span>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                    <ShieldCheck size={20} />
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="000000"
                    className="w-full pl-12 py-4 text-blue-600 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-blue-600 focus:bg-white outline-none transition-all text-center text-3xl tracking-[0.5em] font-black"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </div>
              )}

              <button
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-blue-100 transition-all flex items-center justify-center gap-2 group"
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    {step === 1 ? "發送驗證碼" : "確認登入"}
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

              {step === 2 && (
                <button type="button" onClick={() => setStep(1)} className="w-full text-gray-400 text-xs font-bold hover:text-gray-600 transition uppercase tracking-tighter">
                  ← 傳回上一步修改學號
                </button>
              )}
            </form>

            <div className="mt-16 text-center border-t border-gray-100 pt-8">
              <p className="text-[10px] text-gray-300 uppercase font-black tracking-[0.2em]">
                ClassSync 副署自動登陸課表系統
              </p>
              <p className="text-[10px] text-gray-300 mt-1">
                專為臺北市數位實驗高級中等學校學生打造 | v1.0 Secure
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}