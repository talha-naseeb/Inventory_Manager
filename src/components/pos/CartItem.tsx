import React, { useState } from "react";
import { Minus, Plus, Trash2, GripVertical, Edit2, Check, X } from "lucide-react";
import { useThemeStore } from "../../store/useThemeStore";
import { useAuthStore } from "../../store/useAuthStore";

interface CartItemProps {
  id: string;
  productId?: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
  priceType?: "retail" | "wholesale";
  unit?: string;
  onUpdateQty: (qty: number) => void;
  onUpdatePrice?: (newPrice: number) => void;
}

export const CartItem: React.FC<CartItemProps> = ({ name, price, quantity, total, priceType, unit, onUpdateQty, onUpdatePrice }) => {
  const { businessDetails } = useThemeStore();
  const { currentStaff } = useAuthStore();
  const currency = businessDetails.currency;

  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [editedPrice, setEditedPrice] = useState(price.toString());

  // Check if user can edit prices (Admin or Manager only)
  const canEditPrice = currentStaff && (currentStaff.role === "admin" || currentStaff.role === "manager") && onUpdatePrice;

  const handlePriceEdit = () => {
    setEditedPrice(price.toString());
    setIsEditingPrice(true);
  };

  const handlePriceSave = () => {
    const newPrice = parseFloat(editedPrice);
    if (isNaN(newPrice) || newPrice <= 0) {
      alert("Please enter a valid price greater than 0");
      setEditedPrice(price.toString());
      return;
    }
    if (onUpdatePrice) {
      onUpdatePrice(newPrice);
    }
    setIsEditingPrice(false);
  };

  const handlePriceCancel = () => {
    setEditedPrice(price.toString());
    setIsEditingPrice(false);
  };

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

        {/* Price per unit - editable for Admin/Manager */}
        <div className='flex items-center gap-1'>
          {isEditingPrice ? (
            <div className='flex items-center gap-1'>
              <input
                type='number'
                step='0.01'
                value={editedPrice}
                onChange={(e) => setEditedPrice(e.target.value)}
                className='w-20 px-2 py-0.5 text-xs border border-primary rounded focus:outline-none focus:ring-1 focus:ring-primary'
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handlePriceSave();
                  if (e.key === "Escape") handlePriceCancel();
                }}
              />
              <button onClick={handlePriceSave} className='p-0.5 text-green-600 hover:text-green-700'>
                <Check size={14} />
              </button>
              <button onClick={handlePriceCancel} className='p-0.5 text-rose-600 hover:text-rose-700'>
                <X size={14} />
              </button>
            </div>
          ) : (
            <>
              <p className='text-xs text-slate-500'>
                {currency} {price.toFixed(2)} / {unit || "item"}
              </p>
              {canEditPrice && (
                <button onClick={handlePriceEdit} className='opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-primary transition-all' title='Edit price (Admin/Manager only)'>
                  <Edit2 size={12} />
                </button>
              )}
            </>
          )}
        </div>
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
