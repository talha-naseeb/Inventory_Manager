import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Delete, ArrowRight, Loader2, ShieldCheck, User } from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuthStore } from "../../store/useAuthStore";

import { useThemeStore } from "../../store/useThemeStore";

export const Login: React.FC = () => {
  const [pin, setPin] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [requiresOwnerEnrollment, setRequiresOwnerEnrollment] = useState(false);
  const [isCheckingSetup, setIsCheckingSetup] = useState(true);
  const { login, enrollOwner, isLoading, error } = useAuthStore();
  const { isDarkMode, primaryColor, accentColor } = useThemeStore();

  const handleNumberClick = useCallback((num: string) => {
    if (pin.length < 6) {
      setPin((prev) => prev + num);
    }
  }, [pin.length]);

  const handleDelete = useCallback(() => {
    setPin((prev) => prev.slice(0, -1));
  }, []);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (pin.length >= 4) {
      const success = await login(pin);
      if (!success) {
        setPin(""); // Reset on failure
      }
    }
  }, [login, pin]);

  const handleOwnerEnrollment = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (ownerName.trim().length < 2 || pin.length < 4 || pin !== confirmPin) return;
    await enrollOwner(ownerName.trim(), pin, confirmPin);
  }, [confirmPin, enrollOwner, ownerName, pin]);

  useEffect(() => {
    window.electronAPI.auth.getBootstrapState()
      .then((state) => setRequiresOwnerEnrollment(state.requiresOwnerEnrollment))
      .catch(() => setRequiresOwnerEnrollment(false))
      .finally(() => setIsCheckingSetup(false));
  }, []);

  // Auto-submit on 6 digits
  useEffect(() => {
    if (!requiresOwnerEnrollment && pin.length === 6) {
      handleSubmit();
    }
  }, [handleSubmit, pin.length, requiresOwnerEnrollment]);

  // Handle physical keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if currently loading
      if (isLoading) return;

      if (requiresOwnerEnrollment) return;
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
  }, [handleDelete, handleNumberClick, handleSubmit, isLoading, pin.length, requiresOwnerEnrollment]);

  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

  return (
    <div className={cn("min-h-screen w-screen flex items-center justify-center p-3 sm:p-6 overflow-x-hidden overflow-y-auto relative transition-colors duration-500", isDarkMode ? "bg-[#0f172a]" : "bg-slate-50")}>
      {/* Dynamic Background Elements */}
      <div
        className={cn("absolute inset-0 transition-opacity duration-500", isDarkMode ? "opacity-20" : "opacity-10")}
        style={{
          background: `radial-gradient(circle_at_50%_50%, ${primaryColor}66 0%, transparent 50%)`,
        }}
      />

      <motion.div initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.4, ease: "easeOut" }} className='w-full max-w-[380px] relative z-10'>
        {/* Glassmorphic Container */}
        <div
          className={cn(
            "backdrop-blur-2xl p-5 sm:p-8 rounded-3xl sm:rounded-[2.5rem] border transition-all duration-500 flex flex-col items-center shadow-2xl",
            isDarkMode ? "bg-slate-900/40 border-white/10 shadow-black/50" : "bg-white/70 border-slate-200 shadow-slate-200/50",
          )}
        >
          {/* Brand/Logo Area */}
          <motion.div
            whileHover={{ rotate: 15 }}
            className='w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-white text-xl sm:text-2xl font-black mb-3 sm:mb-5 shadow-lg'
            style={{
              background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
            }}
          >
            I
          </motion.div>

          <div className='text-center mb-4 sm:mb-6'>
            <h1 className={cn("text-xl sm:text-2xl font-bold tracking-tight flex items-center justify-center gap-2 transition-colors", isDarkMode ? "text-white" : "text-slate-900")}>
              <ShieldCheck size={22} style={{ color: primaryColor }} />
              {requiresOwnerEnrollment ? "Set up owner access" : "Secure Terminal"}
            </h1>
            <p className={cn("mt-1 text-xs font-medium transition-colors", isDarkMode ? "text-slate-400" : "text-slate-500")}>
              {requiresOwnerEnrollment ? "Create the first private PIN for this installation" : "Authentication required to proceed"}
            </p>
          </div>

          {isCheckingSetup ? (
            <div className='h-48 flex items-center justify-center' aria-label='Checking installation security'>
              <Loader2 className='animate-spin' size={26} style={{ color: primaryColor }} />
            </div>
          ) : requiresOwnerEnrollment ? (
            <form onSubmit={handleOwnerEnrollment} className='w-full space-y-4'>
              <label className='block space-y-1.5'>
                <span className={cn("text-[10px] font-bold uppercase tracking-wider", isDarkMode ? "text-slate-400" : "text-slate-500")}>Owner name</span>
                <input autoFocus autoComplete='name' value={ownerName} onChange={(event) => setOwnerName(event.target.value)} maxLength={80} className={cn("w-full h-11 rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-sky-500/30", isDarkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900")} placeholder='Business owner' />
              </label>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                <label className='block space-y-1.5'>
                  <span className={cn("text-[10px] font-bold uppercase tracking-wider", isDarkMode ? "text-slate-400" : "text-slate-500")}>New PIN</span>
                  <input inputMode='numeric' type='password' autoComplete='new-password' value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 8))} className={cn("w-full h-11 rounded-xl border px-3 tracking-[0.3em] outline-none focus:ring-2 focus:ring-sky-500/30", isDarkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900")} placeholder='4–8 digits' />
                </label>
                <label className='block space-y-1.5'>
                  <span className={cn("text-[10px] font-bold uppercase tracking-wider", isDarkMode ? "text-slate-400" : "text-slate-500")}>Confirm PIN</span>
                  <input inputMode='numeric' type='password' autoComplete='new-password' value={confirmPin} onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, "").slice(0, 8))} className={cn("w-full h-11 rounded-xl border px-3 tracking-[0.3em] outline-none focus:ring-2 focus:ring-sky-500/30", isDarkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900")} placeholder='Repeat PIN' />
                </label>
              </div>
              {confirmPin && pin !== confirmPin && <p className='text-xs text-rose-500'>PINs do not match.</p>}
              {error && <p className='text-xs text-rose-500' role='alert'>{error}</p>}
              <button type='submit' disabled={isLoading || ownerName.trim().length < 2 || pin.length < 4 || pin !== confirmPin} className='w-full h-11 rounded-xl text-white text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2' style={{ backgroundColor: primaryColor }}>
                {isLoading ? <Loader2 className='animate-spin' size={18} /> : <><ShieldCheck size={18} /> Create secure owner</>}
              </button>
              <p className={cn("text-[10px] leading-relaxed", isDarkMode ? "text-slate-500" : "text-slate-400")}>There is no shared default PIN. Keep this PIN private; it controls staff, backups, and system settings.</p>
            </form>
          ) : (
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
          )}

          {/* Device Context */}
          <div
            className={cn(
              "mt-4 pt-3 sm:mt-8 sm:pt-5 border-t w-full flex items-center justify-between text-[9px] uppercase tracking-[0.2em] font-bold transition-colors",
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
          className={cn("text-center text-[9px] mt-3 sm:mt-6 font-medium uppercase tracking-widest transition-colors", isDarkMode ? "text-slate-400" : "text-slate-500")}
        >
          © 2026 INVENTORIMAN CORE • ENCRYPTED SESSION
        </motion.p>
      </motion.div>
    </div>
  );
};
