import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell } from "recharts";
import { useThemeStore } from "../../store/useThemeStore";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";

interface AnalyticsChartsProps {
  salesData: { name: string; sales: number; orders: number }[];
  categoryData: { name: string; value: number; color: string }[];
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ salesData, categoryData }) => {
  const { businessDetails } = useThemeStore();
  const currency = businessDetails.currency;

  return (
    <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
      {/* Sales Trend Chart */}
      <Card className='border-none shadow-sm dark:bg-dark-surface overflow-hidden'>
        <CardHeader className='pb-2'>
          <div className='flex items-center justify-between'>
            <CardTitle className='text-base font-bold text-slate-900 dark:text-white'>Sales Trend</CardTitle>
            <div className='flex items-center gap-2'>
              <div className='flex items-center gap-1.5'>
                <div className='w-2 h-2 rounded-full bg-primary' />
                <span className='text-[10px] font-bold text-slate-400 uppercase'>Revenue</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className='p-0 h-[300px]'>
          <ResponsiveContainer width='100%' height='100%'>
            <AreaChart data={salesData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id='colorSales' x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='5%' stopColor='#6366f1' stopOpacity={0.1} />
                  <stop offset='95%' stopColor='#6366f1' stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='#e2e8f0' opacity={0.5} />
              <XAxis dataKey='name' axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: "#94a3b8" }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: "#94a3b8" }} tickFormatter={(value) => `${currency} ${value / 1000}k`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "none",
                  borderRadius: "12px",
                  boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                }}
                itemStyle={{ color: "#818cf8" }}
                formatter={(value: any) => [`${currency} ${value.toLocaleString()}`, "Revenue"]}
              />
              <Area type='monotone' dataKey='sales' stroke='#6366f1' strokeWidth={3} fillOpacity={1} fill='url(#colorSales)' />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Category Performance Chart */}
      <Card className='border-none shadow-sm dark:bg-dark-surface overflow-hidden'>
        <CardHeader className='pb-2'>
          <CardTitle className='text-base font-bold text-slate-900 dark:text-white'>Brand Performance</CardTitle>
        </CardHeader>
        <CardContent className='p-0 h-[300px]'>
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart data={categoryData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='#e2e8f0' opacity={0.5} />
              <XAxis dataKey='name' axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: "#94a3b8" }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: "#94a3b8" }} tickFormatter={(value) => `${currency} ${value}`} />
              <Tooltip
                cursor={{ fill: "rgba(99, 102, 241, 0.05)" }}
                contentStyle={{ backgroundColor: "#1e293b", border: "none", borderRadius: "12px", color: "#fff", fontSize: "11px", fontWeight: "bold" }}
                formatter={(value: any) => [`${currency} ${value.toLocaleString()}`, "Sales"]}
              />
              <Bar dataKey='value' radius={[6, 6, 0, 0]} barSize={35}>
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
