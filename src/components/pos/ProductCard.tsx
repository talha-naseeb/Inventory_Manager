import React from "react";
import type { Product } from "../../types";
import { Card } from "../ui/Card";
import { Plus, Minus } from "lucide-react";
import { usePOSStore } from "../../store/usePOSStore";
import { cn } from "../../lib/utils";

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { cart, addItem, updateQuantity } = usePOSStore();

  const cartItem = cart.find((item) => item.productId === product.id);
  const quantity = cartItem?.quantity || 0;

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem(product);
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (quantity > 0) {
      updateQuantity(product.id, quantity - 1);
    }
  };

  return (
    <Card
      className={cn(
        "group flex flex-col overflow-hidden transition-all border-slate-100 dark:border-dark-border bg-white dark:bg-dark-surface shadow-sm hover:shadow-md cursor-default p-4 h-[fit-content] gap-4 flex-[1_1_200px] min-w-[200px] max-w-[250px]",
        quantity > 0 && "border-primary/40 ring-1 ring-primary/10",
      )}
    >
      {/* Top Section: Image + Info */}
      <div className='flex gap-3'>
        {/* Product Image */}
        <div className='w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center border border-slate-50 dark:border-dark-border'>
          {product.image ? (
            <img src={product.image} alt={product.name} className='w-full h-full object-cover' />
          ) : (
            <div className='text-2xl font-black text-slate-200 dark:text-slate-700 font-display select-none'>{product.name.charAt(0)}</div>
          )}
        </div>

        {/* Product Info */}
        <div className='flex-1 min-w-0 flex flex-col justify-center'>
          <h4 className='font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 truncate leading-tight'>{product.name}</h4>
          <p className='text-[10px] text-slate-400 dark:text-slate-500 line-clamp-2 leading-tight mt-1'>{product.description || "Fresh quality item."}</p>
          <span className='text-[8px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest mt-1'>{product.category}</span>
        </div>
      </div>

      {/* Bottom Section: Price Left, Controls Right */}
      <div className='flex items-center justify-between mt-auto pt-1'>
        {/* Price Left */}
        <div className='flex items-baseline gap-0.5 text-slate-900 dark:text-white'>
          <span className='text-[10px] font-black'>Rs.</span>
          <span className='text-sm sm:text-base font-black leading-none'>{product.price.toFixed(1)}</span>
        </div>

        {/* Quantity Controls Right */}
        <div className='flex items-center bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-dark-border rounded-full p-0.5 shadow-inner'>
          <button
            onClick={handleDecrement}
            disabled={quantity === 0}
            className={cn(
              "w-7 h-7 flex items-center justify-center rounded-full transition-all",
              quantity > 0 ? "text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-dark-surface shadow-sm" : "text-slate-200 dark:text-slate-700 cursor-not-allowed",
            )}
          >
            <Minus size={14} strokeWidth={3} />
          </button>

          <span className={cn("w-6 text-center text-[10px] sm:text-xs font-black transition-all", quantity === 0 ? "text-slate-300 dark:text-slate-600" : "text-slate-900 dark:text-white")}>
            {quantity}
          </span>

          <button
            onClick={handleIncrement}
            className='w-7 h-7 flex items-center justify-center bg-primary text-white rounded-full hover:bg-primary/90 shadow-md shadow-primary/20 transition-all active:scale-90'
          >
            <Plus size={14} strokeWidth={3} />
          </button>
        </div>
      </div>
    </Card>
  );
};
