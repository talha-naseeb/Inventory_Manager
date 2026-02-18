import { create } from "zustand";
import type { Product, OrderItem } from "../types";

interface CartItem extends OrderItem {
  id: string; // unique cart item id (e.g., productId-priceType)
  unit?: string;
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
  setTaxEnabled: (enabled: boolean) => void;
  setDiscount: (value: number, type: "fixed" | "percent") => void;
  setCustomerName: (name: string) => void;
  setCustomerId: (id: string | null, name: string) => void;
  setStoreCredit: (amount: number) => void;
  completeOrder: (paymentMethod: string, staffId: string | null) => Promise<string>;
}

import { dbService } from "../services/database";

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

    fetchProducts: async (search = "", category = "All") => {
      try {
        const sql =
          category === "All"
            ? `
          SELECT p.*, b.name as brand 
          FROM products p 
          LEFT JOIN brands b ON p.brand_id = b.id
          WHERE p.name LIKE ? OR p.sku LIKE ?
        `
            : `
          SELECT p.*, b.name as brand 
          FROM products p 
          LEFT JOIN brands b ON p.brand_id = b.id
          WHERE (p.name LIKE ? OR p.sku LIKE ?) AND b.name = ?
        `;

        const params = category === "All" ? [`%${search}%`, `%${search}%`] : [`%${search}%`, `%${search}%`, category];

        const res = await dbService.query(sql, params);

        set({
          products: res.map((p) => ({
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
          })),
        });
      } catch (error) {
        console.error("Failed to fetch products:", error);
      }
    },

    setCustomerName: (name: string) => set({ customerName: name }),

    setCustomerId: (id: string | null, name: string) => set({ customerId: id, customerName: name }),

    setStoreCredit: (amount: number) => {
      const { cart, isTaxEnabled, discountValue, discountType } = get();
      set({ storeCredit: amount, ...calculateTotals(cart, isTaxEnabled, discountValue, discountType, amount) });
    },

    completeOrder: async (paymentMethod: string, staffId: string | null) => {
      const { cart, subtotal, discount, tax, total, customerName, customerId, storeCredit } = get();
      const orderId = crypto.randomUUID();

      // 1. Create the Order (with customer_id if linked)
      await dbService.execute(
        `INSERT INTO orders (id, customer_id, customer_name, subtotal, discount, tax, total, payment_method, store_credit_used, status, staff_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [orderId, customerId || null, customerName, subtotal, discount, tax, total, paymentMethod, storeCredit, "completed", staffId],
      );

      // 2. Insert Order Items & Update Stock
      for (const item of cart) {
        const itemId = crypto.randomUUID();
        await dbService.execute(
          `INSERT INTO order_items (id, order_id, product_id, name, price, quantity, total, price_type) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [itemId, orderId, item.productId, item.name, item.price, item.quantity, item.total, item.priceType],
        );

        // Fetch current stock
        const product = await dbService.getOne<{ stock: number }>("SELECT stock FROM products WHERE id = ?", [item.productId]);
        if (product) {
          const newStock = product.stock - item.quantity;

          // Update Stock
          await dbService.execute("UPDATE products SET stock = ? WHERE id = ?", [newStock, item.productId]);

          // Log Inventory
          await dbService.execute(
            `INSERT INTO inventory_logs (id, product_id, action_type, quantity, previous_stock, current_stock, reason) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [crypto.randomUUID(), item.productId, "sale", -item.quantity, product.stock, newStock, `Sale #${orderId.slice(0, 8)}`],
          );
        }
      }

      // 3. Centralized Sync Queue Entry
      await dbService.enqueueSync("CREATE_ORDER", orderId, {
        orderId,
        customerName,
        items: cart,
        subtotal,
        discount,
        tax,
        total,
        paymentMethod,
        createdAt: new Date().toISOString(),
      });

      return orderId;
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
            unit: product.unit || "item",
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
        storeCredit: 0,
      }),
  };
});
