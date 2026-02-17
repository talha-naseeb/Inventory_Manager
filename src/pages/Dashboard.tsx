import React, { useState, useEffect } from "react";
import { TrendingUp, Package, ShoppingCart, Users, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { motion } from "framer-motion";
import { RecentOrders } from "../components/dashboard/RecentOrders";
import { ActivityFeed } from "../components/dashboard/ActivityFeed";
import { AnalyticsCharts } from "../components/dashboard/AnalyticsCharts";
import { DateRangeFilter } from "../components/dashboard/DateRangeFilter";
import { Skeleton } from "../components/ui/Skeleton";
import { useThemeStore } from "../store/useThemeStore";
import { MOCK_ORDERS, MOCK_ACTIVITY } from "../services/mockData";

export const Dashboard: React.FC = () => {
  const { businessDetails } = useThemeStore();
  const currency = businessDetails.currency;
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  const stats = [
    { label: "Total Revenue", value: isLoading ? "---" : `${currency} 154,230`, icon: <TrendingUp className='text-emerald-500' />, trend: "+12.5%", isPositive: true },
    { label: "Total Orders", value: isLoading ? "---" : "1,240", icon: <ShoppingCart className='text-primary' />, trend: "+5.2%", isPositive: true },
    { label: "Active Products", value: isLoading ? "---" : "450", icon: <Package className='text-amber-500' />, trend: "+2.1%", isPositive: true },
    { label: "Total Customers", value: isLoading ? "---" : "890", icon: <Users className='text-indigo-500' />, trend: "+8.4%", isPositive: true },
  ];

  if (isLoading) {
    return (
      <div className='space-y-8 max-w-7xl mx-auto'>
        <div>
          <Skeleton className='h-10 w-64' />
          <Skeleton className='h-4 w-96 mt-2' />
        </div>
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
    );
  }

  return (
    <div className='space-y-8 max-w-7xl mx-auto pb-12'>
      {/* Welcome Header */}
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight font-display text-slate-900 dark:text-white'>Dashboard Overview</h1>
          <p className='text-slate-500 dark:text-slate-400 mt-1'>Detailed analytics and real-time shop performance.</p>
        </div>
        <DateRangeFilter onRangeChange={(range) => console.log("New Range:", range)} />
      </div>

      {/* Stats Grid */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
        {stats.map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className='bg-white dark:bg-dark-surface p-6 rounded-2xl border border-slate-200 dark:border-dark-border shadow-sm hover:shadow-md transition-shadow'
          >
            <div className='flex justify-between items-start'>
              <div className='p-3 bg-slate-50 dark:bg-slate-800 rounded-xl'>{stat.icon}</div>
              <div
                className={`flex items-center text-xs font-bold px-2 py-1 rounded-full ${
                  stat.isPositive ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                }`}
              >
                {stat.trend}
                {stat.isPositive ? <ArrowUpRight size={12} className='ml-1' /> : <ArrowDownRight size={12} className='ml-1' />}
              </div>
            </div>
            <div className='mt-4'>
              <p className='text-sm text-slate-500 dark:text-slate-400 font-medium'>{stat.label}</p>
              <h3 className='text-2xl font-bold mt-1 tracking-tight font-display text-slate-900 dark:text-white'>{stat.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Analytics Charts */}
      <AnalyticsCharts />

      {/* Orders and Activity */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        <div className='lg:col-span-2'>
          <RecentOrders orders={MOCK_ORDERS} />
        </div>
        <div>
          <ActivityFeed activities={MOCK_ACTIVITY} />
        </div>
      </div>
    </div>
  );
};
