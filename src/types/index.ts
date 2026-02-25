export type OrderStatus = "completed" | "pending" | "refunded" | "cancelled" | "returned";
export type PaymentMethod = "cash" | "card" | "bank" | "split";

export interface Product {
  id: string;
  name: string;
  description?: string;
  sku: string;
  brand?: string;
  brandId?: string;
  price: number;
  wholesalePrice: number;
  costPrice?: number;
  image?: string;
  stock: number;
  unit?: string;
  meters_per_unit?: number;
}

export interface Brand {
  id: string;
  name: string;
  description?: string;
  logo?: string;
}

export interface OrderItem {
  id: string;
  productId?: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
  priceType: "retail" | "wholesale";
}

export interface Order {
  id: string;
  customerId?: string;
  customerName?: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: string;
  storeCreditUsed?: number;
  returnedItems?: OrderItem[];
  status: string;
  createdAt: string;
}

export type StaffRole = "owner" | "admin" | "manager" | "cashier";

export interface Staff {
  id: string;
  name: string;
  pin: string;
  role: "owner" | "admin" | "manager" | "cashier";
  permissions?: string;
  status: "active" | "inactive";
}

export interface ActivityLog {
  id: string;
  staffId: string;
  user: string;
  action: string;
  target: string;
  timestamp: string;
  type: "order" | "stock" | "auth" | "system";
}
