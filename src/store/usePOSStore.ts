import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Product, OrderItem, ExchangeDraft, ExchangeTotals, ExchangeBalanceOutcome } from "../types";

interface CartItem extends OrderItem {
  id: string; // unique cart item id (e.g., productId-priceType)
  unit?: string;
  wholesalePrice: number;
}

interface POSState {
  products: Product[];
  cart: CartItem[];
  fetchProducts: (query?: string, category?: string) => Promise<void>;
  addItem: (product: Product, isWholesale?: boolean) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updateItemPrice: (id: string, newPrice: number) => void;
  reorderCart: (newCart: CartItem[]) => void;
  clearCart: () => void;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  isTaxEnabled: boolean;
  discountType: "fixed" | "percent";
  discountValue: number;
  customerName: string;
  customerId: string | null;
  storeCredit: number;
  returnExchangeData: OrderItem[] | null;
  exchangeDraft: ExchangeDraft | null;
  setTaxEnabled: (enabled: boolean) => void;
  setDiscount: (value: number, type: "fixed" | "percent") => void;
  setCustomerName: (name: string) => void;
  setCustomerId: (id: string | null, name: string) => void;
  setStoreCredit: (amount: number, returnedItems?: OrderItem[]) => void;
  startExchangeDraft: (draft: ExchangeDraft) => void;
  cancelExchangeDraft: () => void;
  getExchangeTotals: () => ExchangeTotals;
  completeOrder: (paymentMethod: string, exchangeOptions?: { balanceOutcome?: ExchangeBalanceOutcome }) => Promise<string>;
}

import { dbService } from "../services/database";

const TAX_RATE = 0.08; // 8%

export const usePOSStore = create<POSState>()(
  persist(
    (set, get) => {
      const calculateTotals = (cart: CartItem[], isTaxEnabled: boolean, discountValue: number, discountType: "fixed" | "percent", storeCredit: number) => {
        const subtotal = cart.reduce((sum, item) => sum + item.total, 0);

        let discount = 0;
        if (discountType === "percent") {
          discount = subtotal * (Math.max(0, discountValue) / 100);
        } else {
          discount = Math.max(0, discountValue);
        }

        const subtotalAfterDiscount = Math.max(0, subtotal - discount);
        const tax = isTaxEnabled ? subtotalAfterDiscount * TAX_RATE : 0;
        const total = Math.max(0, subtotalAfterDiscount + tax - storeCredit);

        return { subtotal, tax, discount, total };
      };

      return {
        products: [],
        cart: [],
        subtotal: 0,
        tax: 0,
        discount: 0,
        total: 0,
        isTaxEnabled: false,
        discountType: "fixed",
        discountValue: 0,
        customerName: "Cash Customer",
        customerId: null,
        storeCredit: 0,
        returnExchangeData: null,
        exchangeDraft: null,

        fetchProducts: async (search = "", category = "All") => {
          try {
            const res = await dbService.searchProducts(search, category);

            set({
              products: res.map((p: any) => ({
                id: p.id,
                name: p.name,
                sku: p.sku,
                price: p.price,
                wholesalePrice: p.wholesale_price,
                costPrice: p.cost_price,
                stock: p.stock,
                brand: p.brand,
                image: p.image,
                description: p.description,
                unit: p.unit || "item",
                meters_per_unit: p.meters_per_unit,
              })),
            });
          } catch (error) {
            console.error("Failed to fetch products:", error);
          }
        },

        setCustomerName: (name: string) => set({ customerName: name }),

        setCustomerId: (id: string | null, name: string) => set({ customerId: id, customerName: name }),

        setStoreCredit: (amount: number, returnedItems?: OrderItem[]) => {
          const { cart, isTaxEnabled, discountValue, discountType } = get();
          set({
            storeCredit: amount,
            returnExchangeData: returnedItems || null,
            ...calculateTotals(cart, isTaxEnabled, discountValue, discountType, amount),
          });
        },

        startExchangeDraft: (draft) => {
          const { cart, isTaxEnabled, discountValue, discountType } = get();
          set({
            exchangeDraft: draft,
            storeCredit: draft.returnCredit,
            returnExchangeData: draft.returnedItems,
            customerId: draft.customerId || null,
            customerName: draft.customerName || "Cash Customer",
            ...calculateTotals(cart, isTaxEnabled, discountValue, discountType, draft.returnCredit),
          });
        },

        cancelExchangeDraft: () => {
          const { cart, isTaxEnabled, discountValue, discountType } = get();
          set({
            exchangeDraft: null,
            storeCredit: 0,
            returnExchangeData: null,
            ...calculateTotals(cart, isTaxEnabled, discountValue, discountType, 0),
          });
        },

        getExchangeTotals: () => {
          const { exchangeDraft, subtotal, discount, tax } = get();
          const returnCredit = exchangeDraft?.returnCredit || 0;
          const newItemsTotal = Math.max(0, subtotal - discount + tax);
          return {
            returnCredit,
            newItemsTotal,
            amountDue: Math.max(0, newItemsTotal - returnCredit),
            remainingBalance: Math.max(0, returnCredit - newItemsTotal),
          };
        },

        completeOrder: async (paymentMethod: string, exchangeOptions?: { balanceOutcome?: ExchangeBalanceOutcome }) => {
          const { cart, subtotal, discount, tax, total, customerName, customerId, storeCredit, returnExchangeData, exchangeDraft } = get();
          const orderId = crypto.randomUUID();

          if (exchangeDraft) {
            const totals = get().getExchangeTotals();
            const result = await dbService.finalizeExchange({
              replacementOrderId: orderId,
              originalOrderId: exchangeDraft.originalOrderId,
              customerId,
              customerName,
              returnedItems: exchangeDraft.returnedItems,
              returnCredit: exchangeDraft.returnCredit,
              replacementItems: cart,
              paymentMethod,
              balanceOutcome: exchangeOptions?.balanceOutcome || (totals.amountDue > 0 ? "extra_paid" : "none"),
              storeCreditUsed: Math.min(totals.returnCredit, totals.newItemsTotal),
            });
            if (!result?.success) throw new Error(result?.error || "Exchange finalization failed");
            get().clearCart();
            set({ exchangeDraft: null, storeCredit: 0, returnExchangeData: null });
            return orderId;
          }

          const orderData = {
            id: orderId,
            customer_id: customerId,
            customer_name: customerName,
            subtotal,
            discount,
            tax,
            total,
            payment_method: paymentMethod,
            store_credit_used: storeCredit,
            returned_items_json: returnExchangeData ? JSON.stringify(returnExchangeData) : null,
            items: cart,
          };

          await dbService.createOrder(orderData);
          
          // Clear cart after successful order
          get().clearCart();
          set({ storeCredit: 0, returnExchangeData: null });

          return orderId;
        },

        setTaxEnabled: (enabled: boolean) => {
          const { cart, discountValue, discountType, storeCredit } = get();
          set({ isTaxEnabled: enabled, ...calculateTotals(cart, enabled, discountValue, discountType, storeCredit) });
        },

        setDiscount: (value: number, type: "fixed" | "percent") => {
          const { cart, isTaxEnabled, storeCredit } = get();
          const clampedValue = Math.max(0, value);
          set({ discountValue: clampedValue, discountType: type, ...calculateTotals(cart, isTaxEnabled, clampedValue, type, storeCredit) });
        },

        addItem: (product: Product, isWholesale = false) => {
          const { cart, isTaxEnabled, discountValue, discountType, storeCredit } = get();
          const priceToUse = isWholesale ? product.wholesalePrice : product.price;
          const priceType: "retail" | "wholesale" = isWholesale ? "wholesale" : "retail";
          const itemId = `${product.id}-${priceType}`;

          const existingItem = cart.find((item) => item.id === itemId);

          // Default quantity is 1 OR meters_per_unit if it's > 1 (e.g. 4m for fabric)
          const defaultQty = product.meters_per_unit && product.meters_per_unit > 1 ? product.meters_per_unit : 1;

          let newCart;
          if (existingItem) {
            const nextQty = existingItem.quantity + defaultQty;
            newCart = cart.map((item) => (item.id === itemId ? { ...item, quantity: nextQty, total: nextQty * item.price } : item));
          } else {
            newCart = [
              ...cart,
              {
                id: itemId,
                productId: product.id,
                name: product.name,
                quantity: defaultQty,
                price: priceToUse,
                total: priceToUse * defaultQty,
                priceType,
                unit: product.unit || "item",
                wholesalePrice: product.wholesalePrice,
              },
            ];
          }

          set({ cart: newCart, ...calculateTotals(newCart, isTaxEnabled, discountValue, discountType, storeCredit) });
        },

        removeItem: (id: string) => {
          const { cart, isTaxEnabled, discountValue, discountType, storeCredit } = get();
          const newCart = cart.filter((item) => item.id !== id);
          set({ cart: newCart, ...calculateTotals(newCart, isTaxEnabled, discountValue, discountType, storeCredit) });
        },

        updateQuantity: (id: string, quantity: number) => {
          if (quantity <= 0) {
            get().removeItem(id);
            return;
          }

          const { cart, isTaxEnabled, discountValue, discountType, storeCredit } = get();
          const newCart = cart.map((item) => (item.id === id ? { ...item, quantity, total: quantity * item.price } : item));
          set({ cart: newCart, ...calculateTotals(newCart, isTaxEnabled, discountValue, discountType, storeCredit) });
        },

        updateItemPrice: (id: string, newPrice: number) => {
          const { cart, isTaxEnabled, discountValue, discountType, storeCredit } = get();
          const updatedCart = cart.map((item) =>
            item.id === id
              ? {
                  ...item,
                  price: newPrice,
                  total: newPrice * item.quantity,
                }
              : item,
          );
          set({ cart: updatedCart, ...calculateTotals(updatedCart, isTaxEnabled, discountValue, discountType, storeCredit) });
        },

        reorderCart: (newCart: CartItem[]) => {
          set({ cart: newCart });
        },

        clearCart: () =>
          set({
            cart: [],
            subtotal: 0,
            tax: 0,
            discount: 0,
            total: 0,
            discountValue: 0,
            customerName: "Cash Customer",
            customerId: null,
          }),
      };
    },
    {
      name: "pos-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        cart: state.cart,
        customerName: state.customerName,
        customerId: state.customerId,
        isTaxEnabled: state.isTaxEnabled,
        discountType: state.discountType,
        discountValue: state.discountValue,
        storeCredit: state.storeCredit,
        exchangeDraft: state.exchangeDraft,
      }),
    }
  )
);
