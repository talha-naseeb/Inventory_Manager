function getMaintenanceOperations(type, storeId = "default") {
  const operations = {
    inventory: [
      { sql: "DELETE FROM inventory_logs WHERE store_id=?", params: [storeId] },
      { sql: "DELETE FROM rolls WHERE store_id=?", params: [storeId] },
      { sql: "DELETE FROM products WHERE store_id=?", params: [storeId] },
      { sql: "DELETE FROM brands WHERE store_id=?", params: [storeId] },
    ],
    sales: [
      { sql: "DELETE FROM returns WHERE store_id=?", params: [storeId] },
      { sql: "DELETE FROM order_items WHERE store_id=?", params: [storeId] },
      { sql: "DELETE FROM orders WHERE store_id=?", params: [storeId] },
    ],
    customers: [
      { sql: "UPDATE orders SET customer_id = NULL WHERE store_id=?", params: [storeId] },
      { sql: "DELETE FROM customers WHERE store_id=?", params: [storeId] },
    ],
    full: [
      { sql: "DELETE FROM sync_queue WHERE store_id=?", params: [storeId] },
      { sql: "DELETE FROM login_logs", params: [] },
      { sql: "DELETE FROM settings", params: [] },
      { sql: "DELETE FROM returns WHERE store_id=?", params: [storeId] },
      { sql: "DELETE FROM order_items WHERE store_id=?", params: [storeId] },
      { sql: "DELETE FROM orders WHERE store_id=?", params: [storeId] },
      { sql: "DELETE FROM customers WHERE store_id=?", params: [storeId] },
      { sql: "DELETE FROM inventory_logs WHERE store_id=?", params: [storeId] },
      { sql: "DELETE FROM rolls WHERE store_id=?", params: [storeId] },
      { sql: "DELETE FROM products WHERE store_id=?", params: [storeId] },
      { sql: "DELETE FROM brands WHERE store_id=?", params: [storeId] },
    ],
  };

  return operations[type] || null;
}

async function clearData(db, type, storeId = "default") {
  const operations = getMaintenanceOperations(type, storeId);
  if (!operations) throw new Error("Unknown maintenance action");
  await db.transaction(operations);
  return { success: true };
}

module.exports = { clearData, getMaintenanceOperations };
