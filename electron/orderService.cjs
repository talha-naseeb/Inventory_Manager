const crypto = require("crypto");

function normalizeOrderItem(item, orderId, storeId) {
  return {
    id: item.id && !String(item.id).includes("-retail") && !String(item.id).includes("-wholesale")
      ? item.id
      : crypto.randomUUID(),
    store_id: storeId,
    order_id: orderId,
    product_id: item.product_id || item.productId || null,
    name: item.name,
    price: Number(item.price || 0),
    quantity: Number(item.quantity || 0),
    total: Number(item.total || 0),
    price_type: item.price_type || item.priceType || "retail",
    unit: item.unit || null,
  };
}

function buildCreateOrderOps(orderData) {
  const { store_id = "default", items = [], ...order } = orderData;
  const orderId = order.id || crypto.randomUUID();
  const normalizedItems = items.map((item) => normalizeOrderItem(item, orderId, store_id));

  return {
    orderId,
    normalizedItems,
    ops: [
      {
        sql: `INSERT INTO orders (id, store_id, customer_id, customer_name, subtotal, discount, tax, total, payment_method, store_credit_used, status, staff_id, original_order_id, returned_items_json)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [
          orderId, store_id, order.customer_id || null, order.customer_name || null,
          order.subtotal || 0, order.discount || 0, order.tax || 0, order.total || 0,
          order.payment_method || "cash", order.store_credit_used || 0,
          order.status || "completed", order.staff_id || null,
          order.original_order_id || null,
          order.returned_items_json || null,
        ],
      },
      ...normalizedItems.map((item) => ({
        sql: `INSERT INTO order_items (id, store_id, order_id, product_id, name, price, quantity, total, price_type, unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [item.id, item.store_id, item.order_id, item.product_id, item.name, item.price, item.quantity, item.total, item.price_type, item.unit],
      })),
      ...normalizedItems.filter((item) => item.product_id && item.price_type !== "return").map((item) => ({
        sql: `UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ? AND store_id = ?`,
        params: [item.quantity, item.product_id, store_id],
      })),
    ],
  };
}

async function createOrder(db, orderData) {
  const { orderId, ops } = buildCreateOrderOps(orderData);
  await db.transaction(ops);
  return { id: orderId, success: true };
}

module.exports = { buildCreateOrderOps, createOrder, normalizeOrderItem };
