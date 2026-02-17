import React, { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Mail, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";

interface LoginProps {
  onLogin: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      onLogin();
    }, 1500);
  };

  return (
    <div className='min-h-screen w-screen bg-soft-gray dark:bg-dark-bg flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--color-primary)_0%,_transparent_25%)]'>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className='w-full max-w-md'>
        {/* Logo and Welcome */}
        <div className='text-center mb-10'>
          <div className='w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white text-3xl font-extrabold mx-auto mb-6 shadow-xl shadow-primary/20'>I</div>
          <h1 className='text-3xl font-bold tracking-tight text-slate-900 dark:text-white'>Welcome Back</h1>
          <p className='text-slate-500 dark:text-slate-400 mt-2'>Sign in to manage your shop's inventory</p>
        </div>

        {/* Login Card */}
        <div className='bg-white dark:bg-dark-surface p-8 rounded-[2rem] border border-slate-200 dark:border-dark-border shadow-2xl shadow-slate-200/50 dark:shadow-none'>
          <form onSubmit={handleSubmit} className='space-y-6'>
            <div className='space-y-4'>
              <div className='relative group'>
                <Mail className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors' size={20} />
                <input
                  type='email'
                  placeholder='Email address'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className='w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm'
                  required
                />
              </div>

              <div className='relative group'>
                <Lock className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors' size={20} />
                <input
                  type='password'
                  placeholder='Password'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className='w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm'
                  required
                />
              </div>
            </div>

            <div className='flex items-center justify-between text-sm'>
              <label className='flex items-center space-x-2 cursor-pointer group'>
                <input type='checkbox' className='w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary h-4 w-4' />
                <span className='text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors'>Remember me</span>
              </label>
              <a href='#' className='text-primary font-semibold hover:underline'>
                Forgot password?
              </a>
            </div>

            <button
              type='submit'
              disabled={isLoading}
              className={cn(
                "w-full py-4 bg-primary text-white rounded-2xl font-bold flex items-center justify-center space-x-2 shadow-lg shadow-primary/30 active:scale-[0.98] transition-all",
                isLoading ? "opacity-80 cursor-not-allowed" : "hover:bg-primary/90",
              )}
            >
              {isLoading ? (
                <Loader2 className='animate-spin' size={20} />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          {/* Social Auth Placeholder */}
          <div className='mt-8 pt-8 border-t border-slate-100 dark:border-dark-border text-center'>
            <p className='text-sm text-slate-500 dark:text-slate-400'>
              Don't have an account?{" "}
              <a href='#' className='text-primary font-semibold hover:underline'>
                Register your shop
              </a>
            </p>
          </div>
        </div>

        {/* Bottom Footer Info */}
        <p className='text-center text-xs text-slate-400 mt-10'>
          © 2026 InventoriMan POS. All rights reserved. <br />
          Securely encrypted & powered by CloudSync.
        </p>
      </motion.div>
    </div>
  );
};
