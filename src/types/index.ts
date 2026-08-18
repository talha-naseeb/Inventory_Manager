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
  metersPerUnit?: number;
  hsn_code?: string;
  tax_rate?: number;
  lowStockAlert?: number;
}

export interface Brand {
  id: string;
  name: string;
  description?: string;
  logo?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  created_at?: string;
  orderCount?: number;
  totalSpent?: number;
}

export interface OrderItem {
  id: string;
  productId?: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
  unit?: string;
  priceType: "retail" | "wholesale";
}

export type ExchangeBalanceOutcome = "none" | "extra_paid" | "cash_refund" | "store_credit";

export interface ExchangeDraft {
  originalOrderId: string;
  customerId?: string | null;
  customerName?: string | null;
  returnedItems: OrderItem[];
  returnCredit: number;
}

export interface ExchangeTotals {
  returnCredit: number;
  newItemsTotal: number;
  amountDue: number;
  remainingBalance: number;
}

export interface CustomerCreditLog {
  id: string;
  customerId: string;
  sourceType: "exchange_remaining_balance" | "pos_redemption";
  sourceId?: string;
  orderId?: string;
  amount: number;
  balanceAfter: number;
  note?: string;
  createdAt?: string;
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
  originalOrderId?: string | null;
  replacementOrderId?: string | null;
  balanceOutcome?: ExchangeBalanceOutcome;
  amountDue?: number;
  remainingBalance?: number;
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
