export type OrderStatus = "completed" | "pending" | "refunded" | "cancelled" | "returned";
export type PaymentMethod = "cash" | "card" | "bank" | "split";

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  wholesalePrice: number; // Added wholesale price
  costPrice: number;
  stock: number;
  category: string;
  image?: string;
  description?: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
  priceType: "retail" | "wholesale"; // Track which price was used
}

export interface Order {
  id: string;
  customerName?: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  storeCredit?: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  createdAt: string;
  originalOrderId?: string; // For returns
  returnReason?: string; // For returns
}

export interface ActivityLog {
  id: string;
  user: string;
  action: string;
  target: string;
  timestamp: string;
  type: "order" | "stock" | "auth" | "system";
}
