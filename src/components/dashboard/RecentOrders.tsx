import React, { useState, useEffect } from "react";
import type { Order } from "../../types";
import { cn } from "../../lib/utils";
import { dbService } from "../../services/database";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";

interface RecentOrdersProps {
  currency: string;
}

export const RecentOrders: React.FC<RecentOrdersProps> = ({ currency }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const data = await dbService.getRecentOrders(50);
        setOrders(data);
      } catch (error) {
        console.error("Failed to load recent orders", error);
      } finally {
        setLoading(false);
      }
    };
    loadOrders();
  }, []);

  return (
    <Card className='h-full flex flex-col'>
      <CardHeader className='shrink-0 pb-2'>
        <CardTitle>Recent Orders</CardTitle>
      </CardHeader>
      <CardContent className='flex-1 flex flex-col min-h-0 pt-0'>
        <div className='overflow-y-auto relative h-[50vh] flex-1'>
          <table className='w-full text-left bg-white dark:bg-dark-surface'>
            <thead className='sticky top-0 z-10 bg-white dark:bg-dark-surface'>
              <tr className='border-b border-slate-100 dark:border-dark-border text-slate-500 text-sm font-medium'>
                <th className='pb-4 pt-2 font-semibold bg-white dark:bg-dark-surface'>#ID</th>
                <th className='pb-4 pt-2 font-semibold bg-white dark:bg-dark-surface'>Customer</th>
                <th className='pb-4 pt-2 font-semibold bg-white dark:bg-dark-surface'>Total</th>
                <th className='pb-4 pt-2 font-semibold bg-white dark:bg-dark-surface'>Status</th>
                <th className='pb-4 pt-2 font-semibold bg-white dark:bg-dark-surface'>Date & Time</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-slate-50 dark:divide-dark-border'>
              {loading && orders.length === 0 ? (
                <tr>
                  <td colSpan={4} className='py-8 text-center text-slate-500'>
                    Loading...
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className='group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors'>
                    <td className='py-4 text-sm font-bold text-slate-900 dark:text-white'>#{order.id.slice(0, 8)}</td>
                    <td className='py-4 text-sm text-slate-600 dark:text-slate-400 font-medium'>{order.customerName || "Walk-in"}</td>
                    <td className='py-4 text-sm font-bold'>
                      {currency} {order.total.toFixed(2)}
                    </td>
                    <td className='py-4'>
                      <span
                        className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                          order.status === "completed" && "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
                          order.status === "pending" && "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
                          order.status === "refunded" && "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
                        )}
                      >
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </td>
                    <td className='py-4 text-sm text-slate-500'>
                      {new Date(order.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))
              )}
              {!loading && orders.length === 0 && (
                <tr>
                  <td colSpan={4} className='py-8 text-center text-slate-500'>
                    No recent orders.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
