import React from "react";
import { Minus, Plus, Trash2, GripVertical } from "lucide-react";

interface CartItemProps {
  name: string;
  price: number;
  quantity: number;
  total: number;
  onUpdateQty: (qty: number) => void;
}

export const CartItem: React.FC<CartItemProps> = ({ name, price, quantity, total, onUpdateQty }) => {
  return (
    <div className='flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group'>
      <div className='text-slate-300 group-hover:text-slate-400 dark:text-slate-700 dark:group-hover:text-slate-600 cursor-grab active:cursor-grabbing'>
        <GripVertical size={16} />
      </div>
      <div className='flex-1 min-w-0'>
        <h5 className='font-bold text-sm truncate'>{name}</h5>
        <p className='text-xs text-slate-500'>Rs. {price.toFixed(2)} / unit</p>
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
        <span className='font-bold text-sm'>Rs. {total.toFixed(2)}</span>
      </div>
    </div>
  );
};
