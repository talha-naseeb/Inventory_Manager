export type OrderStatus = "completed" | "pending" | "refunded" | "cancelled";
export type PaymentMethod = "cash" | "card" | "bank" | "split";

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
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
}

export interface Order {
  id: string;
  customerName?: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  user: string;
  action: string;
  target: string;
  timestamp: string;
  type: "order" | "stock" | "auth" | "system";
}
