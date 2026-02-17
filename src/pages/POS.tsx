import React, { useState } from "react";
import { Search, ShoppingCart, Trash2, CreditCard, Banknote, User } from "lucide-react";
import { motion, Reorder } from "framer-motion";
import { ProductCard } from "../components/pos/ProductCard";
import { CartItem } from "../components/pos/CartItem";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { CheckoutModal } from "../components/pos/CheckoutModal";
import { usePOSStore } from "../store/usePOSStore";
import { MOCK_PRODUCTS } from "../services/mockData";
import { cn } from "../lib/utils";

export const POS: React.FC = () => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [initialPaymentMethod, setInitialPaymentMethod] = useState<"cash" | "card" | null>(null);

  const { cart, updateQuantity, reorderCart, clearCart, subtotal, discount, total, discountType, discountValue, setDiscount, customerName, setCustomerName } = usePOSStore();

  const handleOpenCheckout = (method: "cash" | "card" | null = null) => {
    setInitialPaymentMethod(method);
    setIsCheckoutOpen(true);
  };

  const filteredProducts = MOCK_PRODUCTS.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "All" || p.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className='flex flex-col lg:flex-row h-full gap-4 lg:gap-6 max-w-[1600px] mx-auto overflow-hidden'>
      {/* Product Grid Section */}
      <div className='flex-1 flex flex-col min-w-0 min-h-0 h-[45vh] lg:h-full'>
        <div className='mb-4 lg:mb-6 flex flex-col sm:flex-row gap-4'>
          <div className='relative flex-1'>
            <Search className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-400' size={18} />
            <Input placeholder='Search products...' className='pl-11 h-12' value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className='flex bg-white dark:bg-dark-surface rounded-xl border border-slate-200 dark:border-dark-border p-1 overflow-x-auto scrollbar-hide'>
            {["All", "Beverages", "Bakery", "Dairy"].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={cn("px-4 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap", category === cat ? "bg-primary text-white" : "hover:bg-slate-50 dark:hover:bg-slate-800")}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className='flex-1 overflow-y-auto pr-2 flex flex-wrap align-content-start content-start gap-4 pb-8 scrollbar-hide'>
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>

      {/* Cart Sidebar Section */}
      <div className='w-full lg:w-[450px] xl:w-[600px] flex flex-col h-[55vh] lg:h-full shrink-0 border-t lg:border-t-0 lg:border-l border-slate-100 dark:border-dark-border lg:pl-6'>
        <Card className='flex-1 flex flex-col overflow-hidden border-none shadow-xl dark:shadow-none bg-white dark:bg-dark-surface'>
          <CardHeader className='flex flex-row items-center justify-between py-3 px-4 border-b border-slate-50 dark:border-dark-border'>
            <div className='flex items-center gap-2'>
              <ShoppingCart size={18} className='text-primary' />
              <CardTitle className='text-base'>Current Order</CardTitle>
              <div className='bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full'>{cart.length}</div>
            </div>
            <Button variant='ghost' size='icon' onClick={clearCart} disabled={cart.length === 0} className='h-8 w-8 text-slate-400 hover:text-danger'>
              <Trash2 size={16} />
            </Button>
          </CardHeader>

          <CardContent className='flex-1 overflow-y-auto p-4 space-y-1 scrollbar-hide'>
            {cart.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className='h-full flex flex-col items-center justify-center text-slate-400 space-y-4 py-12'>
                <div className='w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-200 dark:text-slate-700'>
                  <ShoppingCart size={32} />
                </div>
                <p className='font-medium text-sm text-center'>Your cart is empty.</p>
              </motion.div>
            ) : (
              <Reorder.Group axis='y' values={cart} onReorder={reorderCart} className='space-y-1'>
                {cart.map((item) => (
                  <Reorder.Item key={item.productId} value={item} className='cursor-grab active:cursor-grabbing'>
                    <CartItem {...item} onUpdateQty={(qty) => updateQuantity(item.productId, qty)} />
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            )}
          </CardContent>

          {/* Pricing Summary */}
          <div className='p-4 lg:p-5 bg-slate-50/50 dark:bg-dark-bg/50 border-t border-slate-100 dark:border-dark-border space-y-4'>
            <div className='space-y-3'>
              {/* Recipient Name Input */}
              <div className='relative'>
                <User className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400' size={14} />
                <Input
                  placeholder='Recipient Name (Required)'
                  className={cn("pl-9 h-10 text-xs bg-white dark:bg-dark-surface", !customerName.trim() && "border-danger focus-visible:ring-danger")}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>

              <div className='flex justify-between items-center text-xs'>
                <span className='text-slate-500 font-medium'>Subtotal</span>
                <span className='font-bold text-slate-700 dark:text-slate-300'>Rs. {subtotal.toFixed(2)}</span>
              </div>

              {/* Discount Controls - Compacting */}
              <div className='flex items-center gap-3 bg-white dark:bg-dark-surface p-2 rounded-xl border border-slate-200 dark:border-dark-border'>
                <div className='flex bg-slate-100 dark:bg-dark-bg rounded-lg p-0.5'>
                  <button
                    onClick={() => setDiscount(discountValue, "fixed")}
                    className={cn(
                      "w-7 h-7 flex items-center justify-center text-[10px] font-bold rounded-md transition-colors",
                      discountType === "fixed" ? "bg-white dark:bg-dark-surface text-primary shadow-sm" : "text-slate-400",
                    )}
                  >
                    Rs.
                  </button>
                  <button
                    onClick={() => setDiscount(discountValue, "percent")}
                    className={cn(
                      "w-7 h-7 flex items-center justify-center text-[10px] font-bold rounded-md transition-colors",
                      discountType === "percent" ? "bg-white dark:bg-dark-surface text-primary shadow-sm" : "text-slate-400",
                    )}
                  >
                    %
                  </button>
                </div>
                <Input
                  type='number'
                  className='h-8 text-right font-bold border-none bg-transparent focus-visible:ring-0 px-0'
                  placeholder='Discount'
                  value={discountValue || ""}
                  onChange={(e) => setDiscount(Number(e.target.value), discountType)}
                />
              </div>

              <div className='pt-3 border-t border-slate-200 dark:border-dark-border flex justify-between items-center'>
                <span className='font-bold text-sm uppercase tracking-tight'>Payable</span>
                <div className='text-right'>
                  <span className='block text-xl font-black text-primary font-display leading-none'>Rs. {total.toFixed(2)}</span>
                  {discount > 0 && <span className='text-[10px] text-emerald-500 font-bold uppercase tracking-widest'>- Saved Rs. {discount.toFixed(2)}</span>}
                </div>
              </div>
            </div>

            <div className='flex gap-2'>
              <Button variant='outline' className='flex-1 h-12 flex items-center justify-center gap-2' disabled={cart.length === 0 || !customerName.trim()} onClick={() => handleOpenCheckout("cash")}>
                <Banknote size={16} />
                <span className='text-[10px] uppercase font-bold tracking-wider'>Cash</span>
              </Button>
              <Button className='flex-1 h-12 flex items-center justify-center gap-2' disabled={cart.length === 0 || !customerName.trim()} onClick={() => handleOpenCheckout("card")}>
                <CreditCard size={16} />
                <span className='text-[10px] uppercase font-bold tracking-wider'>Card</span>
              </Button>
            </div>

            <Button className='w-full h-12 bg-emerald-600 hover:bg-emerald-700' size='lg' disabled={cart.length === 0 || !customerName.trim()} onClick={() => handleOpenCheckout()}>
              Complete Checkout
            </Button>
          </div>
        </Card>
      </div>

      <CheckoutModal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} onSuccess={() => setIsCheckoutOpen(false)} initialPaymentMethod={initialPaymentMethod} />
    </div>
  );
};
