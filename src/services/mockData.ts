import type { Product, Order, ActivityLog } from "../types";

export const MOCK_PRODUCTS: Product[] = [
  {
    id: "1",
    name: "Premium Coffee Beans",
    sku: "COF-001",
    price: 25.0,
    wholesalePrice: 20.0,
    costPrice: 15.0,
    stock: 50,
    category: "Beverages",
    image: "https://images.unsplash.com/photo-1559056191-7239f155988d?w=400&h=400&fit=crop",
    description: "High-quality arabica beans for the perfect brew.",
  },
  {
    id: "2",
    name: "Organic Green Tea",
    sku: "TEA-002",
    price: 18.0,
    wholesalePrice: 14.0,
    costPrice: 10.0,
    stock: 100,
    category: "Beverages",
    image: "https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=400&h=400&fit=crop",
    description: "Fresh green tea leaves from organic farms.",
  },
  {
    id: "3",
    name: "Artisan Bread",
    sku: "BRD-003",
    price: 5.5,
    wholesalePrice: 4.5,
    costPrice: 3.5,
    stock: 30,
    category: "Bakery",
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop",
    description: "Traditional sourdough bread, baked daily.",
  },
  {
    id: "4",
    name: "Almond Milk",
    sku: "MLK-004",
    price: 4.5,
    wholesalePrice: 3.8,
    costPrice: 2.5,
    stock: 45,
    category: "Dairy",
    image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=400&fit=crop",
    description: "Unsweetened creamy almond milk.",
  },
];

export const MOCK_ORDERS: Order[] = [
  {
    id: "ORD-001",
    customerName: "John Doe",
    items: [{ productId: "1", name: "Premium Coffee Beans", quantity: 2, price: 25.0, total: 50.0, priceType: "retail" }],
    subtotal: 50.0,
    discount: 0,
    tax: 0,
    total: 50.0,
    status: "completed",
    paymentMethod: "cash",
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
  },
  {
    id: "ORD-002",
    customerName: "Jane Smith",
    items: [
      { productId: "2", name: "Organic Green Tea", quantity: 3, price: 18.0, total: 54.0, priceType: "retail" },
      { productId: "3", name: "Artisan Bread", quantity: 1, price: 5.5, total: 5.5, priceType: "retail" },
    ],
    subtotal: 59.5,
    discount: 5.0,
    tax: 0,
    total: 54.5,
    status: "completed",
    paymentMethod: "card",
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
  },
  {
    id: "ORD-003",
    customerName: "Anonymous",
    items: [{ productId: "4", name: "Almond Milk", quantity: 10, price: 3.8, total: 38.0, priceType: "wholesale" }],
    subtotal: 38.0,
    discount: 0,
    tax: 0,
    total: 38.0,
    status: "completed",
    paymentMethod: "bank",
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(), // 5 days ago
  },
];

export const MOCK_ACTIVITY: ActivityLog[] = [
  { id: "1", user: "Admin", action: "Login", target: "System", timestamp: new Date().toISOString(), type: "auth" },
  { id: "2", user: "Admin", action: "Update Stock", target: "Premium Coffee Beans", timestamp: new Date(Date.now() - 3600000).toISOString(), type: "stock" },
];
