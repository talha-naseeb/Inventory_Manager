import React, { useState, useEffect } from "react";
import { X, RefreshCcw, ArrowRightLeft, AlertCircle, ShoppingBag, Minus, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../ui/Button";
import { useThemeStore } from "../../store/useThemeStore";
import { usePOSStore } from "../../store/usePOSStore";
import { cn } from "../../lib/utils";
import type { Order } from "../../types";

interface ReturnExchangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onComplete: (returnType: "refund" | "exchange", totalValue: number) => void;
}

export const ReturnExchangeModal: React.FC<ReturnExchangeModalProps> = ({ isOpen, onClose, order, onComplete }) => {
  const { businessDetails } = useThemeStore();
  const { setStoreCredit } = usePOSStore();
  const currency = businessDetails.currency;

  const [returnItems, setReturnItems] = useState<{ [key: string]: number }>({});
  const [selectedType, setSelectedType] = useState<"refund" | "exchange">("refund");

  useEffect(() => {
    if (order) {
      // Reset return quantities when a new order is selected
      setReturnItems({});
    }
  }, [order]);

  if (!order) return null;

  const handleUpdateQty = (itemId: string, maxQty: number, delta: number) => {
    const currentQty = returnItems[itemId] || 0;
    const newQty = Math.max(0, Math.min(maxQty, currentQty + delta));
    setReturnItems({ ...returnItems, [itemId]: newQty });
  };

  const calculateReturnTotal = () => {
    return order.items.reduce((sum, item) => {
      const returnQty = returnItems[item.productId] || 0;
      return sum + returnQty * item.price;
    }, 0);
  };

  const returnTotal = calculateReturnTotal();
  const hasItemsToReturn = returnTotal > 0;

  const handleComplete = () => {
    if (selectedType === "exchange") {
      setStoreCredit(returnTotal);
    }
    onComplete(selectedType, returnTotal);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6'>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className='absolute inset-0 bg-slate-900/60 backdrop-blur-sm' />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className='relative w-full max-w-2xl bg-white dark:bg-dark-surface rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-dark-border'
          >
            {/* Header */}
            <div className='p-6 border-b border-slate-100 dark:border-dark-border flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30'>
              <div className='flex items-center gap-4'>
                <div className='p-3 bg-primary/10 text-primary rounded-2xl'>
                  <RefreshCcw size={24} />
                </div>
                <div>
                  <h2 className='text-xl font-black text-slate-900 dark:text-white'>Return / Exchange</h2>
                  <p className='text-xs text-slate-500 font-bold uppercase tracking-wider'>Order ID: {order.id}</p>
                </div>
              </div>
              <Button variant='ghost' size='icon' onClick={onClose} className='rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors'>
                <X size={20} />
              </Button>
            </div>

            <div className='p-6 space-y-6'>
              {/* Type Selection */}
              <div className='grid grid-cols-2 gap-4'>
                <button
                  onClick={() => setSelectedType("refund")}
                  className={cn(
                    "flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all group",
                    selectedType === "refund"
                      ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                      : "border-slate-100 dark:border-dark-border hover:border-slate-200 dark:hover:border-slate-700",
                  )}
                >
                  <div
                    className={cn("p-2 rounded-xl transition-colors", selectedType === "refund" ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:text-primary")}
                  >
                    <RefreshCcw size={20} />
                  </div>
                  <div className='text-center'>
                    <p className={cn("text-sm font-black uppercase tracking-tight", selectedType === "refund" ? "text-primary" : "text-slate-600 dark:text-slate-400")}>Full Refund</p>
                    <p className='text-[10px] text-slate-400 font-medium mt-1'>Return cash or reversal</p>
                  </div>
                </button>

                <button
                  onClick={() => setSelectedType("exchange")}
                  className={cn(
                    "flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all group",
                    selectedType === "exchange"
                      ? "border-amber-500 bg-amber-500/5 shadow-md shadow-amber-500/10"
                      : "border-slate-100 dark:border-dark-border hover:border-slate-200 dark:hover:border-slate-700",
                  )}
                >
                  <div
                    className={cn(
                      "p-2 rounded-xl transition-colors",
                      selectedType === "exchange" ? "bg-amber-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:text-amber-500",
                    )}
                  >
                    <ArrowRightLeft size={20} />
                  </div>
                  <div className='text-center'>
                    <p className={cn("text-sm font-black uppercase tracking-tight", selectedType === "exchange" ? "text-amber-600" : "text-slate-600 dark:text-slate-400")}>Exchange Credit</p>
                    <p className='text-[10px] text-slate-400 font-medium mt-1'>Add as credit for next POS</p>
                  </div>
                </button>
              </div>

              {/* Item List */}
              <div className='space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide'>
                <p className='text-[10px] font-black uppercase tracking-widest text-slate-400'>Select items & quantities</p>
                {order.items.map((item) => (
                  <div
                    key={item.productId}
                    className={cn(
                      "p-4 rounded-2xl border transition-all flex items-center justify-between",
                      (returnItems[item.productId] || 0) > 0 ? "border-primary/30 bg-primary/5" : "border-slate-100 dark:border-dark-border",
                    )}
                  >
                    <div className='flex items-center gap-4'>
                      <div className='w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400'>
                        <ShoppingBag size={20} />
                      </div>
                      <div>
                        <p className='text-sm font-bold text-slate-900 dark:text-white'>{item.name}</p>
                        <p className='text-xs text-slate-500'>
                          Purchased: {item.quantity} × {currency} {item.price.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className='flex items-center gap-3 bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-slate-100 dark:border-dark-border'>
                      <button onClick={() => handleUpdateQty(item.productId, item.quantity, -1)} className='p-1 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-colors'>
                        <Minus size={14} />
                      </button>
                      <span className='w-8 text-center font-black text-sm text-slate-900 dark:text-white'>{returnItems[item.productId] || 0}</span>
                      <button onClick={() => handleUpdateQty(item.productId, item.quantity, 1)} className='p-1 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-colors'>
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className='p-6 rounded-3xl bg-slate-900 dark:bg-dark-bg text-white shadow-xl shadow-slate-900/20'>
                <div className='flex items-center justify-between mb-2'>
                  <span className='text-xs font-bold uppercase tracking-widest text-slate-400'>Return Total</span>
                  <span className='text-xs font-bold text-slate-400'>{selectedType === "refund" ? "Cash Back" : "Store Credit"}</span>
                </div>
                <div className='flex items-end justify-between'>
                  <h3 className='text-4xl font-black tracking-tighter'>
                    {currency} {returnTotal.toFixed(2)}
                  </h3>
                  {selectedType === "exchange" && (
                    <div className='flex items-center gap-2 text-amber-400 bg-amber-400/10 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider'>
                      <AlertCircle size={12} />
                      Applies to next sale
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className='p-6 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-dark-border flex gap-4'>
              <Button onClick={onClose} variant='outline' className='flex-1 h-12 font-black uppercase tracking-widest text-xs rounded-2xl'>
                Cancel
              </Button>
              <Button
                onClick={handleComplete}
                disabled={!hasItemsToReturn}
                className='flex-2 h-12 bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-lg shadow-primary/20'
              >
                {selectedType === "refund" ? "Confirm Refund" : "Activate Exchange"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
