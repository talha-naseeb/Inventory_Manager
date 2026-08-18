import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, RefreshCw } from "lucide-react";

interface UpdateInfo {
  version: string;
}

type UpdateState = "idle" | "available" | "downloading" | "ready";

export const UpdateBanner: React.FC = () => {
  const [state, setState] = useState<UpdateState>("idle");
  const [version, setVersion] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!window.electronAPI?.updates) return;

    const onUpdateAvailable = (info: UpdateInfo) => {
      setVersion(info.version);
      setState("available");
      setDismissed(false);
    };

    const onUpdateProgress = (data: { percent: number }) => {
      setState("downloading");
      setProgress(data.percent);
    };

    const onUpdateDownloaded = (info: UpdateInfo) => {
      setVersion(info.version);
      setState("ready");
    };

    const unsubscribeAvailable = window.electronAPI.updates.onAvailable(onUpdateAvailable);
    const unsubscribeProgress = window.electronAPI.updates.onProgress(onUpdateProgress);
    const unsubscribeDownloaded = window.electronAPI.updates.onDownloaded(onUpdateDownloaded);

    return () => {
      unsubscribeAvailable();
      unsubscribeProgress();
      unsubscribeDownloaded();
    };
  }, []);

  const handleInstall = () => {
    void window.electronAPI?.updates.install();
  };

  if (dismissed || state === "idle") return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -60, opacity: 0 }}
        className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 text-sm font-semibold shadow-lg ${
          state === "ready" ? "bg-emerald-600 text-white" : state === "downloading" ? "bg-blue-600 text-white" : "bg-indigo-600 text-white"
        }`}
      >
        <div className='flex items-center gap-3'>
          {state === "available" && (
            <>
              <Download size={16} />
              <span>Update v{version} available — downloading...</span>
            </>
          )}
          {state === "downloading" && (
            <>
              <div className='w-24 bg-white/30 rounded-full h-1.5'>
                <div className='bg-white h-1.5 rounded-full transition-all' style={{ width: `${progress}%` }} />
              </div>
              <span>Downloading update... {progress}%</span>
            </>
          )}
          {state === "ready" && (
            <>
              <RefreshCw size={16} />
              <span>🎉 Update v{version} ready — restart to install</span>
            </>
          )}
        </div>

        <div className='flex items-center gap-3'>
          {state === "ready" && (
            <button onClick={handleInstall} className='bg-white text-emerald-700 px-4 py-1 rounded-lg text-xs font-bold hover:bg-emerald-50 transition-colors'>
              Restart & Install
            </button>
          )}
          <button type='button' aria-label='Dismiss update notification' onClick={() => setDismissed(true)} className='opacity-70 hover:opacity-100 transition-opacity'>
            <X size={16} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
