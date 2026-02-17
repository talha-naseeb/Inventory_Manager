import React from "react";
import { Card } from "../ui/Card";
import { usePOSStore } from "../../store/usePOSStore";

export const ReceiptPreview: React.FC = () => {
  const { cart, subtotal, total, customerName, discount } = usePOSStore();
  const date = new Date().toLocaleDateString();
  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const orderNo = Math.floor(100000 + Math.random() * 900000);

  return (
    <Card className='w-[300px] p-6 bg-white text-slate-900 border-none shadow-none font-mono text-[10px] leading-relaxed select-none'>
      {/* Brand Header */}
      <div className='text-center space-y-1 mb-4'>
        <h2 className='text-base font-black uppercase tracking-tighter'>InventoriMan</h2>
        <div className='text-[8px] space-y-0.5 text-slate-500'>
          <p>123 Business Avenue, Karachi, Pakistan</p>
          <p>Contact: +92 (300) 000-0000</p>
        </div>
      </div>

      <div className='border-t border-dashed border-slate-300 my-3' />

      {/* Sale Info */}
      <div className='space-y-1 mb-3'>
        <div className='flex justify-between font-bold'>
          <span>ORDER NO:</span>
          <span>#{orderNo}</span>
        </div>
        <div className='flex justify-between'>
          <span>DATE:</span>
          <span>{date}</span>
        </div>
        <div className='flex justify-between'>
          <span>TIME:</span>
          <span>{time}</span>
        </div>
        {customerName && (
          <div className='flex justify-between border-t border-slate-100 pt-1 mt-1'>
            <span className='font-bold uppercase'>CUSTOMER:</span>
            <span className='truncate ml-2'>{customerName.toUpperCase()}</span>
          </div>
        )}
      </div>

      <div className='border-t border-slate-900 my-2' />

      {/* Items Table Header */}
      <div className='flex justify-between font-bold mb-1 border-b border-slate-100 pb-1'>
        <span className='flex-1'>ITEM</span>
        <span className='w-12 text-center'>QTY</span>
        <span className='w-16 text-right'>TOTAL</span>
      </div>

      {/* Items List */}
      <div className='space-y-1.5 mb-3'>
        {cart.map((item) => (
          <div key={item.productId} className='flex justify-between items-start'>
            <div className='flex-1 pr-2 uppercase'>
              <div className='font-medium'>{item.name}</div>
              <div className='text-[8px] text-slate-500'>Rs. {item.price.toFixed(2)} / unit</div>
            </div>
            <span className='w-12 text-center'>{item.quantity}</span>
            <span className='w-16 text-right font-medium'>Rs. {item.total.toFixed(2)}</span>
          </div>
        ))}
      </div>

      <div className='border-t border-dashed border-slate-300 my-3' />

      {/* Totals Section */}
      <div className='space-y-1'>
        <div className='flex justify-between'>
          <span>SUBTOTAL:</span>
          <span>Rs. {subtotal.toFixed(2)}</span>
        </div>
        {discount > 0 && (
          <div className='flex justify-between text-slate-600'>
            <span>DISCOUNT:</span>
            <span>-Rs. {discount.toFixed(2)}</span>
          </div>
        )}
        <div className='flex justify-between font-black text-xs pt-2 border-t border-slate-200 mt-1'>
          <span>PAYABLE TOTAL:</span>
          <span>Rs. {total.toFixed(2)}</span>
        </div>
      </div>

      <div className='border-t border-dashed border-slate-300 my-4' />

      {/* Footer Branding */}
      <div className='text-center space-y-3'>
        <div className='space-y-1'>
          <p className='font-bold text-[9px] uppercase tracking-widest'>Thank you for your visit!</p>
          <p className='text-[8px] text-slate-500 italic'>Software Solution by SyntaxPulse</p>
        </div>

        {/* Developer Credit */}
        <div className='pt-2 border-t border-slate-100'>
          <p className='text-[7px] font-bold text-slate-400'>SyntaxPulse</p>
          <p className='text-[7px] text-slate-400 opacity-70 italic'>design by talhanaseeb27@gmail.com</p>
        </div>

        <div className='mt-2 flex justify-center grayscale opacity-30'>
          {/* Mock Barcode */}
          <div className='h-6 flex gap-[1px]'>
            {[1, 2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 1, 1, 2, 2, 1, 3].map((w, i) => (
              <div key={i} className='bg-black' style={{ width: `${w}px` }} />
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};
