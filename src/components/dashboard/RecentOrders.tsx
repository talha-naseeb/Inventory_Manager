import React from "react";
import type { Order } from "../../types";
import { cn } from "../../lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";

interface RecentOrdersProps {
  orders: Order[];
}

export const RecentOrders: React.FC<RecentOrdersProps> = ({ orders }) => {
  return (
    <Card className='flex-1'>
      <CardHeader>
        <CardTitle>Recent Orders</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='overflow-x-auto'>
          <table className='w-full text-left'>
            <thead>
              <tr className='border-b border-slate-100 dark:border-dark-border text-slate-500 text-sm font-medium'>
                <th className='pb-4 font-semibold'>Order ID</th>
                <th className='pb-4 font-semibold'>Customer</th>
                <th className='pb-4 font-semibold'>Total</th>
                <th className='pb-4 font-semibold'>Status</th>
                <th className='pb-4 font-semibold'>Date</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-slate-50 dark:divide-dark-border'>
              {orders.map((order) => (
                <tr key={order.id} className='group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors'>
                  <td className='py-4 text-sm font-medium'>{order.id}</td>
                  <td className='py-4 text-sm text-slate-600 dark:text-slate-400'>{order.customerName || "Walk-in"}</td>
                  <td className='py-4 text-sm font-bold'>${order.total.toFixed(2)}</td>
                  <td className='py-4'>
                    <span
                      className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                        order.status === "completed" && "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
                        order.status === "pending" && "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
                        order.status === "refunded" && "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
                      )}
                    >
                      {order.status.charAt(0) + order.status.slice(1)}
                    </span>
                  </td>
                  <td className='py-4 text-sm text-slate-500'>{new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
