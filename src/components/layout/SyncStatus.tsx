import React, { useEffect, useState } from "react";
import { Cloud, CloudOff, RefreshCw } from "lucide-react";
import { syncService } from "../../services/syncService";
import { cn } from "../../lib/utils";

export const SyncStatus: React.FC = () => {
  const [status, setStatus] = useState({ isOnline: navigator.onLine, pendingCount: 0 });

  useEffect(() => {
    const unsubscribe = syncService.subscribe((newStatus) => {
      setStatus(newStatus);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <div className='flex items-center gap-3 pr-4 border-r border-slate-200 dark:border-dark-border'>
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
          status.isOnline ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400",
        )}
      >
        {status.isOnline ? (
          <>
            <Cloud size={14} className='animate-pulse' />
            <span>Online</span>
          </>
        ) : (
          <>
            <CloudOff size={14} />
            <span>Offline</span>
          </>
        )}
      </div>

      {status.pendingCount > 0 && (
        <div className='flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest animate-in fade-in slide-in-from-right-2'>
          <RefreshCw size={12} className='animate-spin' />
          <span>{status.pendingCount} Syncing</span>
        </div>
      )}
    </div>
  );
};
