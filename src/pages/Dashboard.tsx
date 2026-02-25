import React, { useState, useEffect } from "react";
import { TrendingUp, Package, ShoppingCart, Users } from "lucide-react";
import { motion } from "framer-motion";
import { RecentOrders } from "../components/dashboard/RecentOrders";
import { ActivityFeed } from "../components/dashboard/ActivityFeed";
import { AnalyticsCharts } from "../components/dashboard/AnalyticsCharts";
import { DateRangeFilter } from "../components/dashboard/DateRangeFilter";
import { Skeleton } from "../components/ui/Skeleton";
import { useThemeStore } from "../store/useThemeStore";
import { dbService } from "../services/database";
import type { Range } from "react-date-range";

interface DashboardProps {
  onNavigate?: (page: string, params?: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { businessDetails } = useThemeStore();
  const currency = businessDetails.currency;
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    activeProducts: 0,
    totalCustomers: 0,
  });
  const [salesTrend, setSalesTrend] = useState<{ name: string; sales: number; orders: number }[]>([]);
  const [brandPerformance, setBrandPerformance] = useState<{ name: string; value: number; color: string }[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async (range?: Range) => {
    setIsLoading(true);
    try {
      const startDate = range?.startDate?.toISOString();
      const endDate = range?.endDate?.toISOString();

      // Parallel fetching with individual error handling logic if needed, but here we use Promise.allSettled for robustness?
      // Actually simple await is fine, we just want to ensure one failure doesn't break others.
      // But standard await Promise.all is cleaner to write.

      const [dashboardStats, trendData, brandData] = await Promise.all([
        dbService.getDashboardStats(startDate, endDate),
        dbService.getSalesTrend(startDate, endDate),
        dbService.getSalesByBrand(startDate, endDate),
      ]);

      setStats({
        totalRevenue: dashboardStats.totalRevenue,
        totalOrders: dashboardStats.totalOrders,
        activeProducts: dashboardStats.activeProducts,
        totalCustomers: dashboardStats.totalCustomers,
      });

      // Process Trend Data
      const formattedTrend = trendData.map((item: any) => ({
        name: new Date(item.date).toLocaleDateString("en-US", { weekday: "short" }), // Mon, Tue...
        sales: item.sales,
        orders: item.orders,
      }));
      setSalesTrend(formattedTrend);

      // Process Brand Data
      const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#10b981", "#f59e0b", "#3b82f6", "#ef4444"];
      const formattedBrandData = brandData.map((item: any, index: number) => ({
        name: item.brandName,
        value: item.revenue,
        color: COLORS[index % COLORS.length],
      }));
      setBrandPerformance(formattedBrandData);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const statsCards = [
    {
      label: "Total Revenue",
      value: isLoading ? "---" : `${currency} ${stats.totalRevenue.toLocaleString()}`,
      icon: <TrendingUp className='text-emerald-500' />,
    },
    {
      label: "Total Orders",
      value: isLoading ? "---" : stats.totalOrders.toString(),
      icon: <ShoppingCart className='text-primary' />,
    },
    {
      label: "Active Products",
      value: isLoading ? "---" : stats.activeProducts.toString(),
      icon: <Package className='text-amber-500' />,
    },
    {
      label: "Total Customers",
      value: isLoading ? "---" : stats.totalCustomers.toString(),
      icon: <Users className='text-indigo-500' />,
    },
  ];

  return (
    <div className='space-y-8 max-w-7xl mx-auto pb-12'>
      {/* Welcome Header */}
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight font-display text-slate-900 dark:text-white'>Dashboard Overview</h1>
          <p className='text-slate-500 dark:text-slate-400 mt-1'>Detailed analytics and real-time shop performance.</p>
        </div>
        <DateRangeFilter onRangeChange={loadDashboardData} />
      </div>

      {isLoading ? (
        <div className='space-y-8'>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className='h-32 w-full rounded-2xl' />
            ))}
          </div>
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            <Skeleton className='h-[400px] rounded-2xl' />
            <Skeleton className='h-[400px] rounded-2xl' />
          </div>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
            {statsCards.map((stat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className='bg-white dark:bg-dark-surface p-6 rounded-2xl border border-slate-200 dark:border-dark-border shadow-sm hover:shadow-md transition-shadow'
              >
                <div className='flex justify-between items-start'>
                  <div className='p-3 bg-slate-50 dark:bg-slate-800 rounded-xl'>{stat.icon}</div>
                </div>
                <div className='mt-4'>
                  <p className='text-sm text-slate-500 dark:text-slate-400 font-medium'>{stat.label}</p>
                  <h3 className='text-2xl font-bold mt-1 tracking-tight font-display text-slate-900 dark:text-white'>{stat.value}</h3>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Main Analytics Charts */}
          <AnalyticsCharts salesData={salesTrend} categoryData={brandPerformance} />

          {/* Orders and Activity */}
          <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
            <div className='lg:col-span-2'>
              <RecentOrders currency={currency} />
            </div>
            <div>
              <ActivityFeed onNavigate={onNavigate} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};
