import type { Product, Order, ActivityLog } from "../types";

export const MOCK_PRODUCTS: Product[] = [
  { id: "1", name: "Premium Coffee Beans", sku: "COF-001", price: 25.0, costPrice: 15.0, stock: 45, category: "Beverages" },
  { id: "2", name: "Organic Green Tea", sku: "TEA-002", price: 18.0, costPrice: 10.0, stock: 8, category: "Beverages" },
  { id: "3", name: "Artisan Bread", sku: "BAK-003", price: 5.5, costPrice: 2.0, stock: 20, category: "Bakery" },
  { id: "4", name: "Almond Milk", sku: "DAI-004", price: 4.5, costPrice: 2.5, stock: 15, category: "Dairy" },
];

export const MOCK_ORDERS: Order[] = [
  {
    id: "ORD-1001",
    customerName: "John Doe",
    total: 35.5,
    status: "completed",
    paymentMethod: "card",
    createdAt: new Date().toISOString(),
    items: [],
  },
  {
    id: "ORD-1002",
    customerName: "Jane Smith",
    total: 12.0,
    status: "completed",
    paymentMethod: "cash",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    items: [],
  },
  {
    id: "ORD-1003",
    customerName: "Mike Johnson",
    total: 85.0,
    status: "pending",
    paymentMethod: "bank",
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    items: [],
  },
];

export const MOCK_ACTIVITY: ActivityLog[] = [
  { id: "act-1", user: "Admin", action: "completed sale", target: "ORD-1001", timestamp: "2 mins ago", type: "order" },
  { id: "act-2", user: "System", action: "low stock alert", target: "Organic Green Tea", timestamp: "15 mins ago", type: "stock" },
  { id: "act-3", user: "Admin", action: "logged in", target: "System", timestamp: "1 hour ago", type: "auth" },
];
