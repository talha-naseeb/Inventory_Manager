import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Key, CheckCircle, AlertTriangle, XCircle, RefreshCw, Copy, ExternalLink, Monitor, Cpu, HardDrive, FileText } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/Button";

interface LicenseStatus {
  status: "active" | "grace" | "expired";
  daysLeft: number | null;
  license: {
    key: string;
    plan: string;
    activated_at: string | null;
    expires_at: string | null;
  } | null;
}

interface SystemInfo {
  appVersion: string;
  electronVersion: string;
  nodeVersion: string;
  platform: string;
  arch: string;
  logFilePath: string;
  userDataPath: string;
}

type SubTab = "license" | "system";

export const LicenseSettings: React.FC = () => {
  const [subTab, setSubTab] = useState<SubTab>("license");
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [licenseKey, setLicenseKey] = useState("");
  const [isActivating, setIsActivating] = useState(false);
  const [activationMsg, setActivationMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (window.electronAPI) {
        const [status, info] = await Promise.all([window.electronAPI.invoke("license:getStatus"), window.electronAPI.invoke("system:getInfo")]);
        setLicenseStatus(status);
        setSystemInfo(info);
      }
    } catch (err) {
      console.error("Failed to load license/system info:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivate = async () => {
    if (!licenseKey.trim()) return;
    setIsActivating(true);
    setActivationMsg(null);
    try {
      const result = await window.electronAPI?.invoke("license:activate", licenseKey.trim());
      if (result?.success) {
        setActivationMsg({ type: "success", text: `License activated! Expires: ${new Date(result.expiresAt).toLocaleDateString()}` });
        setLicenseKey("");
        await loadData();
      } else {
        setActivationMsg({ type: "error", text: result?.error || "Activation failed." });
      }
    } catch {
      setActivationMsg({ type: "error", text: "Could not connect to license server." });
    } finally {
      setIsActivating(false);
    }
  };

  const handleOpenLog = () => {
    window.electronAPI?.invoke("system:openLogFile");
  };

  const handleCopySystemInfo = () => {
    if (!systemInfo) return;
    const text = Object.entries(systemInfo)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const config = {
      active: { icon: <CheckCircle size={14} />, label: "Active", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" },
      grace: { icon: <AlertTriangle size={14} />, label: "Grace Period", cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400" },
      expired: { icon: <XCircle size={14} />, label: "Expired", cls: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400" },
    }[status] || { icon: null, label: status, cls: "bg-slate-100 text-slate-600" };

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${config.cls}`}>
        {config.icon} {config.label}
      </span>
    );
  };

  return (
    <div className='space-y-6'>
      {/* Sub-tabs */}
      <div className='flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit'>
        {(["license", "system"] as SubTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className={cn(
              "px-5 py-2 rounded-lg text-sm font-bold transition-all capitalize",
              subTab === t ? "bg-white dark:bg-dark-surface shadow text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700",
            )}
          >
            {t === "license" ? "License & Plan" : "System Info"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className='flex items-center justify-center h-40'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary' />
        </div>
      ) : (
        <motion.div key={subTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          {/* ── LICENSE TAB ── */}
          {subTab === "license" && (
            <div className='space-y-5'>
              {/* Current Status Card */}
              <div className='bg-white dark:bg-dark-surface rounded-2xl border border-slate-200 dark:border-dark-border p-6'>
                <div className='flex items-start justify-between mb-4'>
                  <div>
                    <h3 className='font-bold text-slate-900 dark:text-white'>Current License</h3>
                    <p className='text-sm text-slate-500 mt-0.5'>Your subscription details</p>
                  </div>
                  {licenseStatus && <StatusBadge status={licenseStatus.status} />}
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <div className='bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4'>
                    <p className='text-xs text-slate-500 font-medium mb-1'>License Key</p>
                    <p className='font-mono text-sm text-slate-800 dark:text-slate-200 break-all'>{licenseStatus?.license?.key || "—"}</p>
                  </div>
                  <div className='bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4'>
                    <p className='text-xs text-slate-500 font-medium mb-1'>Plan</p>
                    <p className='font-bold text-slate-800 dark:text-slate-200 capitalize'>{licenseStatus?.license?.plan || "—"}</p>
                  </div>
                  <div className='bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4'>
                    <p className='text-xs text-slate-500 font-medium mb-1'>Activated</p>
                    <p className='text-sm text-slate-800 dark:text-slate-200'>{licenseStatus?.license?.activated_at ? new Date(licenseStatus.license.activated_at).toLocaleDateString() : "—"}</p>
                  </div>
                  <div className='bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4'>
                    <p className='text-xs text-slate-500 font-medium mb-1'>Expires</p>
                    <p className='text-sm text-slate-800 dark:text-slate-200'>
                      {licenseStatus?.license?.expires_at ? new Date(licenseStatus.license.expires_at).toLocaleDateString() : "Perpetual ♾️"}
                    </p>
                  </div>
                </div>

                {licenseStatus?.status === "grace" && (
                  <div className='mt-4 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400'>
                    <AlertTriangle size={16} />
                    <span>
                      {licenseStatus.daysLeft} day{licenseStatus.daysLeft !== 1 ? "s" : ""} of grace period remaining. Renew now to avoid lockout.
                    </span>
                  </div>
                )}
              </div>

              {/* Activate New Key */}
              <div className='bg-white dark:bg-dark-surface rounded-2xl border border-slate-200 dark:border-dark-border p-6'>
                <div className='flex items-center gap-3 mb-4'>
                  <div className='p-2 bg-primary/10 rounded-xl'>
                    <Key size={18} className='text-primary' />
                  </div>
                  <div>
                    <h3 className='font-bold text-slate-900 dark:text-white'>Activate License</h3>
                    <p className='text-xs text-slate-500'>Enter a new license key to activate or renew</p>
                  </div>
                </div>

                <div className='flex gap-3'>
                  <input
                    type='text'
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                    placeholder='XXXX-XXXX-XXXX-XXXX'
                    className='flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-slate-800 font-mono text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50'
                    onKeyDown={(e) => e.key === "Enter" && handleActivate()}
                  />
                  <Button onClick={handleActivate} disabled={isActivating || !licenseKey.trim()}>
                    {isActivating ? <RefreshCw size={16} className='animate-spin' /> : "Activate"}
                  </Button>
                </div>

                {activationMsg && (
                  <motion.p
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn("mt-3 text-sm font-medium", activationMsg.type === "success" ? "text-emerald-600" : "text-rose-600")}
                  >
                    {activationMsg.type === "success" ? "✅" : "❌"} {activationMsg.text}
                  </motion.p>
                )}
              </div>
            </div>
          )}

          {/* ── SYSTEM INFO TAB ── */}
          {subTab === "system" && systemInfo && (
            <div className='space-y-5'>
              <div className='bg-white dark:bg-dark-surface rounded-2xl border border-slate-200 dark:border-dark-border p-6'>
                <div className='flex items-center justify-between mb-5'>
                  <h3 className='font-bold text-slate-900 dark:text-white'>System Information</h3>
                  <Button variant='outline' size='sm' onClick={handleCopySystemInfo}>
                    <Copy size={14} className='mr-1.5' />
                    {copied ? "Copied!" : "Copy for Support"}
                  </Button>
                </div>

                <div className='space-y-3'>
                  {[
                    { icon: <Monitor size={16} />, label: "App Version", value: `v${systemInfo.appVersion}` },
                    { icon: <Cpu size={16} />, label: "Electron", value: `v${systemInfo.electronVersion}` },
                    { icon: <Cpu size={16} />, label: "Node.js", value: `v${systemInfo.nodeVersion}` },
                    { icon: <Monitor size={16} />, label: "Platform", value: systemInfo.platform },
                    { icon: <Cpu size={16} />, label: "Architecture", value: systemInfo.arch },
                    { icon: <HardDrive size={16} />, label: "User Data", value: systemInfo.userDataPath },
                  ].map((row) => (
                    <div key={row.label} className='flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl'>
                      <div className='text-slate-400'>{row.icon}</div>
                      <span className='text-sm text-slate-500 w-32 shrink-0'>{row.label}</span>
                      <span className='text-sm font-semibold text-slate-800 dark:text-slate-200 font-mono truncate'>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Log File */}
              <div className='bg-white dark:bg-dark-surface rounded-2xl border border-slate-200 dark:border-dark-border p-6'>
                <div className='flex items-center gap-3 mb-4'>
                  <div className='p-2 bg-slate-100 dark:bg-slate-800 rounded-xl'>
                    <FileText size={18} className='text-slate-600 dark:text-slate-400' />
                  </div>
                  <div>
                    <h3 className='font-bold text-slate-900 dark:text-white'>Crash Logs</h3>
                    <p className='text-xs text-slate-500'>Application logs for debugging and support</p>
                  </div>
                </div>

                <div className='bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 mb-4'>
                  <p className='text-xs text-slate-500 font-medium mb-1'>Log File Location</p>
                  <p className='font-mono text-xs text-slate-700 dark:text-slate-300 break-all'>{systemInfo.logFilePath}</p>
                </div>

                <Button variant='outline' onClick={handleOpenLog} className='w-full justify-center'>
                  <ExternalLink size={14} className='mr-2' />
                  Open Log File in Notepad
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};
