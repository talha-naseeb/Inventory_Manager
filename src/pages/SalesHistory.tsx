import React, { useState, useEffect } from "react";
import { Search, Calendar, User, ShoppingBag, RotateCcw, Printer, FileText, Filter } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card, CardContent } from "../components/ui/Card";
import { format, subDays } from "date-fns";
import { cn } from "../lib/utils";
import { useThemeStore } from "../store/useThemeStore";
import { dbService } from "../services/database";
import { ScannerModal } from "../components/ui/ScannerModal";
import { DateRangeFilter } from "../components/dashboard/DateRangeFilter";
import { ReturnExchangeModal } from "../components/pos/ReturnExchangeModal";
import { ReceiptModal } from "../components/pos/ReceiptModal";
import { usePermissions } from "../hooks/usePermissions";
import { useBusinessProfile } from "../hooks/useBusinessProfile";
import type { Range } from "react-date-range";
import type { Order } from "../types";

interface SalesHistoryProps {
  onPageChange: (page: string) => void;
}

export const SalesHistory: React.FC<SalesHistoryProps> = ({ onPageChange }) => {
  const { businessDetails } = useThemeStore();
  const profile = useBusinessProfile();
  const { can } = usePermissions();
  const currency = businessDetails.currency;
  const unitFor = (item: { unit?: string | null }) => {
    const normalizedUnit = item.unit?.trim();
    return !normalizedUnit || normalizedUnit === "item" || normalizedUnit === profile.stockUnit.singular || normalizedUnit === profile.stockUnit.plural || normalizedUnit === profile.stockUnit.abbr
      ? profile.stockUnitAbbr
      : normalizedUnit;
  };

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<Order | null>(null);
  const [orderReturns, setOrderReturns] = useState<any[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [dateRange, setDateRange] = useState<Range>({
    startDate: subDays(new Date(), 7),
    endDate: new Date(),
    key: "selection",
  });

  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load Orders
  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, filterStatus, dateRange]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      // Ensure we have ISO strings for dates
      const startDate = dateRange.startDate ? new Date(dateRange.startDate).toISOString() : undefined;
      const endDate = dateRange.endDate ? new Date(dateRange.endDate).toISOString() : undefined;

      const data = await dbService.getOrders(
        {
          search: debouncedSearch,
          status: filterStatus,
          startDate,
          endDate,
        },
        50,
        0,
      ); // Fetch top 50 matches

      setOrders(data);

      // Select first order by default if we have results and nothing is selected
      // Or if the current selection is NOT in the new list (search changed)
      if (data.length > 0 && (!selectedOrderDetails || !data.find((o) => o.id === selectedOrderDetails.id))) {
        fetchOrderDetails(data[0].id);
      } else if (data.length === 0) {
        setSelectedOrderDetails(null);
      }
    } catch (error) {
      console.error("Failed to load orders", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderDetails = async (orderId: string) => {
    setDetailsLoading(true);
    try {
      const details = await dbService.getOrderDetails(orderId);
      if (details) {
        setSelectedOrderDetails(details);
        // Fetch linked returns
        const returns = await dbService.query<any>(`SELECT * FROM returns WHERE order_id = ? ORDER BY created_at DESC`, [orderId]);
        setOrderReturns(returns);
      }
    } catch (error) {
      console.error("Failed to load order details", error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleOrderClick = (order: Order) => {
    if (selectedOrderDetails?.id === order.id) return;
    fetchOrderDetails(order.id);
  };

  const handleScanOrder = (scannedId: string) => {
    setSearchTerm(scannedId);
    setIsScannerOpen(false);
  };

  const handleReturnComplete = (type: "refund" | "exchange", value: number) => {
    if (type === "exchange") {
      onPageChange("pos");
      return;
    }

    if (selectedOrderDetails) {
      // Optimistic update
      setSelectedOrderDetails({ ...selectedOrderDetails, status: "returned" });

      // Update list as well
      setOrders((prev) => prev.map((o) => (o.id === selectedOrderDetails.id ? { ...o, status: "returned" } : o)));
    }

    alert(`Success! Processed refund of value ${currency} ${value.toFixed(2)}`);
    // Refresh to ensure everything is synced
    if (selectedOrderDetails) {
      fetchOrderDetails(selectedOrderDetails.id);
    }
    loadOrders();
  };

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
            <Button variant='ghost' size='icon' className='absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:bg-transparent' onClick={() => setIsScannerOpen(true)}>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                width='20'
                height='20'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
                className='lucide lucide-scan-line'
              >
                <path d='M3 7V5a2 2 0 0 1 2-2h2' />
                <path d='M17 3h2a2 2 0 0 1 2 2v2' />
                <path d='M21 17v2a2 2 0 0 1-2 2h-2' />
                <path d='M7 21H5a2 2 0 0 1-2-2v-2' />
                <path d='M7 12H2' />
                <path d='M22 12H17' />
                <path d='M12 7V2' />
                <path d='M12 22V17' />
              </svg>
            </Button>
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
          {loading ? (
            <div className='p-8 text-center text-slate-400 text-sm'>Loading orders...</div>
          ) : orders.length > 0 ? (
            orders.map((order) => (
              <div
                key={order.id}
                onClick={() => handleOrderClick(order)}
                className={cn(
                  "p-4 rounded-2xl cursor-pointer transition-all border border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50",
                  selectedOrderDetails?.id === order.id && "bg-primary/5 dark:bg-primary/10 border-primary/20 shadow-sm",
                )}
              >
                <div className='flex justify-between items-start mb-2'>
                  <span className='font-bold text-sm text-slate-900 dark:text-white truncate max-w-30'>#{order.id.slice(0, 8)}</span>
                  <span className='text-[10px] font-bold text-slate-400'>{format(new Date(order.createdAt), "dd MMM, hh:mm a")}</span>
                </div>
                <div className='flex justify-between items-end'>
                  <div className='flex flex-col'>
                    <span className='text-xs font-medium text-slate-600 dark:text-slate-300 truncate max-w-30'>{order.customerName || "Walking Customer"}</span>
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
              <p className='text-xs mt-2'>Try adjusting filters or dates</p>
            </div>
          )}
        </div>
      </div>

      {/* Details Area */}
      <div className='flex-1 flex flex-col bg-white dark:bg-dark-surface rounded-3xl border border-slate-200 dark:border-dark-border overflow-hidden shadow-sm'>
        {selectedOrderDetails ? (
          <div className='flex flex-col h-full relative'>
            {detailsLoading && (
              <div className='absolute inset-0 bg-white/50 dark:bg-black/50 z-20 flex items-center justify-center'>
                <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
              </div>
            )}
            {/* Detail Header */}
            <div className='p-8 border-b border-slate-100 dark:border-dark-border bg-slate-50/30 dark:bg-slate-800/20'>
              <div className='flex justify-between items-start'>
                <div className='space-y-2'>
                  <div className='flex items-center gap-3'>
                    <h3 className='text-2xl font-black text-slate-900 dark:text-white tracking-tight'>#{selectedOrderDetails.id.substring(0, 8)}</h3>
                    <p className='text-[10px] text-slate-400 font-mono'>{selectedOrderDetails.id}</p>
                    <div
                      className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        selectedOrderDetails.status === "completed"
                          ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                          : selectedOrderDetails.status === "returned"
                            ? "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400"
                            : "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
                      )}
                    >
                      {selectedOrderDetails.status}
                    </div>
                  </div>
                  <div className='flex items-center gap-6 text-slate-500 text-sm'>
                    <div className='flex items-center gap-2'>
                      <Calendar size={16} className='text-primary' />
                      <span className='font-medium'>{format(new Date(selectedOrderDetails.createdAt), "PPPP")}</span>
                    </div>
                    <div className='flex items-center gap-2'>
                      <User size={16} className='text-primary' />
                      <span className='font-medium'>{selectedOrderDetails.customerName || "Walking Customer"}</span>
                    </div>
                  </div>
                </div>
                <div className='flex gap-2'>
                  <Button variant='outline' size='icon' onClick={() => setIsReceiptOpen(true)} className='rounded-xl shadow-sm hover:shadow-md transition-all'>
                    <Printer size={18} />
                  </Button>
                  {/* Reuse receipt logic? */}
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
                  <span className='text-xs font-bold text-slate-500'>{selectedOrderDetails.items.length} positions</span>
                </div>

                <div className='rounded-2xl border border-slate-100 dark:border-dark-border overflow-hidden'>
                  <div className='bg-slate-50 dark:bg-slate-800/50 p-4 grid grid-cols-12 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 dark:border-dark-border'>
                    <div className='col-span-6'>Item Description</div>
                    <div className='col-span-2 text-center'>Qty Sold</div>
                    <div className='col-span-2 text-right'>Net Qty</div>
                    <div className='col-span-2 text-right'>Total</div>
                  </div>
                  <div className='divide-y divide-slate-50 dark:divide-slate-800'>
                    {selectedOrderDetails.items.map((item: any, idx: number) => {
                      // Calculate returned quantity for THIS item
                      const returnedQty = orderReturns.reduce((sum, ret) => {
                        const retItems = JSON.parse(ret.items_json);
                        const retItem = retItems.find((ri: any) => ri.productId === item.productId);
                        return sum + (retItem ? retItem.quantity : 0);
                      }, 0);
                      const netQty = item.quantity - returnedQty;

                      return (
                        <div
                          key={idx}
                          className={cn("p-4 grid grid-cols-12 items-center hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors", returnedQty > 0 && "bg-rose-50/30 dark:bg-rose-500/5")}
                        >
                          <div className='col-span-6'>
                            <p className='font-bold text-slate-800 dark:text-slate-100'>{item.name}</p>
                            {item.sku && <p className='text-[10px] text-slate-400'>SKU: {item.sku}</p>}
                            {returnedQty > 0 && (
                              <div className='flex items-center gap-1 mt-1'>
                                <RotateCcw size={10} className='text-rose-500' />
                                <span className='text-[9px] font-bold text-rose-500 uppercase'>
                                  {returnedQty} {unitFor(item)} returned
                                </span>
                              </div>
                            )}
                          </div>
                          <div className='col-span-2 text-center text-xs font-bold text-slate-400 line-through'>
                            {item.quantity} {unitFor(item)}
                          </div>
                          <div className='col-span-2 text-right font-bold text-slate-900 dark:text-white'>
                            {netQty} {unitFor(item)}
                          </div>
                          <div className='col-span-2 text-right font-black text-slate-900 dark:text-white'>
                            {currency} {(netQty * item.price).toFixed(2)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* [NEW] Return & Exchange History Section */}
              {orderReturns.length > 0 && (
                <div className='space-y-4'>
                  <h4 className='text-xs font-black uppercase tracking-widest text-rose-500 flex items-center gap-2'>
                    <RotateCcw size={14} />
                    Return / Exchange History
                  </h4>
                  <div className='space-y-3'>
                    {orderReturns.map((ret) => (
                      <div key={ret.id} className='p-4 bg-rose-50 dark:bg-rose-500/5 rounded-2xl border border-rose-100 dark:border-rose-500/10'>
                        <div className='flex justify-between items-start mb-2'>
                          <span className='text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400'>{format(new Date(ret.created_at), "dd MMM yyyy, hh:mm a")}</span>
                          <span className='text-sm font-black text-rose-600'>
                            -{currency} {ret.return_value.toFixed(2)}
                          </span>
                        </div>
                        <div className='space-y-1'>
                          {JSON.parse(ret.items_json).map((item: any, idx: number) => (
                            <p key={idx} className='text-xs font-medium text-slate-500'>
                              Returned {item.quantity} {unitFor(item)} {item.name}
                            </p>
                          ))}
                          {ret.replacement_order_id && <p className='text-xs font-bold text-slate-500'>Replacement Order: #{String(ret.replacement_order_id).slice(0, 8)}</p>}
                          {ret.balance_outcome && ret.balance_outcome !== "none" && (
                            <p className='text-xs font-bold text-slate-500'>
                              Balance: {String(ret.balance_outcome).replace("_", " ")} | Due {currency} {Number(ret.amount_due || 0).toFixed(2)} | Remaining {currency}{" "}
                              {Number(ret.remaining_balance || 0).toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                        <p className='text-sm font-black text-slate-800 dark:text-slate-100'>Method: {selectedOrderDetails.paymentMethod || "Cash"}</p>
                        <p className='text-xs text-slate-500 mt-1'>ID: {selectedOrderDetails.id.slice(0, 8)}...</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className='bg-white dark:bg-dark-surface p-6 rounded-3xl border border-slate-200 dark:border-dark-border space-y-3'>
                  <div className='flex justify-between items-center text-sm'>
                    <span className='text-slate-500 font-bold uppercase tracking-wider'>Subtotal</span>
                    <span className='font-bold text-slate-700 dark:text-slate-300'>
                      {currency} {selectedOrderDetails.subtotal.toFixed(2)}
                    </span>
                  </div>
                  {selectedOrderDetails.discount > 0 && (
                    <div className='flex justify-between items-center text-sm'>
                      <span className='text-emerald-500 font-bold uppercase tracking-wider'>Discount</span>
                      <span className='font-bold text-emerald-500'>
                        -{currency} {selectedOrderDetails.discount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className='flex justify-between items-center text-sm'>
                    <span className='text-slate-500 font-bold uppercase tracking-wider'>Tax</span>
                    <span className='font-bold text-slate-700 dark:text-slate-300'>
                      {currency} {selectedOrderDetails.tax.toFixed(2)}
                    </span>
                  </div>
                  <div className='pt-3 border-t border-slate-100 dark:border-dark-border flex justify-between items-center'>
                    <span className='text-xs font-black uppercase text-slate-900 dark:text-white'>Total Amount</span>
                    <span className='text-2xl font-black text-primary'>
                      {currency} {selectedOrderDetails.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className='p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-dark-border flex gap-4'>
              {can("manage_inventory") && (
                <Button
                  onClick={() => setIsReturnModalOpen(true)}
                  className='flex-1 h-12 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black uppercase tracking-widest text-xs rounded-2xl gap-2 hover:bg-slate-800 dark:hover:bg-slate-100 transition-all'
                >
                  <RotateCcw size={18} />
                  Initiate Return / Exchange
                </Button>
              )}
              <Button
                variant='outline'
                onClick={() => setIsReceiptOpen(true)}
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

      {selectedOrderDetails && (
        <>
          <ReturnExchangeModal isOpen={isReturnModalOpen} onClose={() => setIsReturnModalOpen(false)} order={selectedOrderDetails} orderReturns={orderReturns} onComplete={handleReturnComplete} />
          <ReceiptModal isOpen={isReceiptOpen} onClose={() => setIsReceiptOpen(false)} order={selectedOrderDetails} />
        </>
      )}
      <ScannerModal isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} onScan={handleScanOrder} title='Scan Receipt QR' />
    </div>
  );
};
