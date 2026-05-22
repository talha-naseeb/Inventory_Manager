import React, { useState } from "react";
import { Minus, Plus, Trash2, GripVertical, Eye, EyeOff } from "lucide-react";
import { useThemeStore } from "../../store/useThemeStore";
import { cn } from "../../lib/utils";
import { useBusinessProfile } from "../../hooks/useBusinessProfile";

interface CartItemProps {
  id: string;
  productId?: string;
  name: string;
  price: number;
  wholesalePrice: number;
  quantity: number;
  total: number;
  priceType?: "retail" | "wholesale";
  unit?: string;
  isReturn?: boolean;
  onUpdateQty: (qty: number) => void;
  onUpdatePrice?: (newPrice: number) => void;
}

export const CartItem: React.FC<CartItemProps> = ({ name, price, wholesalePrice, quantity, total, priceType, unit, isReturn, onUpdateQty, onUpdatePrice }) => {
  const { businessDetails } = useThemeStore();
  const profile = useBusinessProfile();
  const currency = businessDetails.currency;
  const normalizedUnit = unit?.trim();
  const usesProfileUnit =
    !normalizedUnit || normalizedUnit === "item" || normalizedUnit === profile.stockUnit.singular || normalizedUnit === profile.stockUnit.plural || normalizedUnit === profile.stockUnit.abbr;
  const displayUnit = usesProfileUnit ? profile.stockUnitAbbr : normalizedUnit;
  const quantityStep = normalizedUnit === "suit" ? 4 : 1;

  const [showPrice, setShowPrice] = useState(true);

  const handlePriceUpdate = (valStr: string) => {
    const val = parseFloat(valStr);
    if (!isNaN(val) && onUpdatePrice) {
      onUpdatePrice(val);
    }
  };

  const handleQtyUpdate = (valStr: string) => {
    const val = parseFloat(valStr);
    if (!isNaN(val)) {
      onUpdateQty(val);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-3 p-4 rounded-2xl transition-all group",
        isReturn
          ? "bg-rose-50/50 dark:bg-rose-500/5 border border-dashed border-rose-200 dark:border-rose-500/20"
          : "bg-white dark:bg-dark-surface border border-slate-100 dark:border-dark-border hover:shadow-md",
      )}
    >
      {/* Row 1: Header (Name + Badges + Trash) */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2 min-w-0'>
          {!isReturn && (
            <div className='text-slate-300 group-hover:text-slate-400 cursor-grab active:cursor-grabbing'>
              <GripVertical size={14} />
            </div>
          )}
          <h5 className='font-bold text-sm truncate text-slate-900 dark:text-white'>{name}</h5>
          {isReturn && <span className='px-1.5 py-0.5 bg-rose-100 text-rose-600 text-[8px] font-black uppercase rounded'>Return</span>}
          {priceType === "wholesale" && <span className='px-1.5 py-0.5 bg-amber-100 text-amber-600 text-[8px] font-black uppercase rounded'>WS</span>}
        </div>
        {!isReturn && (
          <button onClick={() => onUpdateQty(0)} className='p-1.5 text-slate-300 hover:text-rose-500 transition-colors'>
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Row 2: Controls (Price + Qty) */}
      <div className='flex items-center gap-4 bg-slate-50 dark:bg-dark-bg/50 p-2 rounded-xl border border-slate-100/50 dark:border-dark-border/50'>
        {/* Price Input Area */}
        <div className='flex items-center gap-1.5 flex-1'>
          {!showPrice ? (
            <div className='text-xs font-black tracking-[0.2em] text-slate-300 flex-1'>****</div>
          ) : (
            <div className='flex items-center gap-1 bg-white dark:bg-dark-surface px-2 py-1 rounded-lg shadow-sm border border-slate-100 dark:border-dark-border'>
              <span className='text-[10px] font-bold text-slate-400'>{currency}</span>
              <input
                type='number'
                step='0.01'
                value={price}
                onChange={(e) => handlePriceUpdate(e.target.value)}
                disabled={isReturn}
                className={cn("w-20 px-0 py-0 text-xs font-black bg-transparent border-none focus:ring-0 text-slate-700 dark:text-slate-300", price < wholesalePrice && !isReturn && "text-rose-500")}
              />
            </div>
          )}
          <button type='button' onClick={() => setShowPrice(!showPrice)} className='p-1 text-slate-300 hover:text-primary transition-all'>
            {showPrice ? <Eye size={12} /> : <EyeOff size={12} />}
          </button>
        </div>

        <div className='text-slate-300 font-bold'>×</div>

        {/* Qty Controls Area */}
        <div className='flex items-center bg-white dark:bg-dark-surface rounded-lg px-2 py-1 shadow-sm border border-slate-100 dark:border-dark-border'>
          {isReturn ? (
            <span className='text-xs font-bold text-slate-500'>
              {quantity} {displayUnit}
            </span>
          ) : (
            <div className='flex items-center gap-1.5'>
              <button onClick={() => onUpdateQty(quantity - quantityStep)} className='p-0.5 text-slate-400 hover:text-rose-500'>
                <Minus size={12} strokeWidth={3} />
              </button>
              <div className='flex items-center'>
                <input
                  type='number'
                  step='0.01'
                  value={quantity}
                  onChange={(e) => handleQtyUpdate(e.target.value)}
                  className='w-12 text-center text-xs font-black bg-transparent border-none focus:ring-0 p-0 text-primary'
                />
                <span className='text-[9px] font-black uppercase text-slate-400 ml-0.5'>{displayUnit}</span>
              </div>
              <button onClick={() => onUpdateQty(quantity + quantityStep)} className='p-0.5 text-slate-400 hover:text-primary'>
                <Plus size={12} strokeWidth={3} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Totals (Dedicated Line) */}
      <div className='flex items-center justify-between pt-2 border-t border-slate-50 dark:border-dark-border'>
        <div className='flex flex-col'>
          <span className='text-[8px] font-black uppercase text-slate-400 tracking-[0.2em]'>Item Price</span>
          <span className='text-[10px] font-bold text-slate-500'>
            {currency} {price.toFixed(2)}
          </span>
          <span className='text-[10px] font-bold text-slate-500'>{`${quantity}${displayUnit} × ${currency} ${price.toFixed(2)}`}</span>
        </div>
        <div className='flex flex-col items-end'>
          <span className='text-[8px] font-black uppercase text-slate-400 tracking-[0.2em]'>Line Total</span>
          <span className={cn("font-black text-sm", isReturn ? "text-rose-600" : "text-primary")}>
            {isReturn ? "-" : ""}
            {currency} {total.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
};
