import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AuditLogs } from "../components/settings/AuditLogs";
import { ConflictResolution } from "../components/settings/ConflictResolution";
import { FileText, Palette, Store, Users, Settings as SettingsIcon, Sliders, Key, Database as DatabaseSettingsIcon, Cloud, GitBranch } from "lucide-react";
import { cn } from "../lib/utils";
import { ThemeSettings } from "../components/settings/ThemeSettings";
import { BusinessSettings } from "../components/settings/BusinessSettings";
import { StaffSettings } from "../components/settings/StaffSettings";
import { SystemSettings } from "../components/settings/SystemSettings";
import { LicenseSettings } from "../components/settings/LicenseSettings";
import { DatabaseSettings } from "../components/settings/DatabaseSettings";
import { CloudSyncSettings } from "../components/settings/CloudSyncSettings";
import { usePermissions } from "../hooks/usePermissions";

type TabType = "theme" | "business" | "system" | "staff" | "license" | "logs" | "database" | "cloud" | "conflicts";

interface SettingsProps {
  initialTab?: string;
}

const allTabs: Array<{ id: TabType; label: string; icon: React.ReactNode; adminOnly: boolean }> = [
  { id: "theme", label: "Theme & Style", icon: <Palette size={18} />, adminOnly: false },
  { id: "business", label: "Shop Details", icon: <Store size={18} />, adminOnly: false },
  { id: "system", label: "System Preferences", icon: <Sliders size={18} />, adminOnly: false },
  { id: "staff", label: "Staff & Roles", icon: <Users size={18} />, adminOnly: true },
  { id: "cloud", label: "Cloud Sync", icon: <Cloud size={18} />, adminOnly: true },
  { id: "conflicts", label: "Sync Conflicts", icon: <GitBranch size={18} />, adminOnly: true },
  { id: "database", label: "Database", icon: <DatabaseSettingsIcon size={18} />, adminOnly: true },
  { id: "license", label: "License & System", icon: <Key size={18} />, adminOnly: true },
  { id: "logs", label: "Audit Logs", icon: <FileText size={18} />, adminOnly: true },
];

const resolvePermittedTab = (tab: string | undefined, canAccessAdminTabs: boolean): TabType => {
  const requestedTab = allTabs.find((item) => item.id === tab);

  if (requestedTab && (!requestedTab.adminOnly || canAccessAdminTabs)) {
    return requestedTab.id;
  }

  return "theme";
};

export const Settings: React.FC<SettingsProps> = ({ initialTab = "theme" }) => {
  const { isAdmin, isOwner } = usePermissions();
  const canAccessAdminTabs = isAdmin || isOwner;
  const tabs = allTabs.filter((tab) => !tab.adminOnly || canAccessAdminTabs);
  const [activeTab, setActiveTab] = useState<TabType>(() => resolvePermittedTab(initialTab, canAccessAdminTabs));
  const safeActiveTab = resolvePermittedTab(activeTab, canAccessAdminTabs);

  useEffect(() => {
    setActiveTab(resolvePermittedTab(initialTab, canAccessAdminTabs));
  }, [canAccessAdminTabs, initialTab]);

  return (
    <div className='max-w-5xl mx-auto space-y-8'>
      {/* ... header ... */}
      <div className='flex items-center gap-4 mb-4'>
        <div className='p-3 bg-primary/10 text-primary rounded-2xl'>
          <SettingsIcon size={24} />
        </div>
        <div>
          <h1 className='text-3xl font-bold font-display'>Global Settings</h1>
          <p className='text-slate-500'>Manage your application preferences and business information</p>
        </div>
      </div>

      <div className='flex flex-wrap gap-2 p-1 bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-2xl w-fit'>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(resolvePermittedTab(tab.id, canAccessAdminTabs))}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all",
              safeActiveTab === tab.id ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800",
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className='min-h-[400px]'>
        <AnimatePresence mode='wait'>
          <motion.div key={safeActiveTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            {safeActiveTab === "theme" && <ThemeSettings />}
            {safeActiveTab === "business" && <BusinessSettings />}
            {safeActiveTab === "system" && <SystemSettings />}
            {safeActiveTab === "staff" && <StaffSettings />}
            {safeActiveTab === "cloud" && <CloudSyncSettings />}
            {safeActiveTab === "conflicts" && <ConflictResolution />}
            {safeActiveTab === "database" && <DatabaseSettings />}
            {safeActiveTab === "license" && <LicenseSettings />}
            {safeActiveTab === "logs" && <AuditLogs />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
