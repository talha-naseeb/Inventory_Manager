import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AuditLogs } from "../components/settings/AuditLogs";
import { FileText, Palette, Store, Users, Settings as SettingsIcon, Sliders, Key } from "lucide-react";
import { cn } from "../lib/utils";
import { ThemeSettings } from "../components/settings/ThemeSettings";
import { BusinessSettings } from "../components/settings/BusinessSettings";
import { StaffSettings } from "../components/settings/StaffSettings";
import { SystemSettings } from "../components/settings/SystemSettings";
import { LicenseSettings } from "../components/settings/LicenseSettings";

type TabType = "theme" | "business" | "staff" | "system" | "license" | "logs";

interface SettingsProps {
  initialTab?: string;
}

export const Settings: React.FC<SettingsProps> = ({ initialTab = "theme" }) => {
  const [activeTab, setActiveTab] = useState<TabType>((initialTab as TabType) || "theme");

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab as TabType);
    }
  }, [initialTab]);

  const tabs = [
    { id: "theme", label: "Theme & Style", icon: <Palette size={18} /> },
    { id: "business", label: "Shop Details", icon: <Store size={18} /> },
    { id: "system", label: "System Preferences", icon: <Sliders size={18} /> },
    { id: "staff", label: "Staff & Roles", icon: <Users size={18} /> },
    { id: "license", label: "License & System", icon: <Key size={18} /> },
    { id: "logs", label: "Audit Logs", icon: <FileText size={18} /> },
  ];

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
            onClick={() => setActiveTab(tab.id as TabType)}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all",
              activeTab === tab.id ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800",
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className='min-h-[400px]'>
        <AnimatePresence mode='wait'>
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            {activeTab === "theme" && <ThemeSettings />}
            {activeTab === "business" && <BusinessSettings />}
            {activeTab === "system" && <SystemSettings />}
            {activeTab === "staff" && <StaffSettings />}
            {activeTab === "license" && <LicenseSettings />}
            {activeTab === "logs" && <AuditLogs />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
