import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Delete, ArrowRight, Loader2, ShieldCheck, User } from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuthStore } from "../../store/useAuthStore";

import { useThemeStore } from "../../store/useThemeStore";

export const Login: React.FC = () => {
  const [pin, setPin] = useState("");
  const { login, isLoading, error } = useAuthStore();
  const { isDarkMode, primaryColor, accentColor } = useThemeStore();

  const handleNumberClick = (num: string) => {
    if (pin.length < 6) {
      setPin((prev) => prev + num);
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (pin.length >= 4) {
      const success = await login(pin);
      if (!success) {
        setPin(""); // Reset on failure
      }
    }
  };

  // Auto-submit on 6 digits
  useEffect(() => {
    if (pin.length === 6) {
      handleSubmit();
    }
  }, [pin]);

  // Handle physical keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if currently loading
      if (isLoading) return;

      if (e.key >= "0" && e.key <= "9") {
        handleNumberClick(e.key);
      } else if (e.key === "Backspace") {
        handleDelete();
      } else if (e.key === "Enter") {
        if (pin.length >= 4) {
          handleSubmit();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pin, isLoading]); // Re-bind when pin or loading state changes to have fresh closure values

  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

  return (
    <div className={cn("min-h-screen w-screen flex items-center justify-center p-4 sm:p-6 overflow-hidden relative transition-colors duration-500", isDarkMode ? "bg-[#0f172a]" : "bg-slate-50")}>
      {/* Dynamic Background Elements */}
      <div
        className={cn("absolute inset-0 transition-opacity duration-500", isDarkMode ? "opacity-20" : "opacity-10")}
        style={{
          background: `radial-gradient(circle_at_50%_50%, ${primaryColor}66 0%, transparent 50%)`,
        }}
      />

      <motion.div initial={{ opacity: 0, scale: 0.9, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }} className='w-full max-w-[340px] relative z-10'>
        {/* Glassmorphic Container */}
        <div
          className={cn(
            "backdrop-blur-2xl p-6 sm:p-8 rounded-[2.5rem] border transition-all duration-500 flex flex-col items-center shadow-2xl",
            isDarkMode ? "bg-slate-900/40 border-white/10 shadow-black/50" : "bg-white/70 border-slate-200 shadow-slate-200/50",
          )}
        >
          {/* Brand/Logo Area */}
          <motion.div
            whileHover={{ rotate: 15 }}
            className='w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl font-black mb-5 shadow-lg'
            style={{
              background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
            }}
          >
            I
          </motion.div>

          <div className='text-center mb-6'>
            <h1 className={cn("text-xl sm:text-2xl font-bold tracking-tight flex items-center justify-center gap-2 transition-colors", isDarkMode ? "text-white" : "text-slate-900")}>
              <ShieldCheck size={22} style={{ color: primaryColor }} />
              Secure Terminal
            </h1>
            <p className={cn("mt-1 text-xs font-medium transition-colors", isDarkMode ? "text-slate-400" : "text-slate-500")}>Authentication required to proceed</p>
          </div>

          <form onSubmit={handleSubmit} className='w-full space-y-6'>
            {/* PIN Indicator dots */}
            <div className='flex justify-center gap-3 py-1'>
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={i < pin.length ? { scale: [1, 1.2, 1], backgroundColor: primaryColor } : { scale: 1, backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }}
                  className='w-2.5 h-2.5 rounded-full border border-black/5 dark:border-white/5 transition-colors duration-200'
                />
              ))}
            </div>

            <AnimatePresence mode='wait'>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className='bg-rose-500/10 border border-rose-500/20 py-2 px-4 rounded-xl flex items-center justify-center gap-2'
                >
                  <span className='text-rose-400 text-[10px] font-bold uppercase tracking-wider'>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Premium Keypad Grid */}
            <div className='grid grid-cols-3 gap-2 sm:gap-3'>
              {digits.map((num) => (
                <button
                  key={num}
                  type='button'
                  onClick={() => handleNumberClick(num)}
                  disabled={isLoading}
                  className={cn(
                    "h-14 sm:h-16 rounded-xl border text-xl font-semibold transition-all active:scale-95 outline-none focus:ring-2 focus:ring-sky-500/40 relative group overflow-hidden",
                    isDarkMode
                      ? "bg-white/5 border-white/5 text-white hover:bg-white/10 hover:border-white/20"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300",
                  )}
                >
                  <span className='relative z-10'>{num}</span>
                </button>
              ))}

              <button
                type='button'
                onClick={handleDelete}
                disabled={isLoading}
                className={cn(
                  "h-14 sm:h-16 rounded-xl border flex items-center justify-center transition-all active:scale-95",
                  isDarkMode
                    ? "bg-white/5 border-white/5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/5"
                    : "bg-slate-50 border-slate-200 text-slate-400 hover:text-rose-500 hover:bg-rose-50/50",
                )}
              >
                <Delete size={22} />
              </button>

              <button
                key='0'
                type='button'
                onClick={() => handleNumberClick("0")}
                disabled={isLoading}
                className={cn(
                  "h-14 sm:h-16 rounded-xl border text-xl font-semibold transition-all active:scale-95 outline-none focus:ring-2 focus:ring-sky-500/40",
                  isDarkMode ? "bg-white/5 border-white/5 text-white hover:bg-white/10 hover:border-white/20" : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300",
                )}
              >
                0
              </button>

              <button
                type='submit'
                disabled={isLoading || pin.length < 4}
                className={cn(
                  "h-14 sm:h-16 rounded-xl text-white font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all disabled:opacity-30 disabled:grayscale disabled:pointer-events-none hover:opacity-90",
                )}
                style={{
                  backgroundColor: primaryColor,
                  boxShadow: `0 10px 30px -5px ${primaryColor}66`,
                }}
              >
                {isLoading ? <Loader2 className='animate-spin' size={22} /> : <ArrowRight size={22} />}
              </button>
            </div>
          </form>

          {/* Device Context */}
          <div
            className={cn(
              "mt-8 pt-5 border-t w-full flex items-center justify-between text-[9px] uppercase tracking-[0.2em] font-bold transition-colors",
              isDarkMode ? "border-white/5 text-slate-500" : "border-slate-100 text-slate-400",
            )}
          >
            <div className='flex items-center gap-2'>
              <div className='w-1 h-1 rounded-full animate-pulse' style={{ backgroundColor: primaryColor, boxShadow: `0 0 8px ${primaryColor}` }} />
              SYSTEM ACTIVE
            </div>
            <div className='flex items-center gap-1.5'>
              <User size={10} />
              ID: TERMINAL_ALPHA
            </div>
          </div>
        </div>

        {/* Floating Credit */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 1 }}
          className={cn("text-center text-[9px] mt-6 font-medium uppercase tracking-widest transition-colors", isDarkMode ? "text-slate-400" : "text-slate-500")}
        >
          © 2026 INVENTORIMAN CORE • ENCRYPTED SESSION
        </motion.p>
      </motion.div>
    </div>
  );
};
