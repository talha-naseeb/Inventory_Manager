import { create } from "zustand";
import type { Product, OrderItem } from "../types";

interface CartItem extends OrderItem {
  id: string; // productId for easier mapping
}

interface POSState {
  cart: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
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
  setTaxEnabled: (enabled: boolean) => void;
  setDiscount: (value: number, type: "fixed" | "percent") => void;
  setCustomerName: (name: string) => void;
}

const TAX_RATE = 0.08; // 8%

export const usePOSStore = create<POSState>((set, get) => {
  const calculateTotals = (cart: CartItem[], isTaxEnabled: boolean, discountValue: number, discountType: "fixed" | "percent") => {
    const subtotal = cart.reduce((sum, item) => sum + item.total, 0);

    let discount = 0;
    if (discountType === "percent") {
      discount = subtotal * (discountValue / 100);
    } else {
      discount = discountValue;
    }

    const subtotalAfterDiscount = Math.max(0, subtotal - discount);
    const tax = isTaxEnabled ? subtotalAfterDiscount * TAX_RATE : 0;
    const total = subtotalAfterDiscount + tax;

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

    setCustomerName: (name) => set({ customerName: name }),

    setTaxEnabled: (enabled) => {
      const { cart, discountValue, discountType } = get();
      set({ isTaxEnabled: enabled, ...calculateTotals(cart, enabled, discountValue, discountType) });
    },

    setDiscount: (value, type) => {
      const { cart, isTaxEnabled } = get();
      set({ discountValue: value, discountType: type, ...calculateTotals(cart, isTaxEnabled, value, type) });
    },

    addItem: (product) => {
      const { cart, isTaxEnabled, discountValue, discountType } = get();
      const existingItem = cart.find((item) => item.productId === product.id);

      let newCart;
      if (existingItem) {
        newCart = cart.map((item) => (item.productId === product.id ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price } : item));
      } else {
        newCart = [
          ...cart,
          {
            id: product.id,
            productId: product.id,
            name: product.name,
            quantity: 1,
            price: product.price,
            total: product.price,
          },
        ];
      }

      set({ cart: newCart, ...calculateTotals(newCart, isTaxEnabled, discountValue, discountType) });
    },

    removeItem: (productId) => {
      const { cart, isTaxEnabled, discountValue, discountType } = get();
      const newCart = cart.filter((item) => item.productId !== productId);
      set({ cart: newCart, ...calculateTotals(newCart, isTaxEnabled, discountValue, discountType) });
    },

    updateQuantity: (productId, quantity) => {
      if (quantity <= 0) {
        get().removeItem(productId);
        return;
      }

      const { cart, isTaxEnabled, discountValue, discountType } = get();
      const newCart = cart.map((item) => (item.productId === productId ? { ...item, quantity, total: quantity * item.price } : item));
      set({ cart: newCart, ...calculateTotals(newCart, isTaxEnabled, discountValue, discountType) });
    },

    reorderCart: (newCart) => {
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
      }),
  };
});
