import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Printer, Download } from "lucide-react";
import { Button } from "../ui/Button";
import { ReceiptPreview } from "./ReceiptPreview";
import type { Order } from "../../types";
import { format } from "date-fns";

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, order }) => {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
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
            className='relative w-full max-w-lg bg-white dark:bg-dark-surface rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-dark-border'
          >
            {/* Header */}
            <div className='p-6 border-b border-slate-100 dark:border-dark-border flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30'>
              <div className='flex items-center gap-4'>
                <div className='p-3 bg-primary/10 text-primary rounded-2xl'>
                  <Printer size={24} />
                </div>
                <div>
                  <h2 className='text-xl font-black text-slate-900 dark:text-white'>Order Invoice</h2>
                  <p className='text-[10px] text-slate-500 font-bold uppercase tracking-wider'>Preview & Print</p>
                </div>
              </div>
              <Button variant='ghost' size='icon' onClick={onClose} className='rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors'>
                <X size={20} />
              </Button>
            </div>

            {/* Receipt Content */}
            <div className='p-8 bg-slate-50 dark:bg-dark-bg/50 max-h-[60vh] overflow-y-auto scrollbar-hide'>
              <div id='printable-receipt' className='shadow-sm'>
                <ReceiptPreview
                  items={order.items}
                  subtotal={order.subtotal}
                  discount={order.discount}
                  total={order.total}
                  customerName={order.customerName}
                  orderNo={order.id}
                  date={format(new Date(order.createdAt), "dd MMM yyyy, hh:mm a")}
                />
              </div>
            </div>

            {/* Footer Actions */}
            <div className='p-6 bg-white dark:bg-dark-surface border-t border-slate-100 dark:border-dark-border flex gap-3'>
              <Button variant='outline' className='flex-1 h-12 font-black uppercase tracking-widest text-[10px] rounded-2xl gap-2'>
                <Download size={16} />
                Export PDF
              </Button>
              <Button
                onClick={handlePrint}
                className='flex-1 h-12 bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-lg shadow-primary/20 gap-2'
              >
                <Printer size={16} />
                Print Now
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
