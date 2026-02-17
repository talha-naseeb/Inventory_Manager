import React from "react";
import { Minus, Plus, Trash2, GripVertical } from "lucide-react";
import { useThemeStore } from "../../store/useThemeStore";

interface CartItemProps {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
  priceType?: "retail" | "wholesale";
  onUpdateQty: (qty: number) => void;
}

export const CartItem: React.FC<CartItemProps> = ({ name, price, quantity, total, priceType, onUpdateQty }) => {
  const { businessDetails } = useThemeStore();
  const currency = businessDetails.currency;

  return (
    <div className='flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group'>
      <div className='text-slate-300 group-hover:text-slate-400 dark:text-slate-700 dark:group-hover:text-slate-600 cursor-grab active:cursor-grabbing'>
        <GripVertical size={16} />
      </div>
      <div className='flex-1 min-w-0'>
        <div className='flex items-center gap-2'>
          <h5 className='font-bold text-sm truncate'>{name}</h5>
          {priceType === "wholesale" && (
            <span className='px-1.5 py-0.5 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[8px] font-black uppercase rounded border border-amber-200 dark:border-amber-500/30'>
              Wholesale
            </span>
          )}
        </div>
        <p className='text-xs text-slate-500'>
          {currency} {price.toFixed(2)} / unit
        </p>
      </div>

      <div className='flex items-center bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-lg p-1'>
        <button onClick={() => onUpdateQty(quantity - 1)} className='p-1 hover:text-primary transition-colors'>
          {quantity === 1 ? <Trash2 size={14} className='text-danger' /> : <Minus size={14} />}
        </button>
        <span className='w-8 text-center text-sm font-bold'>{quantity}</span>
        <button onClick={() => onUpdateQty(quantity + 1)} className='p-1 hover:text-primary transition-colors'>
          <Plus size={14} />
        </button>
      </div>

      <div className='text-right min-w-[60px]'>
        <span className='font-bold text-sm'>
          {currency} {total.toFixed(2)}
        </span>
      </div>
    </div>
  );
};
