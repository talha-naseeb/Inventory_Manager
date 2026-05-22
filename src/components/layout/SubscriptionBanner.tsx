import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, XCircle, X } from "lucide-react";

interface LicenseStatus {
  status: "active" | "grace" | "expired";
  daysLeft: number | null;
  license: {
    key: string;
    plan: string;
    expires_at: string | null;
  } | null;
}

export const SubscriptionBanner: React.FC = () => {
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const checkLicense = async () => {
      if (!window.electronAPI) return;
      try {
        const status = await window.electronAPI.invoke("license:getStatus");
        setLicenseStatus(status);
      } catch (err) {
        console.error("License check failed:", err);
      }
    };
    checkLicense();
  }, []);

  if (!licenseStatus || licenseStatus.status === "active" || dismissed) return null;

  const isGrace = licenseStatus.status === "grace";

  // Full-screen expired overlay
  if (!isGrace) {
    return (
      <div className='fixed inset-0 z-100 bg-black/80 backdrop-blur-sm flex items-center justify-center'>
        <div className='bg-white dark:bg-dark-surface rounded-3xl p-10 max-w-md w-full text-center shadow-2xl mx-4'>
          <div className='w-20 h-20 bg-rose-100 dark:bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-6'>
            <XCircle size={40} className='text-rose-600' />
          </div>
          <h2 className='text-2xl font-black text-slate-900 dark:text-white mb-3'>Subscription Expired</h2>
          <p className='text-slate-500 dark:text-slate-400 mb-6'>Your InventoriMan license has expired. Please renew your subscription to continue using the app.</p>
          <div className='bg-slate-50 dark:bg-slate-800 rounded-xl p-4 mb-6 text-left'>
            <p className='text-xs text-slate-500 font-medium'>Current Key</p>
            <p className='font-mono text-sm text-slate-700 dark:text-slate-300 mt-1'>{licenseStatus.license?.key || "—"}</p>
          </div>
          <p className='text-sm text-slate-500'>Contact support to renew your license and restore full access.</p>
        </div>
      </div>
    );
  }

  // Grace period banner
  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -60, opacity: 0 }}
        className='fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 bg-amber-500 text-white text-sm font-semibold shadow-lg'
      >
        <div className='flex items-center gap-3'>
          <AlertTriangle size={16} />
          <span>
            ⚠️ Your subscription expired.{" "}
            {licenseStatus.daysLeft !== null ? `${licenseStatus.daysLeft} day${licenseStatus.daysLeft !== 1 ? "s" : ""} of grace period remaining.` : "Grace period active."} Go to Settings → License
            to renew.
          </span>
        </div>
        <button onClick={() => setDismissed(true)} className='opacity-70 hover:opacity-100 transition-opacity ml-4'>
          <X size={16} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
};
