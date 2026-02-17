import React, { useState } from "react";
import { Search, Calendar, User, ShoppingBag, RotateCcw, Printer, FileText, Filter } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card, CardContent } from "../components/ui/Card";
import { MOCK_ORDERS } from "../services/mockData";
import { format, subDays, isWithinInterval } from "date-fns";
import { cn } from "../lib/utils";
import { useThemeStore } from "../store/useThemeStore";
import { DateRangeFilter } from "../components/dashboard/DateRangeFilter";
import { ReturnExchangeModal } from "../components/pos/ReturnExchangeModal";
import { ReceiptModal } from "../components/pos/ReceiptModal";
import type { Range } from "react-date-range";
import type { Order } from "../types";

interface SalesHistoryProps {
  onPageChange: (page: string) => void;
}

export const SalesHistory: React.FC<SalesHistoryProps> = ({ onPageChange }) => {
  const { businessDetails } = useThemeStore();
  const currency = businessDetails.currency;
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(MOCK_ORDERS[0] || null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [dateRange, setDateRange] = useState<Range>({
    startDate: subDays(new Date(), 7),
    endDate: new Date(),
    key: "selection",
  });
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const filteredOrders = MOCK_ORDERS.filter((order) => {
    const orderDate = new Date(order.createdAt);
    const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) || order.customerName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || order.status.toLowerCase() === filterStatus.toLowerCase();
    const matchesDate = isWithinInterval(orderDate, {
      start: dateRange.startDate!,
      end: dateRange.endDate!,
    });
    return matchesSearch && matchesStatus && matchesDate;
  });

  return (
    <div className='flex h-[calc(100vh-160px)] gap-6 overflow-hidden'>
      {/* Sidebar: Order List */}
      <div className='w-1/3 flex flex-col bg-white dark:bg-dark-surface rounded-3xl border border-slate-200 dark:border-dark-border overflow-hidden shadow-sm'>
        <div className='p-6 border-b border-slate-100 dark:border-dark-border space-y-4'>
          <div className='flex items-center justify-between'>
            <h2 className='text-xl font-bold font-display text-slate-900 dark:text-white'>Recent Sales</h2>
            <DateRangeFilter onRangeChange={setDateRange} />
          </div>

          <div className='relative'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400' size={16} />
            <Input placeholder='Order ID or Customer...' className='pl-10 h-11 text-sm bg-slate-50 dark:bg-dark-bg border-none' value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>

          <div className='flex gap-2 overflow-x-auto pb-1 scrollbar-hide'>
            {["all", "completed", "returned", "pending"].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border",
                  filterStatus === status ? "bg-primary border-primary text-white shadow-md shadow-primary/20" : "bg-white dark:bg-slate-800 border-slate-100 dark:border-dark-border text-slate-500",
                )}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className='flex-1 overflow-y-auto scrollbar-hide p-2 space-y-2'>
          {filteredOrders.length > 0 ? (
            filteredOrders.map((order) => (
              <div
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className={cn(
                  "p-4 rounded-2xl cursor-pointer transition-all border border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50",
                  selectedOrder?.id === order.id && "bg-primary/5 dark:bg-primary/10 border-primary/20 shadow-sm",
                )}
              >
                <div className='flex justify-between items-start mb-2'>
                  <span className='font-bold text-sm text-slate-900 dark:text-white'>{order.id}</span>
                  <span className='text-[10px] font-bold text-slate-400'>{format(new Date(order.createdAt), "dd MMM, hh:mm a")}</span>
                </div>
                <div className='flex justify-between items-end'>
                  <div className='flex flex-col'>
                    <span className='text-xs font-medium text-slate-600 dark:text-slate-300 truncate max-w-[120px]'>{order.customerName || "Walking Customer"}</span>
                    <span className={cn("text-[9px] font-black uppercase mt-1", order.status === "completed" ? "text-emerald-500" : order.status === "returned" ? "text-danger" : "text-amber-500")}>
                      {order.status}
                    </span>
                  </div>
                  <div className='text-right'>
                    <p className='text-xs text-slate-400 leading-none mb-1'>{order.items.length} items</p>
                    <span className='text-sm font-black text-primary'>
                      {currency} {order.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className='h-full flex flex-col items-center justify-center text-center p-8 opacity-40'>
              <Search size={40} className='mb-4' />
              <p className='font-bold text-sm'>No orders found</p>
            </div>
          )}
        </div>
      </div>

      {/* Details Area */}
      <div className='flex-1 flex flex-col bg-white dark:bg-dark-surface rounded-3xl border border-slate-200 dark:border-dark-border overflow-hidden shadow-sm'>
        {selectedOrder ? (
          <div className='flex flex-col h-full'>
            {/* Detail Header */}
            <div className='p-8 border-b border-slate-100 dark:border-dark-border bg-slate-50/30 dark:bg-slate-800/20'>
              <div className='flex justify-between items-start'>
                <div className='space-y-2'>
                  <div className='flex items-center gap-3'>
                    <h3 className='text-3xl font-black text-slate-900 dark:text-white tracking-tight'>{selectedOrder.id}</h3>
                    <div
                      className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        selectedOrder.status === "completed"
                          ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                          : selectedOrder.status === "returned"
                            ? "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400"
                            : "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
                      )}
                    >
                      {selectedOrder.status}
                    </div>
                  </div>
                  <div className='flex items-center gap-6 text-slate-500 text-sm'>
                    <div className='flex items-center gap-2'>
                      <Calendar size={16} className='text-primary' />
                      <span className='font-medium'>{format(new Date(selectedOrder.createdAt), "PPPP")}</span>
                    </div>
                    <div className='flex items-center gap-2'>
                      <User size={16} className='text-primary' />
                      <span className='font-medium'>{selectedOrder.customerName || "Walking Customer"}</span>
                    </div>
                  </div>
                </div>
                <div className='flex gap-2'>
                  <Button variant='outline' size='icon' onClick={() => setIsReceiptModalOpen(true)} className='rounded-xl shadow-sm hover:shadow-md transition-all'>
                    <Printer size={18} />
                  </Button>
                  <Button variant='outline' size='icon' className='rounded-xl shadow-sm hover:shadow-md transition-all'>
                    <RotateCcw size={18} />
                  </Button>
                </div>
              </div>
            </div>

            <div className='flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide'>
              {/* Items Table */}
              <div className='space-y-4'>
                <div className='flex items-center justify-between'>
                  <h4 className='text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2'>
                    <ShoppingBag size={14} />
                    Order Items
                  </h4>
                  <span className='text-xs font-bold text-slate-500'>{selectedOrder.items.length} positions</span>
                </div>

                <div className='rounded-2xl border border-slate-100 dark:border-dark-border overflow-hidden'>
                  <div className='bg-slate-50 dark:bg-slate-800/50 p-4 grid grid-cols-12 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 dark:border-dark-border'>
                    <div className='col-span-6'>Item Description</div>
                    <div className='col-span-2 text-center'>Qty</div>
                    <div className='col-span-2 text-right'>Price</div>
                    <div className='col-span-2 text-right'>Total</div>
                  </div>
                  <div className='divide-y divide-slate-50 dark:divide-slate-800'>
                    {selectedOrder.items.map((item: any, idx: number) => (
                      <div key={idx} className='p-4 grid grid-cols-12 items-center hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors'>
                        <div className='col-span-6'>
                          <p className='font-bold text-slate-800 dark:text-slate-100'>{item.name}</p>
                          <p className='text-[10px] text-slate-400'>SKU: ART-{1000 + idx}</p>
                        </div>
                        <div className='col-span-2 text-center font-bold text-slate-600 dark:text-slate-400'>x{item.quantity}</div>
                        <div className='col-span-2 text-right text-xs font-medium'>
                          {currency} {item.price.toFixed(2)}
                        </div>
                        <div className='col-span-2 text-right font-black text-slate-900 dark:text-white'>
                          {currency} {item.total.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Financial Summary */}
              <div className='grid grid-cols-1 md:grid-cols-2 gap-8 items-end'>
                <Card className='bg-slate-50/50 dark:bg-slate-800/30 border-none'>
                  <CardContent className='pt-6'>
                    <div className='flex items-start gap-4'>
                      <div className='p-3 bg-white dark:bg-dark-surface rounded-2xl border border-slate-100 dark:border-dark-border'>
                        <Filter size={20} className='text-primary' />
                      </div>
                      <div>
                        <p className='text-xs font-bold uppercase tracking-wider text-slate-400 mb-1'>Payment Details</p>
                        <p className='text-sm font-black text-slate-800 dark:text-slate-100'>Payment Method: Cash</p>
                        <p className='text-xs text-slate-500 mt-1'>Reference ID: REF-9281-XM</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className='bg-white dark:bg-dark-surface p-6 rounded-3xl border border-slate-200 dark:border-dark-border space-y-3'>
                  <div className='flex justify-between items-center text-sm'>
                    <span className='text-slate-500 font-bold uppercase tracking-wider'>Subtotal</span>
                    <span className='font-bold text-slate-700 dark:text-slate-300'>
                      {currency} {selectedOrder.subtotal.toFixed(2)}
                    </span>
                  </div>
                  {selectedOrder.discount > 0 && (
                    <div className='flex justify-between items-center text-sm'>
                      <span className='text-emerald-500 font-bold uppercase tracking-wider'>Discount</span>
                      <span className='font-bold text-emerald-500'>
                        -{currency} {selectedOrder.discount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className='flex justify-between items-center text-sm'>
                    <span className='text-slate-500 font-bold uppercase tracking-wider'>Tax</span>
                    <span className='font-bold text-slate-700 dark:text-slate-300'>
                      {currency} {selectedOrder.tax.toFixed(2)}
                    </span>
                  </div>
                  <div className='pt-3 border-t border-slate-100 dark:border-dark-border flex justify-between items-center'>
                    <span className='text-xs font-black uppercase text-slate-900 dark:text-white'>Total Amount</span>
                    <span className='text-2xl font-black text-primary'>
                      {currency} {selectedOrder.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className='p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-dark-border flex gap-4'>
              <Button
                onClick={() => setIsReturnModalOpen(true)}
                className='flex-1 h-12 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black uppercase tracking-widest text-xs rounded-2xl gap-2 hover:bg-slate-800 dark:hover:bg-slate-100 transition-all'
              >
                <RotateCcw size={18} />
                Initiate Return / Exchange
              </Button>
              <Button
                variant='outline'
                onClick={() => setIsReceiptModalOpen(true)}
                className='h-12 border-slate-200 dark:border-dark-border font-black uppercase tracking-widest text-xs rounded-2xl gap-2 px-8'
              >
                <FileText size={18} />
                Generate Invoice
              </Button>
            </div>
          </div>
        ) : (
          <div className='flex-1 flex flex-col items-center justify-center text-center p-12 opacity-40'>
            <div className='w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6'>
              <ShoppingBag size={48} />
            </div>
            <h3 className='text-2xl font-black text-slate-900 dark:text-white mb-2'>No Order Selected</h3>
            <p className='text-slate-500 max-w-sm'>Select a sale record from the left panel to view detailed breakdown and process returns.</p>
          </div>
        )}
      </div>

      <ReturnExchangeModal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        order={selectedOrder}
        onComplete={(type, value) => {
          if (selectedOrder) {
            selectedOrder.status = "returned";
          }
          if (type === "exchange") {
            onPageChange("pos");
          } else {
            alert(`Success! processed refund of value ${currency} ${value.toFixed(2)}`);
          }
        }}
      />
      <ReceiptModal isOpen={isReceiptModalOpen} onClose={() => setIsReceiptModalOpen(false)} order={selectedOrder} />
    </div>
  );
};
