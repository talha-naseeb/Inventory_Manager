import { create } from "zustand";
import type { Product, OrderItem } from "../types";

interface CartItem extends OrderItem {
  id: string; // unique cart item id (e.g., productId-priceType)
}

interface POSState {
  cart: CartItem[];
  addItem: (product: Product, isWholesale?: boolean) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
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
  storeCredit: number;
  setTaxEnabled: (enabled: boolean) => void;
  setDiscount: (value: number, type: "fixed" | "percent") => void;
  setCustomerName: (name: string) => void;
  setStoreCredit: (amount: number) => void;
}

const TAX_RATE = 0.08; // 8%

export const usePOSStore = create<POSState>((set, get) => {
  const calculateTotals = (cart: CartItem[], isTaxEnabled: boolean, discountValue: number, discountType: "fixed" | "percent", storeCredit: number) => {
    const subtotal = cart.reduce((sum, item) => sum + item.total, 0);

    let discount = 0;
    if (discountType === "percent") {
      discount = subtotal * (discountValue / 100);
    } else {
      discount = discountValue;
    }

    const subtotalAfterDiscount = Math.max(0, subtotal - discount);
    const tax = isTaxEnabled ? subtotalAfterDiscount * TAX_RATE : 0;
    const total = Math.max(0, subtotalAfterDiscount + tax - storeCredit);

    return { subtotal, tax, discount, total };
  };

  return {
    cart: [],
    subtotal: 0,
    tax: 0,
    discount: 0,
    total: 0,
    isTaxEnabled: false,
    discountType: "fixed",
    discountValue: 0,
    customerName: "Cash Customer",
    storeCredit: 0,

    setCustomerName: (name: string) => set({ customerName: name }),

    setStoreCredit: (amount: number) => {
      const { cart, isTaxEnabled, discountValue, discountType } = get();
      set({ storeCredit: amount, ...calculateTotals(cart, isTaxEnabled, discountValue, discountType, amount) });
    },

    setTaxEnabled: (enabled: boolean) => {
      const { cart, discountValue, discountType, storeCredit } = get();
      set({ isTaxEnabled: enabled, ...calculateTotals(cart, enabled, discountValue, discountType, storeCredit) });
    },

    setDiscount: (value: number, type: "fixed" | "percent") => {
      const { cart, isTaxEnabled, storeCredit } = get();
      set({ discountValue: value, discountType: type, ...calculateTotals(cart, isTaxEnabled, value, type, storeCredit) });
    },

    addItem: (product: Product, isWholesale = false) => {
      const { cart, isTaxEnabled, discountValue, discountType, storeCredit } = get();
      const priceToUse = isWholesale ? product.wholesalePrice : product.price;
      const priceType: "retail" | "wholesale" = isWholesale ? "wholesale" : "retail";
      const itemId = `${product.id}-${priceType}`;

      const existingItem = cart.find((item) => item.id === itemId);

      let newCart;
      if (existingItem) {
        newCart = cart.map((item) => (item.id === itemId ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price } : item));
      } else {
        newCart = [
          ...cart,
          {
            id: itemId,
            productId: product.id,
            name: product.name,
            quantity: 1,
            price: priceToUse,
            total: priceToUse,
            priceType,
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
        storeCredit: 0,
      }),
  };
});
