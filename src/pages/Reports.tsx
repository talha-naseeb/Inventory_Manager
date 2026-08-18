import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Package, Users, BarChart2, FileText, Download, DollarSign, ShoppingBag, Award, ArrowDownRight, Printer } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { cn } from "../lib/utils";
import { dbService } from "../services/database";
import { useThemeStore } from "../store/useThemeStore";
import { Button } from "../components/ui/Button";
import { usePermissions } from "../hooks/usePermissions";

type TabType = "sales" | "brands" | "products" | "tax" | "staff" | "export";
type DatePreset = "today" | "week" | "month" | "year" | "all";

interface SalesStat {
  totalRevenue: number;
  totalOrders: number;
  totalDiscount: number;
  totalTax: number;
  avgOrderValue: number;
  cashSales: number;
  cardSales: number;
  bankSales: number;
}

interface BrandStat {
  brandName: string;
  orderCount: number;
  revenue: number;
}

interface ProductStat {
  productName: string;
  totalSold: number;
  revenue: number;
}

interface StaffStat {
  staffName: string;
  orderCount: number;
  revenue: number;
}

const PRESETS: { id: DatePreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
  { id: "year", label: "This Year" },
  { id: "all", label: "All Time" },
];

function getDateRange(preset: DatePreset): { start: string; end: string } | undefined {
  const now = new Date();
  switch (preset) {
    case "today":
      return { start: format(now, "yyyy-MM-dd 00:00:00"), end: format(now, "yyyy-MM-dd 23:59:59") };
    case "week":
      return { start: format(startOfWeek(now), "yyyy-MM-dd 00:00:00"), end: format(endOfWeek(now), "yyyy-MM-dd 23:59:59") };
    case "month":
      return { start: format(startOfMonth(now), "yyyy-MM-dd 00:00:00"), end: format(endOfMonth(now), "yyyy-MM-dd 23:59:59") };
    case "year":
      return { start: `${now.getFullYear()}-01-01 00:00:00`, end: `${now.getFullYear()}-12-31 23:59:59` };
    case "all":
      return undefined;
  }
}

function exportToCSV(data: any[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]).join(",");
  const rows = data.map((row) =>
    Object.values(row).map((v) => (typeof v === "string" && v.includes(",") ? `"${v}"` : v)).join(",")
  ).join("\n");
  const csv = `${headers}\n${rows}`;
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}_${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function printReport() {
  const style = document.createElement("style");
  style.id = "report-print-override";
  style.textContent = `@page { size: A4 portrait; margin: 15mm; } @media print { body * { visibility: hidden; } #printable-report, #printable-report * { visibility: visible; } #printable-report { position: fixed; left: 0; top: 0; width: 100%; padding: 0; } }`;
  document.head.appendChild(style);
  window.print();
  setTimeout(() => document.getElementById("report-print-override")?.remove(), 500);
}

export const Reports: React.FC = () => {
  const { businessDetails } = useThemeStore();
  const { isAdmin, isOwner } = usePermissions();
  const currency = businessDetails.currency;

  const [activeTab, setActiveTab] = useState<TabType>("sales");
  const [datePreset, setDatePreset] = useState<DatePreset>("month");
  const [isLoading, setIsLoading] = useState(true);

  const [salesStats, setSalesStats] = useState<SalesStat>({
    totalRevenue: 0,
    totalOrders: 0,
    totalDiscount: 0,
    totalTax: 0,
    avgOrderValue: 0,
    cashSales: 0,
    cardSales: 0,
    bankSales: 0,
  });
  const [brandStats, setBrandStats] = useState<BrandStat[]>([]);
  const [productStats, setProductStats] = useState<ProductStat[]>([]);
  const [staffStats, setStaffStats] = useState<StaffStat[]>([]);

  const loadReportData = useCallback(async () => {
    setIsLoading(true);
    const range = getDateRange(datePreset);
    const start = range?.start;
    const end = range?.end;
    const dateFilter = start && end ? "WHERE created_at BETWEEN ? AND ?" : "";
    const joinDateFilter = start && end ? "WHERE o.created_at BETWEEN ? AND ?" : "";
    const params = start && end ? [start, end] : [];

    try {
      const [sales, brands, products, staff] = await Promise.all([
        dbService.getOne<any>(
          `SELECT 
            COALESCE(SUM(total), 0) as totalRevenue,
            COUNT(*) as totalOrders,
            COALESCE(SUM(discount), 0) as totalDiscount,
            COALESCE(SUM(tax), 0) as totalTax,
            COALESCE(AVG(total), 0) as avgOrderValue,
            COALESCE(SUM(CASE WHEN payment_method='cash' THEN total ELSE 0 END), 0) as cashSales,
            COALESCE(SUM(CASE WHEN payment_method='card' THEN total ELSE 0 END), 0) as cardSales,
            COALESCE(SUM(CASE WHEN payment_method='bank' THEN total ELSE 0 END), 0) as bankSales
           FROM orders ${dateFilter}`,
          params,
        ),
        dbService.getSalesByBrand(start, end),
        dbService.getTopProducts(10, start, end),
        dbService.query<any>(
          `SELECT 
            s.name as staffName,
            COUNT(o.id) as orderCount,
            COALESCE(SUM(o.total), 0) as revenue
           FROM orders o
           LEFT JOIN staff s ON o.staff_id = s.id
           ${joinDateFilter}
           GROUP BY o.staff_id, s.name
           ORDER BY revenue DESC`,
          params,
        ),
      ]);

      setSalesStats(
        sales || {
          totalRevenue: 0,
          totalOrders: 0,
          totalDiscount: 0,
          totalTax: 0,
          avgOrderValue: 0,
          cashSales: 0,
          cardSales: 0,
          bankSales: 0,
        },
      );
      setBrandStats(brands as BrandStat[]);
      setProductStats(products as ProductStat[]);
      setStaffStats(staff as StaffStat[]);
    } catch (err) {
      console.error("Failed to load report data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [datePreset]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  const allTabs = [
    { id: "sales" as TabType, label: "Sales Summary", icon: <TrendingUp size={16} />, adminOnly: false },
    { id: "brands" as TabType, label: "Brand Analytics", icon: <BarChart2 size={16} />, adminOnly: false },
    { id: "products" as TabType, label: "Products", icon: <Package size={16} />, adminOnly: false },
    { id: "tax" as TabType, label: "Tax / NTN", icon: <FileText size={16} />, adminOnly: true },
    { id: "staff" as TabType, label: "Staff", icon: <Users size={16} />, adminOnly: true },
    { id: "export" as TabType, label: "Export", icon: <Download size={16} />, adminOnly: false },
  ];

  const tabs = allTabs.filter(tab => !tab.adminOnly || (isAdmin || isOwner));

  const StatCard = ({ label, value, sub, icon, color }: { label: string; value: string; sub?: string; icon: React.ReactNode; color: string }) => (
    <div className='bg-white dark:bg-dark-surface rounded-2xl border border-slate-200 dark:border-dark-border p-5 shadow-sm'>
      <div className='flex items-start justify-between'>
        <div className={`p-2.5 rounded-xl ${color}`}>{icon}</div>
      </div>
      <p className='text-sm text-slate-500 dark:text-slate-400 mt-4 font-medium'>{label}</p>
      <h3 className='text-2xl font-bold mt-1 text-slate-900 dark:text-white'>{value}</h3>
      {sub && <p className='text-xs text-slate-400 mt-1'>{sub}</p>}
    </div>
  );

  const maxBrandRevenue = Math.max(...brandStats.map((b) => b.revenue), 1);
  const maxProductSold = Math.max(...productStats.map((p) => p.totalSold), 1);

  return (
    <div className='space-y-6 max-w-7xl mx-auto pb-12'>
      {/* Header */}
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
        <div>
          <h1 className='text-3xl font-bold text-slate-900 dark:text-white'>Reports & Intelligence</h1>
          <p className='text-slate-500 dark:text-slate-400 mt-1'>Analytics and insights for your clothing business</p>
        </div>
        {/* Date Preset Filter */}
        <div className='flex gap-1 p-1 bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-xl'>
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => setDatePreset(p.id)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                datePreset === p.id ? "bg-primary text-white shadow" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className='flex gap-1 p-1 bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-2xl w-fit flex-wrap'>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all",
              activeTab === tab.id ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800",
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className='flex items-center justify-center h-64'>
          <div className='animate-spin rounded-full h-10 w-10 border-b-2 border-primary' />
        </div>
      ) : (
        <AnimatePresence mode='wait'>
          <motion.div key={activeTab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>
            {/* ── SALES SUMMARY ── */}
            {activeTab === "sales" && (
              <div className='space-y-6'>
                <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                  <StatCard
                    label='Total Revenue'
                    value={`${currency} ${salesStats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    icon={<DollarSign size={18} className='text-emerald-600' />}
                    color='bg-emerald-50 dark:bg-emerald-500/10'
                  />
                  <StatCard label='Total Orders' value={salesStats.totalOrders.toString()} icon={<ShoppingBag size={18} className='text-primary' />} color='bg-primary/10' />
                  <StatCard
                    label='Avg Order Value'
                    value={`${currency} ${salesStats.avgOrderValue.toFixed(2)}`}
                    icon={<TrendingUp size={18} className='text-indigo-600' />}
                    color='bg-indigo-50 dark:bg-indigo-500/10'
                  />
                  <StatCard
                    label='Total Discounts'
                    value={`${currency} ${salesStats.totalDiscount.toFixed(2)}`}
                    icon={<ArrowDownRight size={18} className='text-rose-600' />}
                    color='bg-rose-50 dark:bg-rose-500/10'
                  />
                </div>

                {/* Payment Method Breakdown */}
                <div className='bg-white dark:bg-dark-surface rounded-2xl border border-slate-200 dark:border-dark-border p-6'>
                  <h3 className='font-bold text-lg mb-4 text-slate-900 dark:text-white'>Payment Method Breakdown</h3>
                  <div className='grid grid-cols-3 gap-4'>
                    {[
                      { label: "Cash", value: salesStats.cashSales, color: "bg-emerald-500" },
                      { label: "Card", value: salesStats.cardSales, color: "bg-blue-500" },
                      { label: "Bank Transfer", value: salesStats.bankSales, color: "bg-purple-500" },
                    ].map((pm) => {
                      const total = salesStats.cashSales + salesStats.cardSales + salesStats.bankSales || 1;
                      const pct = ((pm.value / total) * 100).toFixed(1);
                      return (
                        <div key={pm.label} className='text-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl'>
                          <div className={`w-3 h-3 rounded-full ${pm.color} mx-auto mb-2`} />
                          <p className='text-xs text-slate-500 font-medium'>{pm.label}</p>
                          <p className='text-lg font-bold text-slate-900 dark:text-white mt-1'>
                            {currency} {pm.value.toFixed(2)}
                          </p>
                          <p className='text-xs text-slate-400'>{pct}%</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── BRAND ANALYTICS ── */}
            {activeTab === "brands" && (
              <div className='bg-white dark:bg-dark-surface rounded-2xl border border-slate-200 dark:border-dark-border p-6'>
                <div className='flex items-center justify-between mb-6'>
                  <h3 className='font-bold text-lg text-slate-900 dark:text-white'>Revenue by Brand</h3>
                  <Button variant='outline' size='sm' onClick={() => exportToCSV(brandStats, "brand_analytics")}>
                    <Download size={14} className='mr-1' /> Export CSV
                  </Button>
                </div>
                {brandStats.length === 0 ? (
                  <div className='text-center py-12 text-slate-400'>
                    <BarChart2 size={40} className='mx-auto mb-3 opacity-40' />
                    <p>No sales data for this period</p>
                  </div>
                ) : (
                  <div className='space-y-4'>
                    {brandStats.map((brand, i) => (
                      <div key={i} className='flex items-center gap-4'>
                        <div className='w-32 text-sm font-semibold text-slate-700 dark:text-slate-300 truncate'>{brand.brandName || "No Brand"}</div>
                        <div className='flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-8 overflow-hidden'>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(brand.revenue / maxBrandRevenue) * 100}%` }}
                            transition={{ duration: 0.6, delay: i * 0.05 }}
                            className='h-full bg-linear-to-r from-primary to-primary/70 rounded-full flex items-center px-3'
                          >
                            <span className='text-white text-xs font-bold whitespace-nowrap'>
                              {currency} {brand.revenue.toFixed(0)}
                            </span>
                          </motion.div>
                        </div>
                        <div className='w-20 text-right'>
                          <p className='text-sm font-bold text-slate-900 dark:text-white'>{brand.orderCount} orders</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── PRODUCT PERFORMANCE ── */}
            {activeTab === "products" && (
              <div className='bg-white dark:bg-dark-surface rounded-2xl border border-slate-200 dark:border-dark-border p-6'>
                <div className='flex items-center justify-between mb-6'>
                  <h3 className='font-bold text-lg text-slate-900 dark:text-white'>Top Selling Products</h3>
                  <Button variant='outline' size='sm' onClick={() => exportToCSV(productStats, "product_performance")}>
                    <Download size={14} className='mr-1' /> Export CSV
                  </Button>
                </div>
                {productStats.length === 0 ? (
                  <div className='text-center py-12 text-slate-400'>
                    <Package size={40} className='mx-auto mb-3 opacity-40' />
                    <p>No product sales data for this period</p>
                  </div>
                ) : (
                  <div className='space-y-3'>
                    {productStats.map((product, i) => (
                      <div key={i} className='flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors'>
                        <div
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-black",
                            i === 0 ? "bg-amber-100 text-amber-600" : i === 1 ? "bg-slate-100 text-slate-600" : i === 2 ? "bg-orange-100 text-orange-600" : "bg-slate-50 text-slate-400",
                          )}
                        >
                          {i < 3 ? <Award size={14} /> : i + 1}
                        </div>
                        <div className='flex-1'>
                          <p className='font-semibold text-sm text-slate-900 dark:text-white'>{product.productName}</p>
                          <div className='w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-1.5'>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${(product.totalSold / maxProductSold) * 100}%` }}
                              transition={{ duration: 0.5, delay: i * 0.04 }}
                              className='h-full bg-primary rounded-full'
                            />
                          </div>
                        </div>
                        <div className='text-right'>
                          <p className='text-sm font-bold text-slate-900 dark:text-white'>{product.totalSold} sold</p>
                          <p className='text-xs text-slate-500'>
                            {currency} {product.revenue.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── TAX / NTN REPORT ── */}
            {activeTab === "tax" && (
              <div className='space-y-6'>
                <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
                  <StatCard
                    label='Gross Sales'
                    value={`${currency} ${salesStats.totalRevenue.toFixed(2)}`}
                    icon={<DollarSign size={18} className='text-emerald-600' />}
                    color='bg-emerald-50 dark:bg-emerald-500/10'
                  />
                  <StatCard
                    label='Total Tax Collected'
                    value={`${currency} ${salesStats.totalTax.toFixed(2)}`}
                    icon={<FileText size={18} className='text-blue-600' />}
                    color='bg-blue-50 dark:bg-blue-500/10'
                  />
                  <StatCard
                    label='Net Revenue (After Tax)'
                    value={`${currency} ${(salesStats.totalRevenue - salesStats.totalTax).toFixed(2)}`}
                    icon={<TrendingUp size={18} className='text-indigo-600' />}
                    color='bg-indigo-50 dark:bg-indigo-500/10'
                  />
                </div>

                <div className='bg-white dark:bg-dark-surface rounded-2xl border border-slate-200 dark:border-dark-border p-6'>
                  <div className='flex items-center justify-between mb-4'>
                    <div>
                      <h3 className='font-bold text-lg text-slate-900 dark:text-white'>NTN Tax Report</h3>
                      <p className='text-sm text-slate-500 mt-0.5'>For Pakistan FBR compliance</p>
                    </div>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() =>
                        exportToCSV(
                          [
                            {
                              period: datePreset,
                              grossSales: salesStats.totalRevenue.toFixed(2),
                              totalDiscount: salesStats.totalDiscount.toFixed(2),
                              taxableAmount: (salesStats.totalRevenue - salesStats.totalDiscount).toFixed(2),
                              taxCollected: salesStats.totalTax.toFixed(2),
                              netRevenue: (salesStats.totalRevenue - salesStats.totalTax).toFixed(2),
                              totalOrders: salesStats.totalOrders,
                              generatedAt: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
                            },
                          ],
                          "tax_report_NTN",
                        )
                      }
                    >
                      <Download size={14} className='mr-1' /> Export CSV
                    </Button>
                  </div>
                  <table className='w-full text-sm'>
                    <tbody className='divide-y divide-slate-100 dark:divide-slate-800'>
                      {[
                        { label: "Gross Sales", value: `${currency} ${salesStats.totalRevenue.toFixed(2)}` },
                        { label: "Total Discounts Given", value: `- ${currency} ${salesStats.totalDiscount.toFixed(2)}` },
                        { label: "Taxable Amount", value: `${currency} ${(salesStats.totalRevenue - salesStats.totalDiscount).toFixed(2)}` },
                        { label: "Tax Collected (GST)", value: `${currency} ${salesStats.totalTax.toFixed(2)}`, highlight: true },
                        { label: "Net Revenue", value: `${currency} ${(salesStats.totalRevenue - salesStats.totalTax).toFixed(2)}`, bold: true },
                      ].map((row) => (
                        <tr key={row.label} className={cn("py-3", row.highlight && "bg-blue-50 dark:bg-blue-500/5")}>
                          <td className={cn("py-3 px-2 text-slate-600 dark:text-slate-400", row.bold && "font-bold text-slate-900 dark:text-white")}>{row.label}</td>
                          <td className={cn("py-3 px-2 text-right font-semibold text-slate-900 dark:text-white", row.highlight && "text-blue-600 dark:text-blue-400", row.bold && "font-bold text-lg")}>
                            {row.value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── STAFF ANALYTICS ── */}
            {activeTab === "staff" && (
              <div className='bg-white dark:bg-dark-surface rounded-2xl border border-slate-200 dark:border-dark-border p-6'>
                <div className='flex items-center justify-between mb-6'>
                  <h3 className='font-bold text-lg text-slate-900 dark:text-white'>Staff Performance</h3>
                  <Button variant='outline' size='sm' onClick={() => exportToCSV(staffStats, "staff_performance")}>
                    <Download size={14} className='mr-1' /> Export CSV
                  </Button>
                </div>
                {staffStats.length === 0 ? (
                  <div className='text-center py-12 text-slate-400'>
                    <Users size={40} className='mx-auto mb-3 opacity-40' />
                    <p>No staff sales data for this period</p>
                  </div>
                ) : (
                  <div className='space-y-3'>
                    {staffStats.map((staff, i) => (
                      <div key={i} className='flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50'>
                        <div
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center font-black text-sm",
                            i === 0 ? "bg-amber-100 text-amber-700" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300",
                          )}
                        >
                          {i === 0 ? "🏆" : i + 1}
                        </div>
                        <div className='flex-1'>
                          <p className='font-bold text-slate-900 dark:text-white'>{staff.staffName || "Unknown"}</p>
                          <p className='text-xs text-slate-500'>{staff.orderCount} orders processed</p>
                        </div>
                        <div className='text-right'>
                          <p className='font-bold text-slate-900 dark:text-white'>
                            {currency} {staff.revenue.toFixed(2)}
                          </p>
                          <p className='text-xs text-slate-500'>revenue</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── EXPORT ── */}
            {activeTab === "export" && (
              <div className='space-y-4'>
                {/* Print PDF button */}
                <div
                  onClick={printReport}
                  className='flex items-start gap-4 p-6 bg-white dark:bg-dark-surface rounded-2xl border border-slate-200 dark:border-dark-border hover:border-primary hover:shadow-md transition-all text-left group cursor-pointer'
                >
                  <div className='p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 group-hover:scale-110 transition-transform'>
                    <Printer size={24} className='text-rose-600' />
                  </div>
                  <div>
                    <h4 className='font-bold text-slate-900 dark:text-white'>Full Report PDF</h4>
                    <p className='text-sm text-slate-500 mt-1'>Print or save a complete report summary as PDF (A4)</p>
                    <p className='text-xs text-rose-600 font-semibold mt-2 flex items-center gap-1'>
                      <Printer size={12} /> Print / Save as PDF
                    </p>
                  </div>
                </div>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                {[
                  {
                    title: "Sales Summary",
                    desc: "Revenue, orders, discounts, tax breakdown",
                    icon: <TrendingUp size={24} className='text-emerald-600' />,
                    color: "bg-emerald-50 dark:bg-emerald-500/10",
                    action: () =>
                      exportToCSV(
                        [
                          {
                            period: datePreset,
                            totalRevenue: salesStats.totalRevenue.toFixed(2),
                            totalOrders: salesStats.totalOrders,
                            avgOrderValue: salesStats.avgOrderValue.toFixed(2),
                            totalDiscount: salesStats.totalDiscount.toFixed(2),
                            totalTax: salesStats.totalTax.toFixed(2),
                            cashSales: salesStats.cashSales.toFixed(2),
                            cardSales: salesStats.cardSales.toFixed(2),
                            bankSales: salesStats.bankSales.toFixed(2),
                          },
                        ],
                        "sales_summary",
                      ),
                  },
                  {
                    title: "Brand Analytics",
                    desc: "Revenue and orders per brand",
                    icon: <BarChart2 size={24} className='text-primary' />,
                    color: "bg-primary/10",
                    action: () => exportToCSV(brandStats, "brand_analytics"),
                  },
                  {
                    title: "Product Performance",
                    desc: "Top selling products by quantity and revenue",
                    icon: <Package size={24} className='text-amber-600' />,
                    color: "bg-amber-50 dark:bg-amber-500/10",
                    action: () => exportToCSV(productStats, "product_performance"),
                  },
                  {
                    title: "Tax / NTN Report",
                    desc: "FBR compliance report with tax breakdown",
                    icon: <FileText size={24} className='text-blue-600' />,
                    color: "bg-blue-50 dark:bg-blue-500/10",
                    action: () =>
                      exportToCSV(
                        [
                          {
                            period: datePreset,
                            grossSales: salesStats.totalRevenue.toFixed(2),
                            totalDiscount: salesStats.totalDiscount.toFixed(2),
                            taxableAmount: (salesStats.totalRevenue - salesStats.totalDiscount).toFixed(2),
                            taxCollected: salesStats.totalTax.toFixed(2),
                            netRevenue: (salesStats.totalRevenue - salesStats.totalTax).toFixed(2),
                            generatedAt: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
                          },
                        ],
                        "tax_report_NTN",
                      ),
                  },
                  {
                    title: "Staff Performance",
                    desc: "Orders and revenue per staff member",
                    icon: <Users size={24} className='text-indigo-600' />,
                    color: "bg-indigo-50 dark:bg-indigo-500/10",
                    action: () => exportToCSV(staffStats, "staff_performance"),
                  },
                ].map((item) => (
                  <button
                    key={item.title}
                    onClick={item.action}
                    className='flex items-start gap-4 p-6 bg-white dark:bg-dark-surface rounded-2xl border border-slate-200 dark:border-dark-border hover:border-primary hover:shadow-md transition-all text-left group'
                  >
                    <div className={`p-3 rounded-xl ${item.color} group-hover:scale-110 transition-transform`}>{item.icon}</div>
                    <div>
                      <h4 className='font-bold text-slate-900 dark:text-white'>{item.title}</h4>
                      <p className='text-sm text-slate-500 mt-1'>{item.desc}</p>
                      <p className='text-xs text-primary font-semibold mt-2 flex items-center gap-1'>
                        <Download size={12} /> Download CSV
                      </p>
                    </div>
                  </button>
                ))}
              </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Hidden printable report — shown only when printing */}
      <div id="printable-report" className="hidden print:block bg-white text-slate-900 p-8 text-sm font-sans">
        <div className="border-b-2 border-slate-900 pb-4 mb-6">
          <h1 className="text-2xl font-black text-slate-900">Business Report</h1>
          <p className="text-slate-500 text-sm mt-1">Period: {datePreset.charAt(0).toUpperCase() + datePreset.slice(1)} &nbsp;|&nbsp; Generated: {format(new Date(), "dd MMM yyyy, HH:mm")}</p>
        </div>

        {/* Sales summary */}
        <h2 className="text-lg font-bold mb-3">Sales Summary</h2>
        <table className="w-full text-sm mb-8 border border-slate-200">
          <tbody>
            {[
              ["Total Revenue", `${currency} ${salesStats.totalRevenue.toFixed(2)}`],
              ["Total Orders", salesStats.totalOrders.toString()],
              ["Average Order Value", `${currency} ${salesStats.avgOrderValue.toFixed(2)}`],
              ["Total Discounts", `${currency} ${salesStats.totalDiscount.toFixed(2)}`],
              ["Tax Collected", `${currency} ${salesStats.totalTax.toFixed(2)}`],
              ["Cash Sales", `${currency} ${salesStats.cashSales.toFixed(2)}`],
              ["Card Sales", `${currency} ${salesStats.cardSales.toFixed(2)}`],
              ["Bank Transfer Sales", `${currency} ${salesStats.bankSales.toFixed(2)}`],
            ].map(([label, value]) => (
              <tr key={label} className="border-b border-slate-100">
                <td className="py-2 px-3 text-slate-600 font-medium">{label}</td>
                <td className="py-2 px-3 text-right font-bold text-slate-900">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Top products */}
        {productStats.length > 0 && (
          <>
            <h2 className="text-lg font-bold mb-3">Top Products</h2>
            <table className="w-full text-sm mb-8 border border-slate-200">
              <thead>
                <tr className="bg-slate-100">
                  <th className="py-2 px-3 text-left font-bold">#</th>
                  <th className="py-2 px-3 text-left font-bold">Product</th>
                  <th className="py-2 px-3 text-right font-bold">Units Sold</th>
                  <th className="py-2 px-3 text-right font-bold">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {productStats.map((p, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-2 px-3 text-slate-500">{i + 1}</td>
                    <td className="py-2 px-3 font-medium">{p.productName}</td>
                    <td className="py-2 px-3 text-right">{p.totalSold}</td>
                    <td className="py-2 px-3 text-right font-bold">{currency} {p.revenue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* Staff performance */}
        {staffStats.length > 0 && (
          <>
            <h2 className="text-lg font-bold mb-3">Staff Performance</h2>
            <table className="w-full text-sm border border-slate-200">
              <thead>
                <tr className="bg-slate-100">
                  <th className="py-2 px-3 text-left font-bold">Staff</th>
                  <th className="py-2 px-3 text-right font-bold">Orders</th>
                  <th className="py-2 px-3 text-right font-bold">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {staffStats.map((s, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-2 px-3 font-medium">{s.staffName || "Unknown"}</td>
                    <td className="py-2 px-3 text-right">{s.orderCount}</td>
                    <td className="py-2 px-3 text-right font-bold">{currency} {s.revenue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
};
