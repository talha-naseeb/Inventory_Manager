import React, { useState } from "react";
import { X, RotateCcw, ArrowRight, Minus, Plus } from "lucide-react";
import { Button } from "../ui/Button";
import { usePOSStore } from "../../store/usePOSStore";
import { useThemeStore } from "../../store/useThemeStore";
import { cn } from "../../lib/utils";
import type { Order } from "../../types";

interface ReturnExchangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  orderReturns?: Array<{ items_json: string }>;
  onComplete: (type: "refund" | "exchange", value: number) => void;
}

export const ReturnExchangeModal: React.FC<ReturnExchangeModalProps> = ({ isOpen, onClose, order, orderReturns = [], onComplete }) => {
  const [selectedType, setSelectedType] = useState<"refund" | "exchange">("exchange");
  const [returnItems, setReturnItems] = useState<Record<string, number>>({});
  const startExchangeDraft = usePOSStore((state) => state.startExchangeDraft);
  const clearCart = usePOSStore((state) => state.clearCart);
  const { businessDetails } = useThemeStore();
  const currency = businessDetails.currency;

  const returnedQuantityByProduct = orderReturns.reduce<Record<string, number>>((acc, ret) => {
    try {
      const items = JSON.parse(ret.items_json || "[]");
      for (const item of items) {
        const productId = item.productId || item.product_id;
        if (productId) acc[productId] = (acc[productId] || 0) + Number(item.quantity || 0);
      }
    } catch {
      return acc;
    }
    return acc;
  }, {});

  const handleUpdateQty = (productId: string, max: number, delta: number) => {
    const current = returnItems[productId] || 0;
    const next = Math.max(0, Math.min(max, current + delta));
    setReturnItems({ ...returnItems, [productId]: next });
  };

  const calculateReturnTotal = () => {
    return order.items.reduce((sum, item) => {
      if (!item.productId) return sum;
      const returnQty = returnItems[item.productId] || 0;
      return sum + returnQty * item.price;
    }, 0);
  };

  const returnTotal = calculateReturnTotal();

  const handleComplete = async () => {
    try {
      const value = calculateReturnTotal();
      if (value <= 0) return;

      const itemsToRecord = order.items
        .filter((item) => item.productId && (returnItems[item.productId] || 0) > 0)
        .map((item) => ({
          id: `ret-${item.productId}-${crypto.randomUUID()}`,
          productId: item.productId!,
          name: item.name,
          quantity: returnItems[item.productId!],
          price: item.price,
          total: returnItems[item.productId!] * item.price,
          unit: item.unit,
          priceType: item.priceType || "retail",
        }));

      if (selectedType === "exchange") {
        clearCart();
        startExchangeDraft({
          originalOrderId: order.id,
          customerId: order.customerId || null,
          customerName: order.customerName || "Cash Customer",
          returnedItems: itemsToRecord as any,
          returnCredit: value,
        });
        onComplete(selectedType, value);
        onClose();
        return;
      }

      const { dbService } = await import("../../services/database");
      const result = await dbService.recordReturn({
        orderId: order.id,
        value,
        items: itemsToRecord,
        status: "completed",
      });
      if (!result?.success) throw new Error(result?.error || "Return failed");

      onComplete(selectedType, value);
      onClose();
    } catch (error) {
      console.error("Failed to save return record:", error);
      alert("Error saving return record.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4'>
      <div className='bg-white dark:bg-dark-surface rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col'>
        <div className='p-6 border-b border-slate-200 flex justify-between items-center'>
          <h2 className='text-xl font-bold'>Return / Exchange</h2>
          <button onClick={onClose} className='text-slate-400 hover:text-slate-600'>
            <X size={24} />
          </button>
        </div>

        <div className='p-6 flex-1 overflow-y-auto space-y-6'>
          <div className='grid grid-cols-2 gap-4'>
            <button
              onClick={() => setSelectedType("exchange")}
              className={cn("p-4 rounded-2xl border-2 transition-all text-center", selectedType === "exchange" ? "border-primary bg-primary/5" : "border-slate-100")}
            >
              <RotateCcw className='mx-auto mb-2 text-primary' />
              <span className='font-bold'>Exchange</span>
            </button>
            <button
              onClick={() => setSelectedType("refund")}
              className={cn("p-4 rounded-2xl border-2 transition-all text-center", selectedType === "refund" ? "border-rose-500 bg-rose-50" : "border-slate-100")}
            >
              <ArrowRight className='mx-auto mb-2 text-rose-500' />
              <span className='font-bold'>Refund</span>
            </button>
          </div>

          <div className='space-y-3'>
            <p className='text-[10px] font-black uppercase text-slate-400'>Select Items</p>
            {order.items.map((item) => {
              if (!item.productId) return null;
              const alreadyReturned = returnedQuantityByProduct[item.productId] || 0;
              const remainingQty = Math.max(0, item.quantity - alreadyReturned);
              if (remainingQty <= 0) return null;
              return (
                <div key={item.productId} className='p-4 rounded-2xl border flex items-center justify-between bg-slate-50'>
                  <div>
                    <p className='text-sm font-bold'>{item.name}</p>
                    <p className='text-xs text-slate-500'>
                      {remainingQty} of {item.quantity} returnable
                    </p>
                  </div>
                  <div className='flex items-center gap-3 bg-white p-1 rounded-xl border'>
                    <button onClick={() => handleUpdateQty(item.productId!, remainingQty, -1)} className='p-1 hover:bg-slate-50'>
                      <Minus size={14} />
                    </button>
                    <span className='w-8 text-center font-bold'>{returnItems[item.productId!] || 0}</span>
                    <button onClick={() => handleUpdateQty(item.productId!, remainingQty, 1)} className='p-1 hover:bg-slate-50'>
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className='p-6 border-t bg-slate-50 flex items-center justify-between'>
          <div>
            <p className='text-xs text-slate-500 uppercase font-black'>Total Credit</p>
            <p className='text-2xl font-black text-primary'>
              {currency} {returnTotal.toFixed(2)}
            </p>
          </div>
          <Button onClick={handleComplete} disabled={returnTotal <= 0} className='bg-primary text-white font-bold h-12 px-8'>
            {selectedType === "exchange" ? "Continue To POS" : "Complete Refund"}
          </Button>
        </div>
      </div>
    </div>
  );
};
