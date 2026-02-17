import React, { useState } from "react";
import { LayoutDashboard, ShoppingCart, Package, Users, Settings, Moon, Sun, ChevronLeft, ChevronRight, LogOut, History } from "lucide-react";
import { motion } from "framer-motion";
import { useThemeStore } from "../../store/useThemeStore";
import { cn } from "../../lib/utils";
import { Button } from "../ui/Button";

interface LayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
  currentPage: string;
  onPageChange: (page: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, onLogout, currentPage, onPageChange }) => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const { isDarkMode, toggleDarkMode, sidebarColor } = useThemeStore();

  const menuItems = [
    { id: "dashboard", icon: <LayoutDashboard size={20} />, label: "Dashboard" },
    { id: "pos", icon: <ShoppingCart size={20} />, label: "POS" },
    { id: "sales-history", icon: <History size={20} />, label: "Sales History" },
    { id: "inventory", icon: <Package size={20} />, label: "Inventory" },
    { id: "customers", icon: <Users size={20} />, label: "Customers" },
    { id: "settings", icon: <Settings size={20} />, label: "Settings" },
  ];

  return (
    <div className='flex h-screen w-screen bg-gray-100 dark:bg-dark-bg text-slate-900 dark:text-slate-100 transition-colors duration-300 overflow-hidden font-sans'>
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarExpanded ? 260 : 80 }}
        style={{ backgroundColor: sidebarColor || undefined }}
        className={cn("h-full bg-white dark:bg-dark-surface border-r border-slate-200 dark:border-dark-border flex flex-col relative z-20", !sidebarColor && "bg-white dark:bg-dark-surface")}
      >
        {/* Logo Section */}
        <div className='h-20 flex items-center px-6 border-b border-slate-100 dark:border-dark-border overflow-hidden'>
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
                currentPage === item.id ? "bg-primary/10 text-primary dark:bg-primary/20" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400",
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
          className='absolute -right-3 top-24 w-6 h-6 bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-full flex items-center justify-center shadow-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors z-30'
        >
          {isSidebarExpanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>

        {/* Footer Info & Logout */}
        <div className='p-4 border-t border-slate-100 dark:border-dark-border bg-slate-50/50 dark:bg-slate-800/20'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center'>
              <div className='w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0'>AD</div>
              {isSidebarExpanded && (
                <div className='ml-3 overflow-hidden'>
                  <p className='text-sm font-semibold truncate'>Admin User</p>
                  <p className='text-xs text-slate-500 truncate'>admin@shop.com</p>
                </div>
              )}
            </div>
            {isSidebarExpanded && (
              <Button variant='ghost' size='icon' onClick={onLogout} className='text-slate-400 hover:text-danger'>
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
            <Button variant='ghost' size='icon' onClick={toggleDarkMode} className='rounded-full'>
              {isDarkMode ? <Sun size={20} className='text-amber-500' /> : <Moon size={20} className='text-slate-600' />}
            </Button>
            <div className='w-px h-6 bg-slate-200 dark:bg-dark-border' />
            <div className='flex items-center space-x-2 bg-accent/10 text-accent px-3 py-1.5 rounded-full text-sm font-medium'>
              <span className='w-2 h-2 bg-accent rounded-full animate-pulse' />
              <span>Shop Open</span>
            </div>
          </div>
        </header>

        {/* Page Content Container */}
        <div className='flex-1 overflow-y-auto p-8 scrollbar-hide bg-gray-100 dark:bg-dark-bg/50'>{children}</div>
      </main>
    </div>
  );
};
