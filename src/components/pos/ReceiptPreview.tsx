import React from "react";
import { MapPin, Phone, Info, ShoppingBag, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import type { OrderItem } from "../../types";
import { useThemeStore } from "../../store/useThemeStore";
import { cn } from "../../lib/utils";
import QRCode from "react-qr-code";

interface ReceiptPreviewProps {
  items: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  customerName?: string;
  paymentMethod?: string;
  orderNo?: string;
  date?: string;
  returnedItems?: OrderItem[];
  storeCreditUsed?: number;
}

export const ReceiptPreview: React.FC<ReceiptPreviewProps> = ({
  items,
  subtotal,
  discount,
  total,
  customerName,
  paymentMethod,
  orderNo: providedOrderNo,
  date: providedDate,
  returnedItems,
  storeCreditUsed,
}) => {
  const { businessDetails } = useThemeStore();
  const date = providedDate || format(new Date(), "dd MMM yyyy, hh:mm a");
  const orderNo = providedOrderNo ? (providedOrderNo.length > 20 ? providedOrderNo.slice(0, 8) : providedOrderNo) : Math.floor(100000 + Math.random() * 900000).toString();

  return (
    <div id='printable-receipt' className='bg-white text-slate-900 p-8 max-w-[400px] mx-auto shadow-2xl border border-slate-100 font-mono text-[11px] leading-relaxed'>
      {/* Header */}
      <div className='text-center space-y-1.5 mb-6 pb-6 border-b border-dashed border-slate-200'>
        {businessDetails.logo ? (
          <div className='w-20 h-20 mx-auto mb-3 flex items-center justify-center overflow-hidden rounded-2xl'>
            <img src={businessDetails.logo} alt='logo' className='w-full h-full object-contain' />
          </div>
        ) : (
          <div className='w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg'>
            <ShoppingBag size={28} />
          </div>
        )}
        <h1 className='text-lg font-black uppercase tracking-tighter text-slate-900'>{businessDetails.name}</h1>
        <div className='flex flex-col items-center gap-0.5 text-slate-500 font-bold uppercase text-[9px]'>
          <div className='flex items-center gap-1'>
            <MapPin size={10} />
            <span>{businessDetails.address}</span>
          </div>
          <div className='flex items-center gap-3'>
            <div className='flex items-center gap-1'>
              <Phone size={10} />
              <span>{businessDetails.phone}</span>
            </div>
            {businessDetails.ntn && (
              <div className='flex items-center gap-1 border-l border-slate-200 pl-3'>
                <Info size={10} />
                <span>NTN: {businessDetails.ntn}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className='border-t border-dashed border-slate-300 my-3' />

      {/* Sale Info */}
      <div className='space-y-1.5 mb-4'>
        {[
          { label: "ORDER NO", value: `#${orderNo}` },
          { label: "DATE", value: date },
          paymentMethod ? { label: "PAYMENT", value: paymentMethod.toUpperCase() } : null,
          customerName ? { label: "CUSTOMER", value: customerName.toUpperCase() } : null,
        ]
          .filter(Boolean)
          .map((info, idx) => (
            <div key={idx} className='flex justify-between items-baseline gap-4'>
              <span className='text-[10px] font-bold text-slate-400 uppercase tracking-tighter shrink-0'>{info!.label}:</span>
              <span className={cn("text-right font-bold text-slate-900 truncate", info!.label === "ORDER NO" ? "text-[12px] tracking-tight" : "text-[10px]")}>{info!.value}</span>
            </div>
          ))}
      </div>

      <div className='border-t border-slate-900 my-2' />

      {/* Items */}
      <div className='space-y-4 mb-8'>
        <div className='flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400 mb-4 pb-2 border-b border-slate-100'>
          <ShoppingBag size={10} />
          <span>Order Items</span>
        </div>

        {items.map((item, idx) => (
          <div key={idx} className='space-y-1'>
            <div className='flex justify-between items-start gap-4'>
              <span className='font-bold text-slate-900 leading-tight uppercase'>{item.name}</span>
              <span className='font-bold text-slate-900 whitespace-nowrap pt-0.5'>
                {businessDetails.currency} {item.total.toFixed(2)}
              </span>
            </div>
            <div className='flex justify-between items-center text-[9px] text-slate-400 font-bold uppercase italic pl-1'>
              <span>
                {businessDetails.currency} {item.price.toFixed(2)} x {item.quantity}
              </span>
            </div>
          </div>
        ))}
      </div>

      {returnedItems && returnedItems.length > 0 && (
        <>
          <div className='border-t border-dashed border-slate-300 my-4' />
          <div className='space-y-3 mb-6'>
            <div className='flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-amber-600 mb-2 pb-1 border-b border-amber-50'>
              <RotateCcw size={10} />
              <span>Items Surrendered (Exchange)</span>
            </div>
            {returnedItems.map((item, idx) => (
              <div key={idx} className='flex justify-between items-baseline gap-4 opacity-70'>
                <span className='font-bold text-slate-700 leading-tight uppercase'>{item.name}</span>
                <span className='font-bold text-slate-700 whitespace-nowrap text-[9px]'>
                  ({businessDetails.currency} {item.price.toFixed(2)} x {item.quantity})
                </span>
                <span className='font-bold text-slate-900 whitespace-nowrap'>
                  - {businessDetails.currency} {item.total.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Summary */}
      <div className='space-y-2 border-t-2 border-slate-900 pt-4'>
        <div className='flex justify-between items-center text-slate-500 font-bold uppercase text-[10px]'>
          <span>Subtotal</span>
          <span>
            {businessDetails.currency} {subtotal.toFixed(2)}
          </span>
        </div>
        {discount > 0 && (
          <div className='flex justify-between items-center text-emerald-600 font-bold uppercase text-[10px]'>
            <span>Discount</span>
            <span>
              -{businessDetails.currency} {discount.toFixed(2)}
            </span>
          </div>
        )}
        {storeCreditUsed !== undefined && storeCreditUsed > 0 && (
          <div className='flex justify-between items-center text-amber-600 font-bold uppercase text-[10px]'>
            <span>Store Credit</span>
            <span>
              -{businessDetails.currency} {storeCreditUsed.toFixed(2)}
            </span>
          </div>
        )}
        <div className='flex justify-between items-center pt-3 mt-1 border-t border-dashed border-slate-200 gap-4'>
          <span className='text-[12px] font-black uppercase tracking-widest text-slate-900 shrink-0'>Total Amount</span>
          <span className='text-xl font-black text-slate-900 whitespace-nowrap text-right'>
            {businessDetails.currency} {total.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Footer Message */}
      <div className='mt-8 pt-6 border-t border-dashed border-slate-200 text-center space-y-2'>
        <p className='font-bold uppercase tracking-widest text-[9px] text-slate-400'>~ {businessDetails.footerMessage || "Thank you for your visit"} ~</p>

        {/* Order QR Code for quick return/exchange */}
        {orderNo && (
          <div className='flex flex-col items-center gap-2 py-4'>
            <div className='p-2 bg-white border border-slate-100 rounded-lg shadow-sm'>
              <QRCode value={orderNo} size={80} level='H' />
            </div>
            <p className='text-[8px] font-bold text-slate-300 tracking-tighter uppercase'>Scan for Return / Exchange</p>
          </div>
        )}

        <div className='flex items-center justify-center gap-2 opacity-30'>
          <div className='h-1 w-1 rounded-full bg-slate-900' />
          <div className='h-1 w-1 rounded-full bg-slate-900' />
          <div className='h-1 w-1 rounded-full bg-slate-900' />
        </div>
        {businessDetails.website && <p className='text-[8px] text-slate-300 font-bold'>{businessDetails.website}</p>}
      </div>
    </div>
  );
};
