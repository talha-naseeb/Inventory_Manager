import React, { useState, useEffect, useRef } from "react";
import { Search, ShoppingCart, Trash2, CreditCard, Banknote, User, Zap, ZapOff, ArrowRightLeft, X, UserCheck } from "lucide-react";
import { motion, Reorder } from "framer-motion";
import { ProductCard } from "../components/pos/ProductCard";
import { CartItem } from "../components/pos/CartItem";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { CheckoutModal } from "../components/pos/CheckoutModal";
import { usePOSStore } from "../store/usePOSStore";
import { useThemeStore } from "../store/useThemeStore";
import { cn } from "../lib/utils";

export const POS: React.FC = () => {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [wholesaleMode, setWholesaleMode] = useState(false);
  const [initialPaymentMethod, setInitialPaymentMethod] = useState<"cash" | "card" | null>(null);

  // Customer picker state
  const [customerResults, setCustomerResults] = useState<{ id: string; name: string; phone: string | null }[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomerName, setSelectedCustomerName] = useState("");
  const [manualName, setManualName] = useState("Cash Customer");
  const [saveAsCustomer, setSaveAsCustomer] = useState(false);
  const customerPickerRef = useRef<HTMLDivElement>(null);

  const {
    products,
    fetchProducts,
    cart,
    updateQuantity,
    updateItemPrice,
    reorderCart,
    clearCart,
    subtotal,
    discount,
    total,
    discountType,
    discountValue,
    setDiscount,
    customerId,
    setCustomerId,
    storeCredit,
    setStoreCredit,
  } = usePOSStore();
  const { businessDetails } = useThemeStore();
  const currency = businessDetails.currency;

  useEffect(() => {
    fetchProducts(search, selectedCategory);
  }, [search, selectedCategory, fetchProducts]);

  // Search customers as user types (single input drives both name + search)
  useEffect(() => {
    if (!manualName.trim() || manualName.trim().toLowerCase() === "cash customer") {
      setCustomerResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const { dbService } = await import("../services/database");
        const results = await dbService.query<{ id: string; name: string; phone: string | null }>(`SELECT id, name, phone FROM customers WHERE name LIKE ? OR phone LIKE ? LIMIT 6`, [
          `%${manualName}%`,
          `%${manualName}%`,
        ]);
        setCustomerResults(results);
      } catch {
        setCustomerResults([]);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [manualName]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (customerPickerRef.current && !customerPickerRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectCustomer = (c: { id: string; name: string; phone: string | null }) => {
    setCustomerId(c.id, c.name);
    setSelectedCustomerName(c.name);
    setManualName(c.name);
    setSaveAsCustomer(false);
    setCustomerResults([]);
    setShowCustomerDropdown(false);
  };

  const clearCustomer = () => {
    setCustomerId(null, "Cash Customer");
    setSelectedCustomerName("");
    setManualName("Cash Customer");
    setSaveAsCustomer(false);
    setCustomerResults([]);
  };

  const brands = ["All", ...new Set(products.map((p) => p.brand).filter(Boolean))];

  const handleOpenCheckout = (method: "cash" | "card" | null = null) => {
    // If manual name typed and save checkbox on, create customer first
    if (!customerId && manualName.trim() && manualName.trim().toLowerCase() !== "cash customer" && saveAsCustomer) {
      const newId = crypto.randomUUID();
      import("../services/database").then(({ dbService }) => {
        dbService.execute(`INSERT OR IGNORE INTO customers (id, name) VALUES (?, ?)`, [newId, manualName.trim()]).then(() => {
          setCustomerId(newId, manualName.trim());
          setSelectedCustomerName(manualName.trim());
          setSaveAsCustomer(false);
          setInitialPaymentMethod(method);
          setIsCheckoutOpen(true);
        });
      });
      return;
    }
    // If manual name typed but not saving, just set the name
    if (!customerId && manualName.trim()) {
      setCustomerId(null, manualName.trim());
    }
    setInitialPaymentMethod(method);
    setIsCheckoutOpen(true);
  };

  return (
    <div className='flex flex-col lg:flex-row h-full gap-4 lg:gap-6 max-w-[1600px] mx-auto overflow-hidden text-slate-900 dark:text-white'>
      {/* Product Grid Section */}
      <div className='flex-1 flex flex-col min-w-0 min-h-0 h-[45vh] lg:h-full'>
        <div className='mb-3 flex flex-col sm:flex-row gap-3 items-center'>
          <div className='relative flex-1 w-full'>
            <Search className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-400' size={18} />
            <Input placeholder='Search products...' className='pl-11 h-12' value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className='flex gap-2 w-full sm:w-auto'>
            <Button
              variant='outline'
              size='icon'
              className={cn("h-12 w-12 rounded-xl transition-all", wholesaleMode ? "bg-amber-500 text-white border-amber-600 shadow-lg shadow-amber-500/20" : "")}
              onClick={() => setWholesaleMode(!wholesaleMode)}
              title={wholesaleMode ? "Switch to Retail" : "Switch to Wholesale"}
            >
              {wholesaleMode ? <Zap size={20} /> : <ZapOff size={20} />}
            </Button>
          </div>
        </div>

        <div className='flex gap-2 overflow-x-auto pb-3 scrollbar-hide'>
          {brands.map((brand) => (
            <button
              key={brand}
              onClick={() => setSelectedCategory(brand || "All")}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                selectedCategory === brand ? "bg-primary text-white shadow-md" : "bg-slate-100 dark:bg-dark-surface text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700",
              )}
            >
              {brand}
            </button>
          ))}
        </div>

        <div className='flex-1 overflow-y-auto pr-2 flex flex-wrap align-content-start content-start gap-4 pb-8 scrollbar-hide'>
          {products.map((product) => (
            <ProductCard key={product.id} product={product} wholesaleMode={wholesaleMode} />
          ))}
        </div>
      </div>

      {/* Cart Sidebar Section */}
      <div className='w-full lg:w-[450px] xl:w-[550px] flex flex-col h-[55vh] lg:h-full shrink-0 border-t lg:border-l border-slate-100 dark:border-dark-border lg:pl-6'>
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

          {storeCredit > 0 && (
            <div className='mx-4 mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between animate-in slide-in-from-top-2'>
              <div className='flex items-center gap-3'>
                <div className='p-2 bg-amber-500 text-white rounded-lg'>
                  <ArrowRightLeft size={16} />
                </div>
                <div>
                  <p className='text-[10px] font-black uppercase text-amber-600 tracking-wider'>Exchange Active</p>
                  <p className='text-xs font-bold text-amber-700'>
                    Credit: {currency} {storeCredit.toFixed(2)}
                  </p>
                </div>
              </div>
              <Button variant='ghost' size='icon' onClick={() => setStoreCredit(0)} className='h-8 w-8 rounded-full hover:bg-amber-500/20 text-amber-600'>
                <X size={14} />
              </Button>
            </div>
          )}

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
                    <CartItem {...item} onUpdateQty={(qty) => updateQuantity(item.id, qty)} onUpdatePrice={(newPrice) => updateItemPrice(item.id, newPrice)} />
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            )}
          </CardContent>

          {/* Pricing Summary */}
          <div className='p-4 lg:p-5 bg-slate-50/50 dark:bg-dark-bg/50 border-t border-slate-100 dark:border-dark-border space-y-4'>
            <div className='space-y-3'>
              {/* Customer Section */}
              <div ref={customerPickerRef} className='relative space-y-2'>
                {customerId ? (
                  // Linked customer chip
                  <div className='flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-xl'>
                    <UserCheck size={14} className='text-emerald-600 shrink-0' />
                    <span className='flex-1 text-sm font-semibold text-emerald-700 dark:text-emerald-400 truncate'>{selectedCustomerName}</span>
                    <button onClick={clearCustomer} className='text-emerald-500 hover:text-emerald-700 transition-colors'>
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className='space-y-2'>
                    {/* Single input: name + search combined */}
                    <div className='relative'>
                      <User className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400' size={14} />
                      <input
                        type='text'
                        value={manualName}
                        onChange={(e) => {
                          setManualName(e.target.value);
                          setShowCustomerDropdown(true);
                          setSaveAsCustomer(false);
                        }}
                        onFocus={(e) => {
                          e.target.select();
                          setShowCustomerDropdown(true);
                        }}
                        placeholder='Cash Customer'
                        className='w-full pl-9 pr-3 py-2 h-10 text-xs rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40'
                      />
                    </div>

                    {/* Save as Customer checkbox */}
                    {manualName.trim() && manualName.trim().toLowerCase() !== "cash customer" && (
                      <label className='flex items-center gap-2 cursor-pointer select-none group'>
                        <div
                          onClick={() => setSaveAsCustomer((v) => !v)}
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                            saveAsCustomer ? "bg-primary border-primary" : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                          }`}
                        >
                          {saveAsCustomer && (
                            <svg width='9' height='7' viewBox='0 0 9 7' fill='none'>
                              <path d='M1 3.5L3.5 6L8 1' stroke='white' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
                            </svg>
                          )}
                        </div>
                        <span className='text-xs text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors'>Save as new customer</span>
                      </label>
                    )}
                  </div>
                )}

                {/* Dropdown */}
                {showCustomerDropdown && customerResults.length > 0 && !customerId && (
                  <div className='absolute top-10 left-0 right-0 mt-1 bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-xl shadow-xl z-50 overflow-hidden'>
                    {customerResults.map((c) => (
                      <button
                        key={c.id}
                        onMouseDown={() => selectCustomer(c)}
                        className='w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left'
                      >
                        <div className='w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0'>{c.name[0].toUpperCase()}</div>
                        <div>
                          <p className='text-sm font-semibold text-slate-900 dark:text-white'>{c.name}</p>
                          {c.phone && <p className='text-xs text-slate-400'>{c.phone}</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className='flex justify-between items-center text-slate-500'>
                <span className='text-xs font-bold uppercase'>Subtotal</span>
                <span className='font-bold text-sm'>
                  {currency} {subtotal.toFixed(2)}
                </span>
              </div>
              <div className='flex justify-between items-center text-slate-500'>
                <span className='text-xs font-bold uppercase'>Discount</span>
                <span className='font-bold text-sm text-danger'>
                  - {currency} {discount.toFixed(2)}
                </span>
              </div>

              <div className='flex items-center gap-3 bg-white dark:bg-dark-surface p-2 rounded-xl border border-slate-200 dark:border-dark-border'>
                <div className='flex bg-slate-100 dark:bg-dark-bg rounded-lg p-0.5'>
                  <button
                    onClick={() => setDiscount(discountValue, "fixed")}
                    className={cn(
                      "w-7 h-7 flex items-center justify-center text-[10px] font-bold rounded-md transition-all",
                      discountType === "fixed" ? "bg-white dark:bg-dark-surface text-primary shadow-sm" : "text-slate-400",
                    )}
                  >
                    {currency}
                  </button>
                  <button
                    onClick={() => setDiscount(discountValue, "percent")}
                    className={cn(
                      "w-7 h-7 flex items-center justify-center text-[10px] font-bold rounded-md transition-all",
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
                  <span className='block text-xl font-black text-primary font-display leading-none'>
                    {currency} {total.toFixed(2)}
                  </span>
                  <div className='flex flex-col items-end gap-1 mt-1'>
                    {discount > 0 && (
                      <span className='text-[10px] text-emerald-500 font-bold uppercase tracking-widest leading-none'>
                        - Saved {currency} {discount.toFixed(2)}
                      </span>
                    )}
                    {storeCredit > 0 && (
                      <span className='text-[10px] text-amber-500 font-bold uppercase tracking-widest leading-none'>
                        - Credit {currency} {storeCredit.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className='flex gap-2'>
              <Button variant='outline' className='flex-1 h-12 gap-2' disabled={cart.length === 0} onClick={() => handleOpenCheckout("cash")}>
                <Banknote size={16} />
                <span className='text-[10px] uppercase font-bold tracking-wider'>Cash</span>
              </Button>
              <Button className='flex-1 h-12 gap-2' disabled={cart.length === 0} onClick={() => handleOpenCheckout("card")}>
                <CreditCard size={16} />
                <span className='text-[10px] uppercase font-bold tracking-wider'>Card</span>
              </Button>
            </div>

            <Button className='w-full h-12 bg-primary hover:bg-primary/90' size='lg' disabled={cart.length === 0} onClick={() => handleOpenCheckout()}>
              Complete Checkout
            </Button>
          </div>
        </Card>
      </div>

      <CheckoutModal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} onSuccess={() => setIsCheckoutOpen(false)} initialPaymentMethod={initialPaymentMethod} />
    </div>
  );
};
