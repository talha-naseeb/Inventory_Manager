const crypto = require("crypto");

function normalizeReturnItem(item) {
  const unit = typeof item.unit === "string" ? item.unit.trim() : "";

  return {
    id: item.id || `ret-${item.product_id || item.productId}-${crypto.randomUUID()}`,
    productId: item.product_id || item.productId,
    name: item.name,
    quantity: Number(item.quantity || 0),
    price: Number(item.price || 0),
    total: Number(item.total || 0),
    ...(unit ? { unit } : {}),
  };
}

async function recordReturn(db, { id = crypto.randomUUID(), orderId, storeId = "default", value, items, status = "completed" }) {
  const normalizedItems = items.map(normalizeReturnItem);
  if (normalizedItems.length === 0) throw new Error("Return must include at least one item");

  const purchasedRows = await db.all("SELECT product_id, name, price, quantity FROM order_items WHERE order_id = ? AND store_id = ?", [orderId, storeId]);
  if (purchasedRows.length === 0) throw new Error("Original order has no returnable items");

  const previousReturns = await db.all("SELECT items_json FROM returns WHERE order_id = ? AND store_id = ?", [orderId, storeId]);
  const purchasedByProduct = new Map();
  for (const row of purchasedRows) {
    if (!row.product_id) continue;
    const existing = purchasedByProduct.get(row.product_id) || { quantity: 0, price: row.price, name: row.name };
    existing.quantity += Number(row.quantity || 0);
    purchasedByProduct.set(row.product_id, existing);
  }

  const alreadyReturnedByProduct = new Map();
  for (const returnRow of previousReturns) {
    try {
      const returnedItems = JSON.parse(returnRow.items_json || "[]");
      for (const returnedItem of returnedItems) {
        const productId = returnedItem.productId || returnedItem.product_id;
        if (!productId) continue;
        alreadyReturnedByProduct.set(productId, (alreadyReturnedByProduct.get(productId) || 0) + Number(returnedItem.quantity || 0));
      }
    } catch {
      // Ignore malformed historical rows; new rows are validated below.
    }
  }

  for (const item of normalizedItems) {
    if (!item.productId) throw new Error("Return item is missing product id");
    if (item.quantity <= 0) throw new Error("Return quantity must be greater than zero");
    const purchased = purchasedByProduct.get(item.productId);
    if (!purchased) throw new Error(`Product ${item.productId} was not part of the original order`);
    const alreadyReturned = alreadyReturnedByProduct.get(item.productId) || 0;
    if (item.quantity > purchased.quantity - alreadyReturned) {
      throw new Error(`Return quantity exceeds purchased quantity for ${purchased.name}`);
    }
  }

  const calculatedValue = normalizedItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const inventoryLogs = normalizedItems.map((item) => ({
    id: crypto.randomUUID(),
    store_id: storeId,
    product_id: item.productId,
    action_type: "return",
    quantity: item.quantity,
    reason: `Return from Order #${String(orderId).slice(0, 8)}`,
  }));

  const ops = [
    {
      sql: "INSERT INTO returns (id, store_id, order_id, return_value, items_json, status) VALUES (?, ?, ?, ?, ?, ?)",
      params: [id, storeId, orderId, calculatedValue || value, JSON.stringify(normalizedItems), status],
    },
    ...normalizedItems.map((item) => ({
      sql: "UPDATE products SET stock = stock + ? WHERE id = ? AND store_id = ?",
      params: [item.quantity, item.productId, storeId],
    })),
    ...inventoryLogs.map((log) => ({
      sql: `INSERT INTO inventory_logs (id, store_id, product_id, action_type, quantity, reason)
            VALUES (?, ?, ?, ?, ?, ?)`,
      params: [log.id, log.store_id, log.product_id, log.action_type, log.quantity, log.reason],
    })),
    {
      sql: "UPDATE orders SET status = 'returned' WHERE id = ? AND store_id = ?",
      params: [orderId, storeId],
    },
  ];

  await db.transaction(ops);
  return { id, success: true, value: calculatedValue || value, inventoryLogs };
}

module.exports = { normalizeReturnItem, recordReturn };
