import React, { useState } from "react";
import { LayoutDashboard, ShoppingCart, Package, Users, Settings, Moon, Sun, ChevronLeft, ChevronRight, LogOut, History, BarChart2 } from "lucide-react";
import { motion } from "framer-motion";
import { useThemeStore } from "../../store/useThemeStore";
import { cn, getSidebarContrast } from "../../lib/utils";
import { Button } from "../ui/Button";

import { useAuthStore } from "../../store/useAuthStore";
import { SyncStatus } from "./SyncStatus";

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentPage, onPageChange }) => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const { isDarkMode, toggleDarkMode, sidebarColor } = useThemeStore();
  const { currentStaff, logout } = useAuthStore();

  const contrast = getSidebarContrast(sidebarColor, isDarkMode);
  const isLightSiderbar = contrast === "dark";

  const allMenuItems = [
    { id: "dashboard", icon: <LayoutDashboard size={20} />, label: "Dashboard", roles: ["owner", "admin", "manager"] },
    { id: "pos", icon: <ShoppingCart size={20} />, label: "POS", roles: ["owner", "admin", "manager", "cashier"] },
    { id: "sales-history", icon: <History size={20} />, label: "Sales History", roles: ["owner", "admin", "manager", "cashier"] },
    { id: "inventory", icon: <Package size={20} />, label: "Inventory", roles: ["owner", "admin", "manager"] },
    { id: "reports", icon: <BarChart2 size={20} />, label: "Reports", roles: ["owner", "admin", "manager"] },
    { id: "customers", icon: <Users size={20} />, label: "Customers", roles: ["owner", "admin", "manager", "cashier"] },
    { id: "settings", icon: <Settings size={20} />, label: "Settings", roles: ["owner", "admin", "manager"] },
  ];

  const menuItems = allMenuItems.filter((item) => item.roles.includes(currentStaff?.role || "cashier"));

  return (
    <div className='flex h-screen w-screen bg-gray-100 dark:bg-dark-bg text-slate-900 dark:text-slate-100 transition-colors duration-300 overflow-hidden font-sans'>
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarExpanded ? 260 : 80 }}
        style={{ backgroundColor: sidebarColor || undefined }}
        className={cn(
          "h-full border-r transition-colors flex flex-col relative z-20",
          !sidebarColor ? "bg-white dark:bg-dark-surface border-slate-200 dark:border-dark-border" : "border-white/10",
          isLightSiderbar ? "text-slate-900" : "text-white",
        )}
      >
        {/* Logo Section */}
        <div className={cn("h-20 flex items-center px-6 border-b overflow-hidden", !sidebarColor ? "border-slate-100 dark:border-dark-border" : "border-white/10")}>
          <div className='w-10 h-10 bg-primary rounded-lg flex-shrink-0 flex items-center justify-center text-white font-bold shadow-lg shadow-primary/20'>I</div>
          {isSidebarExpanded && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className='ml-3 font-bold text-xl tracking-tight font-display'>
              InventoriMan
            </motion.span>
          )}
        </div>

        {/* Navigation Items */}
        <nav className='flex-1 py-6 px-3 space-y-2 overflow-y-auto overflow-x-hidden'>
          {menuItems.map((item) => (
            <div
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={cn(
                "flex items-center p-3 rounded-xl cursor-pointer transition-all duration-200 group",
                currentPage === item.id
                  ? isLightSiderbar
                    ? "bg-primary/10 text-primary"
                    : "bg-white/20 text-white shadow-lg shadow-black/5"
                  : isLightSiderbar
                    ? "hover:bg-slate-100 text-slate-500"
                    : "hover:bg-white/10 text-white/70",
              )}
            >
              <div className='flex-shrink-0'>{item.icon}</div>
              {isSidebarExpanded && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className='ml-3 font-medium whitespace-nowrap'>
                  {item.label}
                </motion.span>
              )}
            </div>
          ))}
        </nav>

        {/* Sidebar Toggle */}
        <button
          onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
          className={cn(
            "absolute -right-3 top-24 w-6 h-6 border rounded-full flex items-center justify-center shadow-sm cursor-pointer transition-colors z-30",
            !sidebarColor
              ? "bg-white dark:bg-dark-surface border-slate-200 dark:border-dark-border text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
              : isLightSiderbar
                ? "bg-white border-slate-200 text-slate-900 hover:bg-slate-50"
                : "bg-slate-800 border-white/10 text-white hover:bg-slate-700",
          )}
        >
          {isSidebarExpanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>

        {/* Footer Info & Logout */}
        <div className={cn("p-4 border-t", !sidebarColor ? "border-slate-100 dark:border-dark-border bg-slate-50/50 dark:bg-slate-800/20" : "border-white/10 bg-black/5")}>
          <div className='flex items-center justify-between'>
            <div className='flex items-center'>
              <div className='w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0'>
                {currentStaff?.name.slice(0, 2).toUpperCase() || "AD"}
              </div>
              {isSidebarExpanded && (
                <div className='ml-3 overflow-hidden'>
                  <p className='text-sm font-semibold truncate'>{currentStaff?.name || "Staff Member"}</p>
                  <p className={cn("text-xs truncate uppercase font-bold tracking-tighter", isLightSiderbar ? "text-slate-500" : "text-white/60")}>{currentStaff?.role || "cashier"}</p>
                </div>
              )}
            </div>
            {isSidebarExpanded && (
              <Button
                variant='ghost'
                size='icon'
                onClick={() => {
                  if (confirm("Are you sure you want to logout?")) logout();
                }}
                className={cn("transition-colors", isLightSiderbar ? "text-slate-400 hover:text-danger" : "text-white/40 hover:text-white")}
              >
                <LogOut size={18} />
              </Button>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className='flex-1 flex flex-col h-full overflow-hidden relative'>
        {/* Top Header */}
        <header className='h-20 bg-white dark:bg-dark-surface border-b border-slate-200 dark:border-dark-border px-8 flex items-center justify-between flex-shrink-0'>
          <h2 className='text-xl font-bold font-display capitalize'>{currentPage}</h2>
          <div className='flex items-center space-x-4'>
            <SyncStatus />
            <Button variant='ghost' size='icon' onClick={toggleDarkMode} className='rounded-full'>
              {isDarkMode ? <Sun size={20} className='text-amber-500' /> : <Moon size={20} className='text-slate-600' />}
            </Button>
            <div className='w-px h-6 bg-slate-200 dark:bg-dark-border' />
            <div className='flex items-center space-x-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest'>
              <span className='w-2 h-2 bg-emerald-500 rounded-full animate-pulse' />
              <span>Session Active</span>
            </div>
          </div>
        </header>

        {/* Page Content Container */}
        <div className='flex-1 overflow-y-auto p-8 scrollbar-hide bg-gray-100 dark:bg-dark-bg/50'>{children}</div>
      </main>
    </div>
  );
};
