import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CreditCard, Banknote, CheckCircle2, Leaf, Printer } from "lucide-react";
import { Button } from "../ui/Button";
import { usePOSStore } from "../../store/usePOSStore";
import { useThemeStore } from "../../store/useThemeStore";
import { cn } from "../../lib/utils";
import { ReceiptPreview } from "./ReceiptPreview";
import type { ExchangeBalanceOutcome, OrderItem } from "../../types";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialPaymentMethod?: "cash" | "card" | null;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, onSuccess, initialPaymentMethod }) => {
  const { businessDetails } = useThemeStore();
  const currency = businessDetails.currency;
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "upi" | null>(null);
  const [balanceOutcome, setBalanceOutcome] = useState<ExchangeBalanceOutcome>("none");
  const [receiptSnapshot, setReceiptSnapshot] = useState<{
    items: OrderItem[];
    subtotal: number;
    discount: number;
    total: number;
    customerName?: string;
    paymentMethod: string;
    orderNo: string;
    returnedItems?: OrderItem[];
    storeCreditUsed: number;
    exchangeCredit?: number;
    amountDue?: number;
    remainingBalance?: number;
    balanceOutcome?: ExchangeBalanceOutcome;
    originalOrderId?: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen && initialPaymentMethod) {
      setPaymentMethod(initialPaymentMethod);
    } else if (isOpen) {
      setPaymentMethod(null);
    }
    if (isOpen) setBalanceOutcome("none");
  }, [isOpen, initialPaymentMethod]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { total, subtotal, discount, customerName, customerId, cart, clearCart, completeOrder, exchangeDraft, getExchangeTotals } = usePOSStore();
  const exchangeTotals = getExchangeTotals();
  const requiresPayment = !exchangeDraft || exchangeTotals.amountDue > 0;

  const handleCheckout = async () => {
    if (requiresPayment && !paymentMethod) return;
    setIsProcessing(true);
    try {
      const { returnExchangeData, storeCredit } = usePOSStore.getState();
      const snapshotReturnedItems = exchangeDraft?.returnedItems ?? returnExchangeData;
      const finalPaymentMethod = requiresPayment ? paymentMethod! : "exchange";
      const snapshot = {
        items: cart.map((item) => ({ ...item })),
        subtotal,
        discount,
        total,
        customerName: customerName || undefined,
        paymentMethod: finalPaymentMethod,
        returnedItems: snapshotReturnedItems ? snapshotReturnedItems.map((item) => ({ ...item })) : undefined,
        storeCreditUsed: storeCredit,
        exchangeCredit: exchangeDraft ? exchangeTotals.returnCredit : undefined,
        amountDue: exchangeDraft ? exchangeTotals.amountDue : undefined,
        remainingBalance: exchangeDraft ? exchangeTotals.remainingBalance : undefined,
        balanceOutcome: exchangeDraft ? balanceOutcome : undefined,
        originalOrderId: exchangeDraft?.originalOrderId,
      };
      const orderId = await completeOrder(finalPaymentMethod, { balanceOutcome });
      setReceiptSnapshot({ ...snapshot, orderNo: orderId });
      setIsProcessing(false);
      setIsSuccess(true);
    } catch (error) {
      console.error("Checkout failed:", error);
      setIsProcessing(false);
      // Optional: Add toast notification here
    }
  };

  const handleComplete = () => {
    onSuccess();
    clearCart();
    setReceiptSnapshot(null);
    setIsSuccess(false);
    setPaymentMethod(null);
  };

  const handlePrint = () => {
    window.print();
    handleComplete();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm'>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className='bg-white dark:bg-dark-surface w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl'
        >
          {isSuccess ? (
            <div className='p-8 flex flex-col items-center justify-center text-center space-y-6'>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 12 }}
                className='w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center'
              >
                <CheckCircle2 size={32} />
              </motion.div>
              <div className='space-y-1'>
                <h2 className='text-xl font-bold font-display text-slate-900 dark:text-white'>Payment Successful!</h2>
                <p className='text-sm text-slate-500'>Order marked as paid. Choose an option below.</p>
              </div>

              <div id='printable-receipt' className='bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl overflow-auto max-h-87.5 scrollbar-hide border border-slate-100 dark:border-dark-border'>
                {receiptSnapshot && (
                  <ReceiptPreview
                    items={receiptSnapshot.items}
                    subtotal={receiptSnapshot.subtotal}
                    discount={receiptSnapshot.discount}
                    total={receiptSnapshot.total}
                    customerName={receiptSnapshot.customerName}
                    paymentMethod={receiptSnapshot.paymentMethod}
                    orderNo={receiptSnapshot.orderNo}
                    returnedItems={receiptSnapshot.returnedItems}
                    storeCreditUsed={receiptSnapshot.storeCreditUsed}
                    exchangeCredit={receiptSnapshot.exchangeCredit}
                    amountDue={receiptSnapshot.amountDue}
                    remainingBalance={receiptSnapshot.remainingBalance}
                    balanceOutcome={receiptSnapshot.balanceOutcome}
                    originalOrderId={receiptSnapshot.originalOrderId}
                  />
                )}
              </div>

              <div className='flex flex-col sm:flex-row gap-3 w-full max-w-sm'>
                <Button
                  variant='outline'
                  className='flex-1 h-12 gap-2 border-emerald-200 hover:bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:hover:bg-emerald-500/10 dark:text-emerald-400'
                  onClick={handleComplete}
                >
                  <Leaf size={16} />
                  <span>Go Green</span>
                </Button>
                <Button className='flex-1 h-12 gap-2 bg-primary hover:bg-primary/90 text-white' onClick={handlePrint}>
                  <Printer size={16} />
                  <span>Print Receipt</span>
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className='p-6 border-b border-slate-100 dark:border-dark-border flex items-center justify-between'>
                <h2 className='text-xl font-bold font-display text-slate-900 dark:text-white'>Checkout</h2>
                <button onClick={onClose} className='p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500'>
                  <X size={20} />
                </button>
              </div>

              <div className='flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-dark-border text-slate-900 dark:text-white'>
                {/* Order Summary */}
                <div className='flex-1 p-6 space-y-4'>
                  <div className='flex justify-between items-start'>
                    <h3 className='font-bold text-sm uppercase tracking-wider text-slate-400'>Order Summary</h3>
                    {customerName && (
                      <div className='text-right'>
                        <span className='block text-[10px] text-slate-400 uppercase font-bold'>Customer</span>
                        <span className='text-sm font-bold text-primary'>{customerName}</span>
                      </div>
                    )}
                  </div>
                  <div className='space-y-3 max-h-75 overflow-y-auto pr-2 scrollbar-hide'>
                    {cart.map((item) => (
                      <div key={item.id} className='flex justify-between text-sm'>
                        <span className='text-slate-600 dark:text-slate-400'>
                          {item.name} <span className='text-slate-400 ml-1'>x{item.quantity}</span>
                        </span>
                        <span className='font-medium'>
                          {currency} {item.total.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className='pt-4 border-t border-slate-100 dark:border-dark-border space-y-2'>
                    <div className='flex justify-between text-sm'>
                      <span className='text-slate-500'>Subtotal</span>
                      <span>
                        {currency} {subtotal.toFixed(2)}
                      </span>
                    </div>
                    {discount > 0 && (
                      <div className='flex justify-between text-sm text-emerald-600 dark:text-emerald-400 font-medium'>
                        <span>Discount</span>
                        <span>
                          -{currency} {discount.toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className='flex justify-between text-lg font-bold font-display pt-2'>
                      <span>Total</span>
                      <span className='text-primary'>
                        {currency} {total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment Methods */}
                <div className='flex-1 p-6 space-y-6'>
                  <h3 className='font-bold text-sm uppercase tracking-wider text-slate-400'>{requiresPayment ? "Payment Method" : "No Extra Payment Required"}</h3>
                  <div className='grid grid-cols-1 gap-3'>
                    {[
                      { id: "cash", icon: <Banknote />, label: "Cash Payment" },
                      { id: "card", icon: <CreditCard />, label: "Card Payment" },
                    ].map((method) => (
                      <button
                        key={method.id}
                        onClick={() => setPaymentMethod(method.id as any)}
                        className={cn(
                          "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left",
                          paymentMethod === method.id ? "border-primary bg-primary/5 text-primary" : "border-slate-100 dark:border-dark-border hover:border-slate-200 dark:hover:border-slate-700",
                        )}
                      >
                        <div className={cn("p-2 rounded-xl", paymentMethod === method.id ? "bg-primary text-white" : "bg-slate-50 dark:bg-slate-800")}>{method.icon}</div>
                        <span className='font-bold'>{method.label}</span>
                      </button>
                    ))}
                  </div>

                  {exchangeDraft && exchangeTotals.remainingBalance > 0 && (
                    <div className='space-y-3'>
                      <p className='text-xs font-bold uppercase tracking-wider text-slate-400'>Remaining Balance</p>
                      <div className='grid grid-cols-1 gap-2'>
                        <button
                          onClick={() => setBalanceOutcome("cash_refund")}
                          className={cn("p-3 rounded-xl border text-left text-sm font-bold", balanceOutcome === "cash_refund" ? "border-primary bg-primary/5 text-primary" : "border-slate-100")}
                        >
                          Cash Refund: {currency} {exchangeTotals.remainingBalance.toFixed(2)}
                        </button>
                        <button
                          onClick={() => setBalanceOutcome("store_credit")}
                          disabled={!customerId}
                          className={cn(
                            "p-3 rounded-xl border text-left text-sm font-bold disabled:opacity-40",
                            balanceOutcome === "store_credit" ? "border-primary bg-primary/5 text-primary" : "border-slate-100",
                          )}
                        >
                          Store Credit For Customer
                        </button>
                      </div>
                    </div>
                  )}

                  <Button
                    className='w-full h-14'
                    disabled={(requiresPayment && !paymentMethod) || isProcessing || Boolean(exchangeDraft && exchangeTotals.remainingBalance > 0 && balanceOutcome === "none")}
                    isLoading={isProcessing}
                    onClick={handleCheckout}
                  >
                    Complete Sale
                  </Button>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
